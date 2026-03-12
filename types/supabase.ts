export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            branch_products: {
                Row: {
                    branch_id: string
                    created_at: string
                    id: string
                    min_stock_level: number
                    product_id: string
                    stock: number
                    updated_at: string
                }
                Insert: {
                    branch_id: string
                    created_at?: string
                    id?: string
                    min_stock_level?: number
                    product_id: string
                    stock?: number
                    updated_at?: string
                }
                Update: {
                    branch_id?: string
                    created_at?: string
                    id?: string
                    min_stock_level?: number
                    product_id?: string
                    stock?: number
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "branch_products_branch_id_fkey"
                        columns: ["branch_id"]
                        isOneToOne: false
                        referencedRelation: "branches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "branch_products_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            branches: {
                Row: {
                    address: string | null
                    company_id: string
                    created_at: string
                    id: string
                    is_main: boolean | null
                    name: string
                    phone: string | null
                    updated_at: string
                }
                Insert: {
                    address?: string | null
                    company_id: string
                    created_at?: string
                    id?: string
                    is_main?: boolean | null
                    name: string
                    phone?: string | null
                    updated_at?: string
                }
                Update: {
                    address?: string | null
                    company_id?: string
                    created_at?: string
                    id?: string
                    is_main?: boolean | null
                    name?: string
                    phone?: string | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "branches_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    }
                ]
            }
            companies: {
                Row: {
                    address: string | null
                    city: string | null
                    created_at: string
                    currency: string
                    email: string | null
                    id: string
                    logo_url: string | null
                    name: string
                    phone: string | null
                    status: string
                    sub_city: string | null
                    subscription_plan_id: string | null
                    subscription_status: string
                    tin: string | null
                    updated_at: string
                    vat_no: string | null
                    vat_reg_date: string | null
                    website: string | null
                    woreda: string | null
                }
                Insert: {
                    address?: string | null
                    city?: string | null
                    created_at?: string
                    currency?: string
                    email?: string | null
                    id?: string
                    logo_url?: string | null
                    name: string
                    phone?: string | null
                    status?: string
                    sub_city?: string | null
                    subscription_plan_id?: string | null
                    subscription_status?: string
                    tin?: string | null
                    updated_at?: string
                    vat_no?: string | null
                    vat_reg_date?: string | null
                    website?: string | null
                    woreda?: string | null
                }
                Update: {
                    address?: string | null
                    city?: string | null
                    created_at?: string
                    currency?: string
                    email?: string | null
                    id?: string
                    logo_url?: string | null
                    name?: string
                    phone?: string | null
                    status?: string
                    sub_city?: string | null
                    subscription_plan_id?: string | null
                    subscription_status?: string
                    tin?: string | null
                    updated_at?: string
                    vat_no?: string | null
                    vat_reg_date?: string | null
                    website?: string | null
                    woreda?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "companies_subscription_plan_id_fkey"
                        columns: ["subscription_plan_id"]
                        isOneToOne: false
                        referencedRelation: "subscription_plans"
                        referencedColumns: ["id"]
                    }
                ]
            }
            customers: {
                Row: {
                    address: string | null
                    city: string | null
                    company_id: string
                    created_at: string
                    customer_type: string | null
                    email: string | null
                    id: string
                    last_purchase_date: string | null
                    name: string
                    notes: string | null
                    phone: string | null
                    status: string | null
                    tax_id: string | null
                    total_spent: number | null
                    updated_at: string
                }
                Insert: {
                    address?: string | null
                    city?: string | null
                    company_id: string
                    created_at?: string
                    customer_type?: string | null
                    email?: string | null
                    id?: string
                    last_purchase_date?: string | null
                    name: string
                    notes?: string | null
                    phone?: string | null
                    status?: string | null
                    tax_id?: string | null
                    total_spent?: number | null
                    updated_at?: string
                }
                Update: {
                    address?: string | null
                    city?: string | null
                    company_id?: string
                    created_at?: string
                    customer_type?: string | null
                    email?: string | null
                    id?: string
                    last_purchase_date?: string | null
                    name?: string
                    notes?: string | null
                    phone?: string | null
                    status?: string | null
                    tax_id?: string | null
                    total_spent?: number | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "customers_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    }
                ]
            }
            products: {
                Row: {
                    category: string | null
                    company_id: string
                    cost_price: number | null
                    created_at: string
                    description: string | null
                    id: string
                    image_url: string | null
                    min_stock_level: number | null
                    name: string
                    price: number
                    primary_sku: string | null
                    stock: number
                    unit: string | null
                    updated_at: string
                    variants: Json | null
                }
                Insert: {
                    category?: string | null
                    company_id: string
                    cost_price?: number | null
                    created_at?: string
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    min_stock_level?: number | null
                    name: string
                    price?: number
                    primary_sku?: string | null
                    stock?: number
                    unit?: string | null
                    updated_at?: string
                    variants?: Json | null
                }
                Update: {
                    category?: string | null
                    company_id?: string
                    cost_price?: number | null
                    created_at?: string
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    min_stock_level?: number | null
                    name?: string
                    price?: number
                    primary_sku?: string | null
                    stock?: number
                    unit?: string | null
                    updated_at?: string
                    variants?: Json | null
                }
                Relationships: [
                    {
                        foreignKeyName: "products_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    branch_id: string | null
                    company_id: string | null
                    created_at: string
                    email: string | null
                    full_name: string | null
                    id: string
                    role: string | null
                    updated_at: string
                }
                Insert: {
                    avatar_url?: string | null
                    branch_id?: string | null
                    company_id?: string | null
                    created_at?: string
                    email?: string | null
                    full_name?: string | null
                    id: string
                    role?: string | null
                    updated_at?: string
                }
                Update: {
                    avatar_url?: string | null
                    branch_id?: string | null
                    company_id?: string | null
                    created_at?: string
                    email?: string | null
                    full_name?: string | null
                    id?: string
                    role?: string | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            purchase_items: {
                Row: {
                    created_at: string | null
                    id: string
                    product_id: string | null
                    purchase_id: string
                    quantity: number
                    total_cost: number
                    unit_cost: number
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    product_id?: string | null
                    purchase_id: string
                    quantity?: number
                    total_cost?: number
                    unit_cost?: number
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    product_id?: string | null
                    purchase_id?: string
                    quantity?: number
                    total_cost?: number
                    unit_cost?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "purchase_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "purchase_items_purchase_id_fkey"
                        columns: ["purchase_id"]
                        isOneToOne: false
                        referencedRelation: "purchases"
                        referencedColumns: ["id"]
                    }
                ]
            }
            purchases: {
                Row: {
                    amount_paid: number
                    branch_id: string | null
                    company_id: string
                    created_at: string | null
                    created_by: string | null
                    id: string
                    invoice_number: string | null
                    notes: string | null
                    payment_method: string | null
                    payment_status: string | null
                    purchase_date: string | null
                    supplier_id: string | null
                    total_amount: number
                }
                Insert: {
                    amount_paid?: number
                    branch_id?: string | null
                    company_id: string
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    invoice_number?: string | null
                    notes?: string | null
                    payment_method?: string | null
                    payment_status?: string | null
                    purchase_date?: string | null
                    supplier_id?: string | null
                    total_amount?: number
                }
                Update: {
                    amount_paid?: number
                    branch_id?: string | null
                    company_id?: string
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    invoice_number?: string | null
                    notes?: string | null
                    payment_method?: string | null
                    payment_status?: string | null
                    purchase_date?: string | null
                    supplier_id?: string | null
                    total_amount?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "purchases_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "purchases_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "purchases_supplier_id_fkey"
                        columns: ["supplier_id"]
                        isOneToOne: false
                        referencedRelation: "suppliers"
                        referencedColumns: ["id"]
                    }
                ]
            }
            sale_items: {
                Row: {
                    created_at: string
                    id: string
                    price: number
                    product_id: string
                    quantity: number
                    sale_id: string
                    total: number
                }
                Insert: {
                    created_at?: string
                    id?: string
                    price: number
                    product_id: string
                    quantity: number
                    sale_id: string
                    total: number
                }
                Update: {
                    created_at?: string
                    id?: string
                    price?: number
                    product_id?: string
                    quantity?: number
                    sale_id?: string
                    total?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "sale_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sale_items_sale_id_fkey"
                        columns: ["sale_id"]
                        isOneToOne: false
                        referencedRelation: "sales"
                        referencedColumns: ["id"]
                    }
                ]
            }
            sales: {
                Row: {
                    branch_id: string | null
                    company_id: string
                    created_at: string
                    created_by: string
                    customer_id: string | null
                    discount: number | null
                    id: string
                    notes: string | null
                    payment_method: string
                    status: string
                    subtotal: number
                    tax: number | null
                    total: number
                    updated_at: string
                }
                Insert: {
                    branch_id?: string | null
                    company_id: string
                    created_at?: string
                    created_by: string
                    customer_id?: string | null
                    discount?: number | null
                    id?: string
                    notes?: string | null
                    payment_method: string
                    status?: string
                    subtotal: number
                    tax?: number | null
                    total: number
                    updated_at?: string
                }
                Update: {
                    branch_id?: string | null
                    company_id?: string
                    created_at?: string
                    created_by?: string
                    customer_id?: string | null
                    discount?: number | null
                    id?: string
                    notes?: string | null
                    payment_method?: string
                    status?: string
                    subtotal?: number
                    tax?: number | null
                    total?: number
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sales_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sales_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "customers"
                        referencedColumns: ["id"]
                    }
                ]
            }
            subscription_plans: {
                Row: {
                    created_at: string | null
                    features: Json | null
                    id: string
                    is_active: boolean | null
                    limits: Json | null
                    name: string
                    price_monthly: number
                    price_yearly: number
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    features?: Json | null
                    id?: string
                    is_active?: boolean | null
                    limits?: Json | null
                    name: string
                    price_monthly: number
                    price_yearly: number
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    features?: Json | null
                    id?: string
                    is_active?: boolean | null
                    limits?: Json | null
                    name?: string
                    price_monthly?: number
                    price_yearly?: number
                    updated_at?: string | null
                }
                Relationships: []
            }
            subscriptions: {
                Row: {
                    company_id: string
                    created_at: string | null
                    current_period_end: string
                    current_period_start: string
                    id: string
                    plan_id: string
                    status: string
                    updated_at: string | null
                }
                Insert: {
                    company_id: string
                    created_at?: string | null
                    current_period_end: string
                    current_period_start: string
                    id?: string
                    plan_id: string
                    status: string
                    updated_at?: string | null
                }
                Update: {
                    company_id?: string
                    created_at?: string | null
                    current_period_end?: string
                    current_period_start?: string
                    id?: string
                    plan_id?: string
                    status?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "subscriptions_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "subscriptions_plan_id_fkey"
                        columns: ["plan_id"]
                        isOneToOne: false
                        referencedRelation: "subscription_plans"
                        referencedColumns: ["id"]
                    }
                ]
            }
            supplier_payments: {
                Row: {
                    amount: number
                    company_id: string
                    created_at: string | null
                    created_by: string | null
                    id: string
                    method: string | null
                    notes: string | null
                    payment_date: string | null
                    purchase_id: string | null
                    supplier_id: string
                }
                Insert: {
                    amount: number
                    company_id: string
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    method?: string | null
                    notes?: string | null
                    payment_date?: string | null
                    purchase_id?: string | null
                    supplier_id: string
                }
                Update: {
                    amount?: number
                    company_id?: string
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    method?: string | null
                    notes?: string | null
                    payment_date?: string | null
                    purchase_id?: string | null
                    supplier_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "supplier_payments_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "supplier_payments_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "supplier_payments_purchase_id_fkey"
                        columns: ["purchase_id"]
                        isOneToOne: false
                        referencedRelation: "purchases"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "supplier_payments_supplier_id_fkey"
                        columns: ["supplier_id"]
                        isOneToOne: false
                        referencedRelation: "suppliers"
                        referencedColumns: ["id"]
                    }
                ]
            }
            suppliers: {
                Row: {
                    address: string | null
                    company_id: string
                    contact_person: string | null
                    created_at: string | null
                    current_balance: number | null
                    email: string | null
                    id: string
                    name: string
                    phone: string | null
                    registration_number: string | null
                    tax_id: string | null
                    updated_at: string | null
                }
                Insert: {
                    address?: string | null
                    company_id: string
                    contact_person?: string | null
                    created_at?: string | null
                    current_balance?: number | null
                    email?: string | null
                    id?: string
                    name: string
                    phone?: string | null
                    registration_number?: string | null
                    tax_id?: string | null
                    updated_at?: string | null
                }
                Update: {
                    address?: string | null
                    company_id?: string
                    contact_person?: string | null
                    created_at?: string | null
                    current_balance?: number | null
                    email?: string | null
                    id?: string
                    name?: string
                    phone?: string | null
                    registration_number?: string | null
                    tax_id?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "suppliers_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            create_purchase: {
                Args: {
                    p_company_id: string
                    p_supplier_id: string
                    p_purchase_date: string
                    p_invoice_number: string
                    p_total_amount: number
                    p_amount_paid: number
                    p_payment_method: string
                    p_notes: string
                    p_items: Json
                    p_created_by: string
                }
                Returns: string
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
