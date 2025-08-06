
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer } from '../schema';
import { desc } from 'drizzle-orm';

export async function getCustomers(): Promise<Customer[]> {
  try {
    const results = await db.select()
      .from(customersTable)
      .orderBy(desc(customersTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(customer => ({
      ...customer,
      debt_limit: customer.debt_limit ? parseFloat(customer.debt_limit) : null
    }));
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
}
