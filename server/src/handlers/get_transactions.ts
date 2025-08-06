
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetTransactionsInput, type Transaction } from '../schema';
import { eq, gte, lte, and, desc, type SQL } from 'drizzle-orm';

export async function getTransactions(input?: GetTransactionsInput): Promise<Transaction[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (input?.start_date) {
      conditions.push(gte(transactionsTable.created_at, new Date(input.start_date)));
    }

    if (input?.end_date) {
      conditions.push(lte(transactionsTable.created_at, new Date(input.end_date)));
    }

    if (input?.customer_id) {
      conditions.push(eq(transactionsTable.customer_id, input.customer_id));
    }

    if (input?.payment_status) {
      conditions.push(eq(transactionsTable.payment_status, input.payment_status));
    }

    // Apply pagination with defaults
    const limit = input?.limit ?? 50;
    const offset = input?.offset ?? 0;

    // Build and execute query
    const query = db.select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.created_at))
      .limit(limit)
      .offset(offset);

    // Apply where clause if conditions exist
    const results = conditions.length > 0
      ? await query.where(and(...conditions)).execute()
      : await query.execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      total_amount: parseFloat(transaction.total_amount),
      discount_amount: parseFloat(transaction.discount_amount),
      tax_amount: parseFloat(transaction.tax_amount),
      final_amount: parseFloat(transaction.final_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
}
