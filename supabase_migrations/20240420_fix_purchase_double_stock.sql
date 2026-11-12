-- ============================================================
-- Fix: Prevent Double Stock Recording on Purchases
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. Inspect existing triggers on purchase_items (Optional Check)
-- ------------------------------------------------------------
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'purchase_items' AND trigger_schema = 'public';

-- ------------------------------------------------------------
-- 2. Drop all conflicting triggers on purchase_items table.
--    In older setups, a trigger on purchase_items (e.g. update_stock_after_purchase)
--    incremented stock when a purchase item was inserted.
--    Because create_purchase() ALSO increments stock with branch and variant support,
--    both executed, causing the purchased quantity to be added twice (e.g. 50 -> +100).
-- ------------------------------------------------------------

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'purchase_items'
          AND trigger_schema = 'public'
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.purchase_items CASCADE;';
        RAISE NOTICE 'Dropped trigger % on public.purchase_items', r.trigger_name;
    END LOOP;
END $$;

-- Drop common standalone trigger names if explicitly defined
DROP TRIGGER IF EXISTS update_stock_after_purchase ON public.purchase_items CASCADE;
DROP TRIGGER IF EXISTS update_stock_on_purchase ON public.purchase_items CASCADE;
DROP TRIGGER IF EXISTS tr_purchase_items_stock ON public.purchase_items CASCADE;
DROP TRIGGER IF EXISTS on_purchase_item_created ON public.purchase_items CASCADE;
DROP TRIGGER IF EXISTS purchase_items_stock_trigger ON public.purchase_items CASCADE;
DROP TRIGGER IF EXISTS trg_purchase_items_update_stock ON public.purchase_items CASCADE;

-- Also check if any stock-incrementing triggers exist on purchases table itself
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'purchases'
          AND trigger_schema = 'public'
          AND trigger_name ILIKE '%stock%'
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.purchases CASCADE;';
        RAISE NOTICE 'Dropped trigger % on public.purchases', r.trigger_name;
    END LOOP;
END $$;

-- ------------------------------------------------------------
-- 3. Ensure create_purchase function correctly increments stock ONCE
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_purchase(
  p_company_id uuid,
  p_supplier_id uuid,
  p_purchase_date timestamp with time zone,
  p_invoice_number text,
  p_total_amount numeric,
  p_amount_paid numeric,
  p_payment_method text,
  p_notes text,
  p_items jsonb,
  p_created_by uuid,
  p_branch_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchase_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity numeric;
  v_unit_cost numeric;
BEGIN
  -- 1. Insert the main purchase record
  INSERT INTO public.purchases (
    company_id, supplier_id, branch_id, purchase_date, invoice_number,
    total_amount, amount_paid, payment_method, notes, created_by
  )
  VALUES (
    p_company_id, p_supplier_id, p_branch_id, 
    p_purchase_date, p_invoice_number,
    p_total_amount, p_amount_paid, p_payment_method, p_notes, p_created_by
  )
  RETURNING id INTO v_purchase_id;

  -- 2. Update Supplier Balance if an amount is owed
  IF p_supplier_id IS NOT NULL THEN
    UPDATE public.suppliers 
    SET current_balance = current_balance + (p_total_amount - p_amount_paid)
    WHERE id = p_supplier_id;
  END IF;

  -- 3. Loop through items: record to purchase_items and increment stock exactly ONCE
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    
    -- Check if it's a variant
    IF v_item ? 'variant_id' AND v_item->>'variant_id' IS NOT NULL AND v_item->>'variant_id' != '' THEN
        v_variant_id := (v_item->>'variant_id')::uuid;
    ELSE
        v_variant_id := NULL;
    END IF;
    
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;

    -- Insert line item into purchase_items
    INSERT INTO public.purchase_items (
      purchase_id, product_id, quantity, unit_cost
    )
    VALUES (
      v_purchase_id, COALESCE(v_variant_id, v_product_id), v_quantity, v_unit_cost
    );

    -- Increment stock exactly once for this item
    IF v_variant_id IS NOT NULL THEN
      -- Update variant stock explicitly
      UPDATE public.product_variants
      SET stock = COALESCE(stock, 0) + v_quantity
      WHERE id = v_variant_id;
    ELSE
      -- Update main product stock via branch_products
      IF p_branch_id IS NOT NULL THEN
        UPDATE public.branch_products 
        SET stock = COALESCE(stock, 0) + v_quantity
        WHERE branch_id = p_branch_id AND product_id = v_product_id;
        
        IF NOT FOUND THEN
          INSERT INTO public.branch_products (branch_id, product_id, stock)
          VALUES (p_branch_id, v_product_id, v_quantity);
        END IF;
      ELSE
         -- Fallback global
         UPDATE public.products 
         SET stock = COALESCE(stock, 0) + v_quantity 
         WHERE id = v_product_id;
      END IF;
    END IF;
  END LOOP;

  RETURN v_purchase_id;
END;
$$;

