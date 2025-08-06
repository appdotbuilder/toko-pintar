
import { db } from '../db';
import { transactionsTable, customersTable, transactionItemsTable, productsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTransactionById(id: number): Promise<Transaction | null> {
  try {
    // Query transaction with customer and transaction items joined
    const result = await db.select()
      .from(transactionsTable)
      .leftJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
      .leftJoin(transactionItemsTable, eq(transactionsTable.id, transactionItemsTable.transaction_id))
      .leftJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
      .where(eq(transactionsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Extract transaction data from the first row (all rows have same transaction data)
    const transactionData = result[0].transactions;

    // Convert numeric fields back to numbers
    const transaction: Transaction = {
      id: transactionData.id,
      customer_id: transactionData.customer_id,
      total_amount: parseFloat(transactionData.total_amount),
      discount_amount: parseFloat(transactionData.discount_amount),
      tax_amount: parseFloat(transactionData.tax_amount),
      final_amount: parseFloat(transactionData.final_amount),
      payment_method: transactionData.payment_method,
      payment_status: transactionData.payment_status,
      notes: transactionData.notes,
      created_at: transactionData.created_at
    };

    return transaction;
  } catch (error) {
    console.error('Failed to get transaction by id:', error);
    throw error;
  }
}
