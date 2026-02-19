
export interface Company {
    id: string;
    name: string;
    type?: string;
    contactEmail: string;
    joinedDate: string;
}

export type UserRole = 'Admin' | 'Sales' | 'Manager';

export interface User {
    id: string;
    companyId: string;
    name: string;
    email: string;
    role: UserRole;
    password?: string; // For mock login simulation
}

export interface Product {
    id: string;
    companyId: string;
    name: string;
    costPrice: number;
    salePrice: number;
    stock: number;
}

export interface Customer {
    id: string;
    companyId: string;
    name: string;
    phone: string;
    balance: number;
}

export interface SaleItem {
    productId: string;
    productName: string;
    quantity: number;
    salePrice: number;
    total: number;
}

export interface Sale {
    id: string;
    companyId: string;
    date: string;
    customerName: string;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    profit: number;
    items: SaleItem[];
}

// --- MOCK DATA ---

const DEFAULT_COMPANY_ID = 'comp_1';

export const MOCK_COMPANIES: Company[] = [
    { id: 'comp_1', name: 'Tech Store Inc.', type: 'Retail', contactEmail: 'contact@techstore.com', joinedDate: '2023-01-15' },
    { id: 'comp_2', name: 'Fashion Boutique', type: 'Clothing', contactEmail: 'info@fashion.com', joinedDate: '2023-05-20' },
];

export const MOCK_USERS: User[] = [
    { id: 'u1', companyId: 'comp_1', name: 'Admin User', email: 'admin@business.com', role: 'Admin', password: 'password' },
    { id: 'u2', companyId: 'comp_1', name: 'Sales Staff', email: 'sales@business.com', role: 'Sales', password: 'password' },
    { id: 'u3', companyId: 'comp_2', name: 'Boutique Owner', email: 'owner@boutique.com', role: 'Admin', password: 'password' },
];

export const MOCK_PRODUCTS: Product[] = [
    { id: '1', companyId: DEFAULT_COMPANY_ID, name: 'Wireless Mouse', costPrice: 15.0, salePrice: 25.0, stock: 45 },
    { id: '2', companyId: DEFAULT_COMPANY_ID, name: 'Mechanical Keyboard', costPrice: 60.0, salePrice: 120.0, stock: 12 },
    { id: '3', companyId: DEFAULT_COMPANY_ID, name: 'USB-C Cable', costPrice: 3.5, salePrice: 10.0, stock: 100 },
    { id: '4', companyId: DEFAULT_COMPANY_ID, name: 'Monitor 24"', costPrice: 110.0, salePrice: 180.0, stock: 5 },
    { id: '5', companyId: DEFAULT_COMPANY_ID, name: 'Laptop Stand', costPrice: 20.0, salePrice: 45.0, stock: 25 },
];

export const MOCK_CUSTOMERS: Customer[] = [
    { id: '1', companyId: DEFAULT_COMPANY_ID, name: 'Acme Corp', phone: '555-0123', balance: 0 },
    { id: '2', companyId: DEFAULT_COMPANY_ID, name: 'John Doe', phone: '555-0001', balance: 150.0 },
    { id: '3', companyId: DEFAULT_COMPANY_ID, name: 'Jane Smith', phone: '555-0812', balance: 0 },
];

export const MOCK_SALES: Sale[] = [
    {
        id: '101',
        companyId: DEFAULT_COMPANY_ID,
        date: '2023-10-25',
        customerName: 'John Doe',
        totalAmount: 120.0,
        paidAmount: 100.0,
        dueAmount: 20.0,
        profit: 60.0,
        items: [{ productId: '2', productName: 'Mechanical Keyboard', quantity: 1, salePrice: 120.0, total: 120.0 }],
    },
    {
        id: '102',
        companyId: DEFAULT_COMPANY_ID,
        date: '2023-10-26',
        customerName: 'Cash Customer',
        totalAmount: 25.0,
        paidAmount: 25.0,
        dueAmount: 0.0,
        profit: 10.0,
        items: [{ productId: '1', productName: 'Wireless Mouse', quantity: 1, salePrice: 25.0, total: 25.0 }],
    },
];
