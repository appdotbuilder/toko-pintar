
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'qris', 'debt', 'bank_transfer']);
export const paymentStatusEnum = pgEnum('payment_status', ['paid', 'pending', 'partial']);

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  barcode: text('barcode'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  cost: numeric('cost', { precision: 10, scale: 2 }),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  min_stock: integer('min_stock'),
  category: text('category'),
  image_url: text('image_url'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  debt_limit: numeric('debt_limit', { precision: 10, scale: 2 }),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  final_amount: numeric('final_amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  payment_status: paymentStatusEnum('payment_status').notNull().default('paid'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Transaction items table
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Payments table for debt tracking
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull(),
  customer_id: integer('customer_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const productsRelations = relations(productsTable, ({ many }) => ({
  transactionItems: many(transactionItemsTable)
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  transactions: many(transactionsTable),
  payments: many(paymentsTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [transactionsTable.customer_id],
    references: [customersTable.id]
  }),
  items: many(transactionItemsTable),
  payments: many(paymentsTable)
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id]
  }),
  product: one(productsTable, {
    fields: [transactionItemsTable.product_id],
    references: [productsTable.id]
  })
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [paymentsTable.transaction_id],
    references: [transactionsTable.id]
  }),
  customer: one(customersTable, {
    fields: [paymentsTable.customer_id],
    references: [customersTable.id]
  })
}));

// Export all tables
export const tables = {
  products: productsTable,
  customers: customersTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable,
  payments: paymentsTable
};
