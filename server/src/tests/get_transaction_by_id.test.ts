
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { getTransactionById } from '../handlers/get_transaction_by_id';

describe('getTransactionById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when transaction does not exist', async () => {
    const result = await getTransactionById(999);
    expect(result).toBeNull();
  });

  it('should return transaction when it exists', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '123456789',
        email: 'test@example.com',
        address: 'Test Address',
        debt_limit: '1000.00'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        customer_id: customerId,
        total_amount: '100.00',
        discount_amount: '5.00',
        tax_amount: '9.50',
        final_amount: '104.50',
        payment_method: 'cash',
        payment_status: 'paid',
        notes: 'Test transaction'
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Get transaction by id
    const result = await getTransactionById(transactionId);

    // Verify transaction data
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(transactionId);
    expect(result!.customer_id).toEqual(customerId);
    expect(result!.total_amount).toEqual(100.00);
    expect(result!.discount_amount).toEqual(5.00);
    expect(result!.tax_amount).toEqual(9.50);
    expect(result!.final_amount).toEqual(104.50);
    expect(result!.payment_method).toEqual('cash');
    expect(result!.payment_status).toEqual('paid');
    expect(result!.notes).toEqual('Test transaction');
    expect(result!.created_at).toBeInstanceOf(Date);

    // Verify numeric fields are numbers
    expect(typeof result!.total_amount).toBe('number');
    expect(typeof result!.discount_amount).toBe('number');
    expect(typeof result!.tax_amount).toBe('number');
    expect(typeof result!.final_amount).toBe('number');
  });

  it('should return transaction without customer when customer_id is null', async () => {
    // Create test transaction without customer
    const transactionResult = await db.insert(transactionsTable)
      .values({
        customer_id: null,
        total_amount: '50.00',
        discount_amount: '0.00',
        tax_amount: '0.00',
        final_amount: '50.00',
        payment_method: 'qris',
        payment_status: 'paid',
        notes: null
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Get transaction by id
    const result = await getTransactionById(transactionId);

    // Verify transaction data
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(transactionId);
    expect(result!.customer_id).toBeNull();
    expect(result!.total_amount).toEqual(50.00);
    expect(result!.discount_amount).toEqual(0.00);
    expect(result!.tax_amount).toEqual(0.00);
    expect(result!.final_amount).toEqual(50.00);
    expect(result!.payment_method).toEqual('qris');
    expect(result!.payment_status).toEqual('paid');
    expect(result!.notes).toBeNull();
  });

  it('should handle transaction with transaction items', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        price: '25.00',
        stock_quantity: 100
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        customer_id: null,
        total_amount: '50.00',
        discount_amount: '0.00',
        tax_amount: '0.00',
        final_amount: '50.00',
        payment_method: 'cash',
        payment_status: 'paid',
        notes: null
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Create transaction item
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transactionId,
        product_id: productId,
        quantity: 2,
        unit_price: '25.00',
        subtotal: '50.00'
      })
      .execute();

    // Get transaction by id
    const result = await getTransactionById(transactionId);

    // Should still return the transaction even with items
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(transactionId);
    expect(result!.total_amount).toEqual(50.00);
  });
});
