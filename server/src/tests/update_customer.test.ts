
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput, type UpdateCustomerInput } from '../schema';
import { updateCustomer } from '../handlers/update_customer';
import { eq } from 'drizzle-orm';

// Helper to create a test customer
const createTestCustomer = async (): Promise<number> => {
  const testCustomerData = {
    name: 'Original Customer',
    phone: '123456789',
    email: 'original@test.com',
    address: 'Original Address',
    debt_limit: '1000.00'
  };

  const result = await db.insert(customersTable)
    .values(testCustomerData)
    .returning()
    .execute();

  return result[0].id;
};

describe('updateCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update customer with all fields', async () => {
    const customerId = await createTestCustomer();

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Updated Customer',
      phone: '987654321',
      email: 'updated@test.com',
      address: 'Updated Address',
      debt_limit: 2000.00
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Updated Customer');
    expect(result.phone).toEqual('987654321');
    expect(result.email).toEqual('updated@test.com');
    expect(result.address).toEqual('Updated Address');
    expect(result.debt_limit).toEqual(2000.00);
    expect(typeof result.debt_limit).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update customer with partial fields', async () => {
    const customerId = await createTestCustomer();

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Partially Updated Customer',
      email: 'partial@test.com'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Partially Updated Customer');
    expect(result.phone).toEqual('123456789'); // Should remain unchanged
    expect(result.email).toEqual('partial@test.com');
    expect(result.address).toEqual('Original Address'); // Should remain unchanged
    expect(result.debt_limit).toEqual(1000.00); // Should remain unchanged
  });

  it('should update customer with null values', async () => {
    const customerId = await createTestCustomer();

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Customer with Nulls',
      phone: null,
      email: null,
      address: null,
      debt_limit: null
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Customer with Nulls');
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();
    expect(result.debt_limit).toBeNull();
  });

  it('should save updated customer to database', async () => {
    const customerId = await createTestCustomer();

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Database Updated Customer',
      debt_limit: 1500.00
    };

    await updateCustomer(updateInput);

    // Verify changes were saved to database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(1);
    const customer = customers[0];
    expect(customer.name).toEqual('Database Updated Customer');
    expect(customer.phone).toEqual('123456789'); // Should remain unchanged
    expect(parseFloat(customer.debt_limit!)).toEqual(1500.00);
  });

  it('should throw error for non-existent customer', async () => {
    const updateInput: UpdateCustomerInput = {
      id: 99999,
      name: 'Non-existent Customer'
    };

    await expect(updateCustomer(updateInput)).rejects.toThrow(/Customer with ID 99999 not found/i);
  });

  it('should handle debt_limit numeric conversion correctly', async () => {
    const customerId = await createTestCustomer();

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      debt_limit: 2500.75
    };

    const result = await updateCustomer(updateInput);

    expect(result.debt_limit).toEqual(2500.75);
    expect(typeof result.debt_limit).toBe('number');

    // Verify in database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(parseFloat(customers[0].debt_limit!)).toEqual(2500.75);
  });
});
