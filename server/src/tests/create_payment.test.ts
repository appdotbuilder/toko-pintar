
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, transactionsTable, customersTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { createPayment } from '../handlers/create_payment';
import { eq } from 'drizzle-orm';

describe('createPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: number;
  let debtTransactionId: number;
  let cashTransactionId: number;

  beforeEach(async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'test@example.com',
        address: '123 Test St',
        debt_limit: '1000.00'
      })
      .returning()
      .execute();
    
    customerId = customerResult[0].id;

    // Create a debt transaction
    const debtTransactionResult = await db.insert(transactionsTable)
      .values({
        customer_id: customerId,
        total_amount: '100.00',
        discount_amount: '0.00',
        tax_amount: '0.00',
        final_amount: '100.00',
        payment_method: 'debt',
        payment_status: 'pending',
        notes: 'Test debt transaction'
      })
      .returning()
      .execute();
    
    debtTransactionId = debtTransactionResult[0].id;

    // Create a cash transaction for validation test
    const cashTransactionResult = await db.insert(transactionsTable)
      .values({
        customer_id: customerId,
        total_amount: '50.00',
        discount_amount: '0.00',
        tax_amount: '0.00',
        final_amount: '50.00',
        payment_method: 'cash',
        payment_status: 'paid',
        notes: 'Test cash transaction'
      })
      .returning()
      .execute();
    
    cashTransactionId = cashTransactionResult[0].id;
  });

  const testPaymentInput: CreatePaymentInput = {
    transaction_id: 0, // Will be set in each test
    customer_id: 0, // Will be set in each test
    amount: 50.00,
    payment_method: 'cash',
    notes: 'Partial payment'
  };

  it('should create a payment for debt transaction', async () => {
    const input = {
      ...testPaymentInput,
      transaction_id: debtTransactionId,
      customer_id: customerId
    };

    const result = await createPayment(input);

    expect(result.transaction_id).toBe(debtTransactionId);
    expect(result.customer_id).toBe(customerId);
    expect(result.amount).toBe(50.00);
    expect(result.payment_method).toBe('cash');
    expect(result.notes).toBe('Partial payment');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save payment to database', async () => {
    const input = {
      ...testPaymentInput,
      transaction_id: debtTransactionId,
      customer_id: customerId
    };

    const result = await createPayment(input);

    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, result.id))
      .execute();

    expect(payments).toHaveLength(1);
    expect(payments[0].transaction_id).toBe(debtTransactionId);
    expect(payments[0].customer_id).toBe(customerId);
    expect(parseFloat(payments[0].amount)).toBe(50.00);
    expect(payments[0].payment_method).toBe('cash');
    expect(payments[0].notes).toBe('Partial payment');
    expect(payments[0].created_at).toBeInstanceOf(Date);
  });

  it('should update transaction status to partial when partially paid', async () => {
    const input = {
      ...testPaymentInput,
      transaction_id: debtTransactionId,
      customer_id: customerId,
      amount: 30.00
    };

    await createPayment(input);

    const transaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, debtTransactionId))
      .execute();

    expect(transaction[0].payment_status).toBe('partial');
  });

  it('should update transaction status to paid when fully paid', async () => {
    const input = {
      ...testPaymentInput,
      transaction_id: debtTransactionId,
      customer_id: customerId,
      amount: 100.00 // Full amount
    };

    await createPayment(input);

    const transaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, debtTransactionId))
      .execute();

    expect(transaction[0].payment_status).toBe('paid');
  });

  it('should update transaction status to paid with multiple payments', async () => {
    // First partial payment
    const firstPayment = {
      ...testPaymentInput,
      transaction_id: debtTransactionId,
      customer_id: customerId,
      amount: 40.00
    };

    await createPayment(firstPayment);

    // Check status after first payment
    let transaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, debtTransactionId))
      .execute();

    expect(transaction[0].payment_status).toBe('partial');

    // Second payment to complete
    const secondPayment = {
      ...testPaymentInput,
      transaction_id: debtTransactionId,
      customer_id: customerId,
      amount: 60.00
    };

    await createPayment(secondPayment);

    // Check final status
    transaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, debtTransactionId))
      .execute();

    expect(transaction[0].payment_status).toBe('paid');
  });

  it('should throw error for non-existent transaction', async () => {
    const input = {
      ...testPaymentInput,
      transaction_id: 9999,
      customer_id: customerId
    };

    await expect(createPayment(input)).rejects.toThrow(/transaction not found/i);
  });

  it('should throw error for non-debt transaction', async () => {
    const input = {
      ...testPaymentInput,
      transaction_id: cashTransactionId,
      customer_id: customerId
    };

    await expect(createPayment(input)).rejects.toThrow(/payment can only be made for debt transactions/i);
  });

  it('should handle overpayment correctly', async () => {
    const input = {
      ...testPaymentInput,
      transaction_id: debtTransactionId,
      customer_id: customerId,
      amount: 150.00 // More than transaction amount
    };

    await createPayment(input);

    const transaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, debtTransactionId))
      .execute();

    expect(transaction[0].payment_status).toBe('paid');
  });

  it('should work with different payment methods', async () => {
    const qrisPayment = {
      ...testPaymentInput,
      transaction_id: debtTransactionId,
      customer_id: customerId,
      payment_method: 'qris' as const,
      amount: 25.00
    };

    const result = await createPayment(qrisPayment);
    expect(result.payment_method).toBe('qris');

    const bankTransferPayment = {
      ...testPaymentInput,
      transaction_id: debtTransactionId,
      customer_id: customerId,
      payment_method: 'bank_transfer' as const,
      amount: 25.00
    };

    const result2 = await createPayment(bankTransferPayment);
    expect(result2.payment_method).toBe('bank_transfer');

    // Check that transaction is still partial (50 out of 100 paid)
    const transaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, debtTransactionId))
      .execute();

    expect(transaction[0].payment_status).toBe('partial');
  });
});
