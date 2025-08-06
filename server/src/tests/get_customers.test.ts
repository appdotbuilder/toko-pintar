
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { getCustomers } from '../handlers/get_customers';

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();
    expect(result).toEqual([]);
  });

  it('should return all customers', async () => {
    // Create test customers
    await db.insert(customersTable)
      .values([
        {
          name: 'John Doe',
          phone: '123456789',
          email: 'john@example.com',
          address: '123 Main St',
          debt_limit: '1000.00'
        },
        {
          name: 'Jane Smith',
          phone: null,
          email: 'jane@example.com',
          address: null,
          debt_limit: '500.50'
        }
      ])
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    
    // Verify first customer
    const john = result.find(c => c.name === 'John Doe');
    expect(john).toBeDefined();
    expect(john!.phone).toEqual('123456789');
    expect(john!.email).toEqual('john@example.com');
    expect(john!.address).toEqual('123 Main St');
    expect(john!.debt_limit).toEqual(1000.00);
    expect(typeof john!.debt_limit).toBe('number');
    expect(john!.id).toBeDefined();
    expect(john!.created_at).toBeInstanceOf(Date);

    // Verify second customer
    const jane = result.find(c => c.name === 'Jane Smith');
    expect(jane).toBeDefined();
    expect(jane!.phone).toBeNull();
    expect(jane!.email).toEqual('jane@example.com');
    expect(jane!.address).toBeNull();
    expect(jane!.debt_limit).toEqual(500.50);
    expect(typeof jane!.debt_limit).toBe('number');
  });

  it('should handle customers with null debt_limit', async () => {
    await db.insert(customersTable)
      .values({
        name: 'No Limit Customer',
        phone: '987654321',
        email: 'nolimit@example.com',
        address: '456 Oak Ave',
        debt_limit: null
      })
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('No Limit Customer');
    expect(result[0].debt_limit).toBeNull();
  });

  it('should return customers in descending order by created_at', async () => {
    // Create customers with slight delay to ensure different timestamps
    await db.insert(customersTable)
      .values({
        name: 'First Customer',
        phone: '111111111',
        email: 'first@example.com'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(customersTable)
      .values({
        name: 'Second Customer', 
        phone: '222222222',
        email: 'second@example.com'
      })
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    // Most recent customer should be first
    expect(result[0].name).toEqual('Second Customer');
    expect(result[1].name).toEqual('First Customer');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });
});
