
import { z } from 'zod';

// Product schema
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  barcode: z.string().nullable(),
  price: z.number(),
  cost: z.number().nullable(),
  stock_quantity: z.number().int(),
  min_stock: z.number().int().nullable(),
  category: z.string().nullable(),
  image_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Customer schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  debt_limit: z.number().nullable(),
  created_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  customer_id: z.number().nullable(),
  total_amount: z.number(),
  discount_amount: z.number(),
  tax_amount: z.number(),
  final_amount: z.number(),
  payment_method: z.enum(['cash', 'qris', 'debt', 'bank_transfer']),
  payment_status: z.enum(['paid', 'pending', 'partial']),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Transaction item schema
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  subtotal: z.number(),
  created_at: z.coerce.date()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

// Payment schema for debt tracking
export const paymentSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  customer_id: z.number(),
  amount: z.number(),
  payment_method: z.enum(['cash', 'qris', 'bank_transfer']),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

// Input schemas for creating/updating entities

// Product input schemas
export const createProductInputSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().nullable(),
  price: z.number().positive(),
  cost: z.number().positive().nullable(),
  stock_quantity: z.number().int().nonnegative(),
  min_stock: z.number().int().nonnegative().nullable(),
  category: z.string().nullable(),
  image_url: z.string().url().nullable()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  barcode: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  cost: z.number().positive().nullable().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  min_stock: z.number().int().nonnegative().nullable().optional(),
  category: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Customer input schemas
export const createCustomerInputSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  debt_limit: z.number().positive().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  debt_limit: z.number().positive().nullable().optional()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Transaction input schemas
export const createTransactionInputSchema = z.object({
  customer_id: z.number().nullable(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive()
  })).min(1),
  discount_amount: z.number().nonnegative(),
  tax_amount: z.number().nonnegative(),
  payment_method: z.enum(['cash', 'qris', 'debt', 'bank_transfer']),
  notes: z.string().nullable()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Payment input schema
export const createPaymentInputSchema = z.object({
  transaction_id: z.number(),
  customer_id: z.number(),
  amount: z.number().positive(),
  payment_method: z.enum(['cash', 'qris', 'bank_transfer']),
  notes: z.string().nullable()
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Query schemas
export const getTransactionsInputSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  customer_id: z.number().optional(),
  payment_status: z.enum(['paid', 'pending', 'partial']).optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

export const getProductsInputSchema = z.object({
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  low_stock: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetProductsInput = z.infer<typeof getProductsInputSchema>;

// Sales report schemas
export const salesReportInputSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  group_by: z.enum(['day', 'week', 'month']).default('day')
});

export type SalesReportInput = z.infer<typeof salesReportInputSchema>;

export const salesReportSchema = z.object({
  period: z.string(),
  total_sales: z.number(),
  total_transactions: z.number(),
  average_transaction: z.number(),
  total_items_sold: z.number()
});

export type SalesReport = z.infer<typeof salesReportSchema>;
