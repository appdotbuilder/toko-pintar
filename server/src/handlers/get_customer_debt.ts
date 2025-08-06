
import { db } from '../db';
import { transactionsTable, paymentsTable } from '../db/schema';
import { eq, sum, and } from 'drizzle-orm';
import { SQL, sql } from 'drizzle-orm';

export async function getCustomerDebt(customerId: number): Promise<number> {
  try {
    // Get total unpaid/partial amount from transactions
    const unpaidTransactions = await db
      .select({
        total: sum(transactionsTable.final_amount)
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.customer_id, customerId),
          sql`${transactionsTable.payment_status} IN ('pending', 'partial')`
        )
      )
      .execute();

    // Get total payments made
    const totalPayments = await db
      .select({
        total: sum(paymentsTable.amount)
      })
      .from(paymentsTable)
      .where(eq(paymentsTable.customer_id, customerId))
      .execute();

    const unpaidAmount = parseFloat(unpaidTransactions[0]?.total || '0');
    const paidAmount = parseFloat(totalPayments[0]?.total || '0');

    const debt = unpaidAmount - paidAmount;
    
    // Return 0 if debt is negative (customer has credit)
    return Math.max(debt, 0);
  } catch (error) {
    console.error('Failed to get customer debt:', error);
    throw error;
  }
}
