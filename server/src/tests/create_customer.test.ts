
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateCustomerInput = {
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john@example.com',
  address: '123 Main St',
  debt_limit: 1000.50
};

// Test input with minimal fields
const minimalInput: CreateCustomerInput = {
  name: 'Jane Smith',
  phone: null,
  email: null,
  address: null,
  debt_limit: null
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.phone).toEqual('+1234567890');
    expect(result.email).toEqual('john@example.com');
    expect(result.address).toEqual('123 Main St');
    expect(result.debt_limit).toEqual(1000.50);
    expect(typeof result.debt_limit).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a customer with minimal fields', async () => {
    const result = await createCustomer(minimalInput);

    expect(result.name).toEqual('Jane Smith');
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();
    expect(result.debt_limit).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInput);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('John Doe');
    expect(customers[0].phone).toEqual('+1234567890');
    expect(customers[0].email).toEqual('john@example.com');
    expect(customers[0].address).toEqual('123 Main St');
    expect(parseFloat(customers[0].debt_limit!)).toEqual(1000.50);
    expect(customers[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle null debt_limit correctly', async () => {
    const result = await createCustomer(minimalInput);

    // Verify in database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers[0].debt_limit).toBeNull();
  });

  it('should generate unique IDs for multiple customers', async () => {
    const customer1 = await createCustomer({
      ...testInput,
      name: 'Customer 1'
    });

    const customer2 = await createCustomer({
      ...testInput,
      name: 'Customer 2'
    });

    expect(customer1.id).toBeDefined();
    expect(customer2.id).toBeDefined();
    expect(customer1.id).not.toEqual(customer2.id);
  });
});
