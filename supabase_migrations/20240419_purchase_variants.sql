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

  -- 3. Loop through items and add to purchase_items, then increment stock
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

    -- Insert line item (assuming purchase_items table might not have variant_id yet, dropping it out of the insert if it fails)
    -- It's safe to just log the product_id if they don't explicitly track variants in the historical purchase_items table
    INSERT INTO public.purchase_items (
      purchase_id, product_id, quantity, unit_cost
    )
    VALUES (
      v_purchase_id, COALESCE(v_variant_id, v_product_id), v_quantity, v_unit_cost
    );

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
         UPDATE public.products SET stock = COALESCE(stock, 0) + v_quantity WHERE id = v_product_id;
      END IF;
    END IF;
  END LOOP;

  RETURN v_purchase_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.process_sale(
  cart jsonb,
  customer_id uuid,
  payment_method text,
  amount_paid numeric,
  total_amount numeric,
  p_branch_id uuid,
  p_subtotal numeric,
  p_tax numeric,
  p_discount numeric,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity numeric;
  v_company_id uuid;
BEGIN
  -- Get company_id from branch
  SELECT company_id INTO v_company_id FROM public.branches WHERE id = p_branch_id;

  INSERT INTO public.sales (
    company_id, branch_id, customer_id, type, amount_paid, total_amount, 
    subtotal, tax, discount, notes, status
  )
  VALUES (
    v_company_id, p_branch_id, customer_id, payment_method, amount_paid, total_amount,
    p_subtotal, p_tax, p_discount, p_notes, 'completed'
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(cart)
  LOOP
    -- For variant objects, the `id` property from frontend contains the variant ID
    -- and `base_product_id` contains the product's actual ID
    IF v_item ? 'isVariant' AND (v_item->>'isVariant')::boolean = true THEN
       v_variant_id := (v_item->>'id')::uuid;
       v_product_id := (v_item->>'base_product_id')::uuid;
    ELSE
       v_variant_id := NULL;
       v_product_id := (v_item->>'id')::uuid;
    END IF;

    v_quantity := (v_item->>'quantity')::numeric;

    -- Using base product ID for the relationship, could also use variant ID based on schema depth
    INSERT INTO public.sale_items (
      sale_id, product_id, quantity, price, cost_price, discount
    )
    VALUES (
      v_sale_id, COALESCE(v_product_id, v_product_id), v_quantity, (v_item->>'price')::numeric, 
      (v_item->>'cost_price')::numeric, (v_item->>'discount')::numeric
    );

    IF v_variant_id IS NOT NULL THEN
      -- Decrement variant stock
      UPDATE public.product_variants
      SET stock = COALESCE(stock, 0) - v_quantity
      WHERE id = v_variant_id;
    ELSE
      -- Decrement main stock
      IF p_branch_id IS NOT NULL THEN
        UPDATE public.branch_products 
        SET stock = COALESCE(stock, 0) - v_quantity
        WHERE branch_id = p_branch_id AND product_id = v_product_id;
      ELSE
         UPDATE public.products SET stock = COALESCE(stock, 0) - v_quantity WHERE id = v_product_id;
      END IF;
    END IF;
  END LOOP;

  -- Update Customer Balance
  IF customer_id IS NOT NULL AND payment_method = 'credit' THEN
    UPDATE public.customers 
    SET current_balance = current_balance + (total_amount - amount_paid)
    WHERE id = customer_id;
  END IF;

  RETURN v_sale_id;
END;
$$;
