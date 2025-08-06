
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, transactionsTable, paymentsTable } from '../db/schema';
import { getCustomerDebt } from '../handlers/get_customer_debt';

describe('getCustomerDebt', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return 0 for customer with no transactions', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: null,
        email: null,
        address: null,
        debt_limit: null
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;
    const debt = await getCustomerDebt(customerId);

    expect(debt).toBe(0);
  });

  it('should return 0 for customer with only paid transactions', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: null,
        email: null,
        address: null,
        debt_limit: null
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create paid transaction
    await db.insert(transactionsTable)
      .values({
        customer_id: customerId,
        total_amount: '100.00',
        discount_amount: '0.00',
        tax_amount: '0.00',
        final_amount: '100.00',
        payment_method: 'cash',
        payment_status: 'paid',
        notes: null
      })
      .execute();

    const debt = await getCustomerDebt(customerId);
    expect(debt).toBe(0);
  });

  it('should calculate debt for pending transactions', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: null,
        email: null,
        address: null,
        debt_limit: null
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create pending transaction
    await db.insert(transactionsTable)
      .values({
        customer_id: customerId,
        total_amount: '150.00',
        discount_amount: '10.00',
        tax_amount: '5.00',
        final_amount: '145.00',
        payment_method: 'debt',
        payment_status: 'pending',
        notes: null
      })
      .execute();

    const debt = await getCustomerDebt(customerId);
    expect(debt).toBe(145.00);
  });

  it('should calculate debt for partial transactions with payments', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: null,
        email: null,
        address: null,
        debt_limit: null
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create partial transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        customer_id: customerId,
        total_amount: '200.00',
        discount_amount: '0.00',
        tax_amount: '0.00',
        final_amount: '200.00',
        payment_method: 'debt',
        payment_status: 'partial',
        notes: null
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Create partial payment
    await db.insert(paymentsTable)
      .values({
        transaction_id: transactionId,
        customer_id: customerId,
        amount: '50.00',
        payment_method: 'cash',
        notes: null
      })
      .execute();

    const debt = await getCustomerDebt(customerId);
    expect(debt).toBe(150.00); // 200 - 50
  });

  it('should handle multiple transactions and payments', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: null,
        email: null,
        address: null,
        debt_limit: null
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create multiple transactions
    const transaction1 = await db.insert(transactionsTable)
      .values({
        customer_id: customerId,
        total_amount: '100.00',
        discount_amount: '0.00',
        tax_amount: '0.00',
        final_amount: '100.00',
        payment_method: 'debt',
        payment_status: 'pending',
        notes: null
      })
      .returning()
      .execute();

    const transaction2 = await db.insert(transactionsTable)
      .values({
        customer_id: customerId,
        total_amount: '200.00',
        discount_amount: '0.00',
        tax_amount: '0.00',
        final_amount: '200.00',
        payment_method: 'debt',
        payment_status: 'partial',
        notes: null
      })
      .returning()
      .execute();

    // Add paid transaction (should not affect debt)
    await db.insert(transactionsTable)
      .values({
        customer_id: customerId,
        total_amount: '50.00',
        discount_amount: '0.00',
        tax_amount: '0.00',
        final_amount: '50.00',
        payment_method: 'cash',
        payment_status: 'paid',
        notes: null
      })
      .execute();

    // Add payments
    await db.insert(paymentsTable)
      .values({
        transaction_id: transaction2[0].id,
        customer_id: customerId,
        amount: '75.00',
        payment_method: 'cash',
        notes: null
      })
      .execute();

    const debt = await getCustomerDebt(customerId);
    expect(debt).toBe(225.00); // (100 + 200) - 75
  });

  it('should return 0 when payments exceed unpaid amount', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: null,
        email: null,
        address: null,
        debt_limit: null
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create pending transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        customer_id: customerId,
        total_amount: '100.00',
        discount_amount: '0.00',
        tax_amount: '0.00',
        final_amount: '100.00',
        payment_method: 'debt',
        payment_status: 'pending',
        notes: null
      })
      .returning()
      .execute();

    // Create payment that exceeds transaction amount
    await db.insert(paymentsTable)
      .values({
        transaction_id: transactionResult[0].id,
        customer_id: customerId,
        amount: '150.00',
        payment_method: 'cash',
        notes: null
      })
      .execute();

    const debt = await getCustomerDebt(customerId);
    expect(debt).toBe(0); // Customer has credit, but debt should not be negative
  });
});
