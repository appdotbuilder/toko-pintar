
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput, type Customer } from '../schema';

export const createCustomer = async (input: CreateCustomerInput): Promise<Customer> => {
  try {
    // Insert customer record
    const result = await db.insert(customersTable)
      .values({
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        debt_limit: input.debt_limit ? input.debt_limit.toString() : null // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const customer = result[0];
    return {
      ...customer,
      debt_limit: customer.debt_limit ? parseFloat(customer.debt_limit) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
};
