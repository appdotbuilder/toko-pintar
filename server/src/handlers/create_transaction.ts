
import { db } from '../db';
import { productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // Start transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // 1. Validate products exist and check stock availability
      const productIds = input.items.map(item => item.product_id);
      const products = await tx.select()
        .from(productsTable)
        .where(eq(productsTable.id, productIds[0])) // Start with first product
        .execute();

      // Get all required products
      const allProducts = [];
      for (const productId of productIds) {
        const productResult = await tx.select()
          .from(productsTable)
          .where(eq(productsTable.id, productId))
          .execute();
        
        if (productResult.length === 0) {
          throw new Error(`Product with ID ${productId} not found`);
        }
        allProducts.push(productResult[0]);
      }

      // 2. Check stock availability
      for (const item of input.items) {
        const product = allProducts.find(p => p.id === item.product_id);
        if (!product) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }
        
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`);
        }
      }

      // 3. Calculate totals
      const totalAmount = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const finalAmount = totalAmount - input.discount_amount + input.tax_amount;

      // 4. Determine payment status based on payment method
      const paymentStatus = input.payment_method === 'debt' ? 'pending' : 'paid';

      // 5. Create transaction record
      const transactionResult = await tx.insert(transactionsTable)
        .values({
          customer_id: input.customer_id,
          total_amount: totalAmount.toString(),
          discount_amount: input.discount_amount.toString(),
          tax_amount: input.tax_amount.toString(),
          final_amount: finalAmount.toString(),
          payment_method: input.payment_method,
          payment_status: paymentStatus,
          notes: input.notes
        })
        .returning()
        .execute();

      const transaction = transactionResult[0];

      // 6. Create transaction items
      for (const item of input.items) {
        const subtotal = item.quantity * item.unit_price;
        
        await tx.insert(transactionItemsTable)
          .values({
            transaction_id: transaction.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price.toString(),
            subtotal: subtotal.toString()
          })
          .execute();
      }

      // 7. Update product stock quantities
      for (const item of input.items) {
        const product = allProducts.find(p => p.id === item.product_id);
        if (product) {
          const newStockQuantity = product.stock_quantity - item.quantity;
          
          await tx.update(productsTable)
            .set({
              stock_quantity: newStockQuantity,
              updated_at: new Date()
            })
            .where(eq(productsTable.id, item.product_id))
            .execute();
        }
      }

      // 8. Return transaction with converted numeric fields
      return {
        ...transaction,
        total_amount: parseFloat(transaction.total_amount),
        discount_amount: parseFloat(transaction.discount_amount),
        tax_amount: parseFloat(transaction.tax_amount),
        final_amount: parseFloat(transaction.final_amount)
      };
    });
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};
