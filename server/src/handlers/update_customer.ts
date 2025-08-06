
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type UpdateCustomerInput, type Customer } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
  try {
    // First, check if customer exists
    const existingCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.id))
      .execute();

    if (existingCustomer.length === 0) {
      throw new Error(`Customer with ID ${input.id} not found`);
    }

    // Build update object with only provided fields (including explicit null values)
    const updateData: any = {};
    if ('name' in input) updateData.name = input.name;
    if ('phone' in input) updateData.phone = input.phone;
    if ('email' in input) updateData.email = input.email;
    if ('address' in input) updateData.address = input.address;
    if ('debt_limit' in input) {
      updateData.debt_limit = input.debt_limit !== null ? input.debt_limit?.toString() : null;
    }

    // Update customer record
    const result = await db.update(customersTable)
      .set(updateData)
      .where(eq(customersTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const customer = result[0];
    return {
      ...customer,
      debt_limit: customer.debt_limit ? parseFloat(customer.debt_limit) : null
    };
  } catch (error) {
    console.error('Customer update failed:', error);
    throw error;
  }
}
