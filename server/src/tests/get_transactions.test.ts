
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, customersTable } from '../db/schema';
import { type GetTransactionsInput } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

// Helper to create test customer
const createTestCustomer = async (): Promise<number> => {
  const result = await db.insert(customersTable)
    .values({
      name: 'Test Customer',
      phone: null,
      email: null,
      address: null,
      debt_limit: null
    })
    .returning()
    .execute();

  return result[0].id;
};

// Helper to create test transaction
const createTestTransaction = async (customerId?: number) => {
  const transactionData = {
    customer_id: customerId ?? null,
    total_amount: '100.00',
    discount_amount: '10.00',
    tax_amount: '5.00',
    final_amount: '95.00',
    payment_method: 'cash' as const,
    payment_status: 'paid' as const,
    notes: 'Test transaction'
  };

  return await db.insert(transactionsTable)
    .values(transactionData)
    .returning()
    .execute();
};

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all transactions when no filters provided', async () => {
    // Create test transactions
    await createTestTransaction();
    await createTestTransaction();

    const result = await getTransactions();

    expect(result).toHaveLength(2);
    expect(result[0].total_amount).toEqual(100);
    expect(result[0].discount_amount).toEqual(10);
    expect(result[0].tax_amount).toEqual(5);
    expect(result[0].final_amount).toEqual(95);
    expect(result[0].payment_method).toEqual('cash');
    expect(result[0].payment_status).toEqual('paid');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter transactions by customer_id', async () => {
    const customerId = await createTestCustomer();
    await createTestTransaction(customerId);
    await createTestTransaction(); // Transaction without customer

    const input: GetTransactionsInput = {
      customer_id: customerId,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toEqual(customerId);
  });

  it('should filter transactions by payment_status', async () => {
    // Create paid transaction
    await createTestTransaction();

    // Create pending transaction
    await db.insert(transactionsTable)
      .values({
        customer_id: null,
        total_amount: '200.00',
        discount_amount: '0.00',
        tax_amount: '10.00',
        final_amount: '210.00',
        payment_method: 'debt',
        payment_status: 'pending',
        notes: null
      })
      .execute();

    const input: GetTransactionsInput = {
      payment_status: 'pending',
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].payment_status).toEqual('pending');
    expect(result[0].payment_method).toEqual('debt');
  });

  it('should filter transactions by date range', async () => {
    await createTestTransaction();

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const input: GetTransactionsInput = {
      start_date: yesterday.toISOString(),
      end_date: tomorrow.toISOString(),
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].created_at >= yesterday).toBe(true);
    expect(result[0].created_at <= tomorrow).toBe(true);
  });

  it('should apply pagination correctly', async () => {
    // Create multiple transactions
    await createTestTransaction();
    await createTestTransaction();
    await createTestTransaction();

    const input: GetTransactionsInput = {
      limit: 2,
      offset: 1
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2);
  });

  it('should order transactions by created_at descending', async () => {
    // Create transactions with slight delay
    await createTestTransaction();
    await new Promise(resolve => setTimeout(resolve, 10));
    await createTestTransaction();

    const result = await getTransactions();

    expect(result).toHaveLength(2);
    // First result should be newer (created later)
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle multiple filters combined', async () => {
    const customerId = await createTestCustomer();
    await createTestTransaction(customerId);

    // Create another transaction with different customer
    const customerId2 = await createTestCustomer();
    await createTestTransaction(customerId2);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const input: GetTransactionsInput = {
      customer_id: customerId,
      payment_status: 'paid',
      start_date: yesterday.toISOString(),
      end_date: tomorrow.toISOString(),
      limit: 10,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toEqual(customerId);
    expect(result[0].payment_status).toEqual('paid');
  });

  it('should return empty array when no transactions match filters', async () => {
    await createTestTransaction();

    const input: GetTransactionsInput = {
      payment_status: 'partial',
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(0);
  });

  it('should handle numeric conversions correctly', async () => {
    await createTestTransaction();

    const result = await getTransactions();

    expect(result).toHaveLength(1);
    expect(typeof result[0].total_amount).toBe('number');
    expect(typeof result[0].discount_amount).toBe('number');
    expect(typeof result[0].tax_amount).toBe('number');
    expect(typeof result[0].final_amount).toBe('number');
  });
});
