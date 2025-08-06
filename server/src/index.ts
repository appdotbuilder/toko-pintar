
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createProductInputSchema,
  updateProductInputSchema,
  getProductsInputSchema,
  createCustomerInputSchema,
  updateCustomerInputSchema,
  createTransactionInputSchema,
  getTransactionsInputSchema,
  createPaymentInputSchema,
  salesReportInputSchema
} from './schema';

// Import handlers
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { updateProduct } from './handlers/update_product';
import { getProductById } from './handlers/get_product_by_id';
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { updateCustomer } from './handlers/update_customer';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { getTransactionById } from './handlers/get_transaction_by_id';
import { createPayment } from './handlers/create_payment';
import { getCustomerDebt } from './handlers/get_customer_debt';
import { getSalesReport } from './handlers/get_sales_report';
import { getLowStockProducts } from './handlers/get_low_stock_products';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Product management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  
  getProducts: publicProcedure
    .input(getProductsInputSchema.optional())
    .query(({ input }) => getProducts(input)),
  
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
  
  getProductById: publicProcedure
    .input(z.number())
    .query(({ input }) => getProductById(input)),

  getLowStockProducts: publicProcedure
    .query(() => getLowStockProducts()),

  // Customer management
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),
  
  getCustomers: publicProcedure
    .query(() => getCustomers()),
  
  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),

  getCustomerDebt: publicProcedure
    .input(z.number())
    .query(({ input }) => getCustomerDebt(input)),

  // Transaction management
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),
  
  getTransactions: publicProcedure
    .input(getTransactionsInputSchema.optional())
    .query(({ input }) => getTransactions(input)),
  
  getTransactionById: publicProcedure
    .input(z.number())
    .query(({ input }) => getTransactionById(input)),

  // Payment management
  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createPayment(input)),

  // Reports
  getSalesReport: publicProcedure
    .input(salesReportInputSchema)
    .query(({ input }) => getSalesReport(input))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Toko Pintar TRPC server listening at port: ${port}`);
}

start();
