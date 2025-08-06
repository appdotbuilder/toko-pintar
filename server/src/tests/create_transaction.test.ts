
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, customersTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testProduct1: any;
  let testProduct2: any;
  let testCustomer: any;

  beforeEach(async () => {
    // Create test products
    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'Test Product 1',
          price: '10.00',
          stock_quantity: 100,
          is_active: true
        },
        {
          name: 'Test Product 2',
          price: '20.00',
          stock_quantity: 50,
          is_active: true
        }
      ])
      .returning()
      .execute();

    testProduct1 = productResults[0];
    testProduct2 = productResults[1];

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890'
      })
      .returning()
      .execute();

    testCustomer = customerResult[0];
  });

  const createTestInput = (overrides: Partial<CreateTransactionInput> = {}): CreateTransactionInput => ({
    customer_id: testCustomer.id,
    items: [
      {
        product_id: testProduct1.id,
        quantity: 2,
        unit_price: 10.00
      },
      {
        product_id: testProduct2.id,
        quantity: 1,
        unit_price: 20.00
      }
    ],
    discount_amount: 5.00,
    tax_amount: 2.00,
    payment_method: 'cash',
    notes: 'Test transaction',
    ...overrides
  });

  it('should create a transaction with cash payment', async () => {
    const input = createTestInput();
    const result = await createTransaction(input);

    expect(result.id).toBeDefined();
    expect(result.customer_id).toEqual(testCustomer.id);
    expect(result.total_amount).toEqual(40.00); // (2 * 10) + (1 * 20)
    expect(result.discount_amount).toEqual(5.00);
    expect(result.tax_amount).toEqual(2.00);
    expect(result.final_amount).toEqual(37.00); // 40 - 5 + 2
    expect(result.payment_method).toEqual('cash');
    expect(result.payment_status).toEqual('paid');
    expect(result.notes).toEqual('Test transaction');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a transaction with debt payment', async () => {
    const input = createTestInput({
      payment_method: 'debt'
    });
    const result = await createTransaction(input);

    expect(result.payment_method).toEqual('debt');
    expect(result.payment_status).toEqual('pending');
  });

  it('should create transaction items correctly', async () => {
    const input = createTestInput();
    const result = await createTransaction(input);

    const items = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, result.id))
      .execute();

    expect(items).toHaveLength(2);
    
    const item1 = items.find(item => item.product_id === testProduct1.id);
    const item2 = items.find(item => item.product_id === testProduct2.id);

    expect(item1).toBeDefined();
    expect(item1!.quantity).toEqual(2);
    expect(parseFloat(item1!.unit_price)).toEqual(10.00);
    expect(parseFloat(item1!.subtotal)).toEqual(20.00);

    expect(item2).toBeDefined();
    expect(item2!.quantity).toEqual(1);
    expect(parseFloat(item2!.unit_price)).toEqual(20.00);
    expect(parseFloat(item2!.subtotal)).toEqual(20.00);
  });

  it('should update product stock quantities', async () => {
    const input = createTestInput();
    await createTransaction(input);

    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProduct1.id))
      .execute();

    const product1 = updatedProducts[0];
    expect(product1.stock_quantity).toEqual(98); // 100 - 2

    const product2Results = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProduct2.id))
      .execute();

    const product2 = product2Results[0];
    expect(product2.stock_quantity).toEqual(49); // 50 - 1
  });

  it('should save transaction to database', async () => {
    const input = createTestInput();
    const result = await createTransaction(input);

    const savedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(savedTransactions).toHaveLength(1);
    const saved = savedTransactions[0];
    expect(parseFloat(saved.total_amount)).toEqual(40.00);
    expect(parseFloat(saved.final_amount)).toEqual(37.00);
    expect(saved.payment_method).toEqual('cash');
  });

  it('should handle transaction without customer', async () => {
    const input = createTestInput({
      customer_id: null
    });
    const result = await createTransaction(input);

    expect(result.customer_id).toBeNull();
    expect(result.total_amount).toEqual(40.00);
    expect(result.payment_status).toEqual('paid');
  });

  it('should throw error for non-existent product', async () => {
    const input = createTestInput({
      items: [{
        product_id: 99999,
        quantity: 1,
        unit_price: 10.00
      }]
    });

    await expect(createTransaction(input))
      .rejects.toThrow(/Product with ID 99999 not found/i);
  });

  it('should throw error for insufficient stock', async () => {
    const input = createTestInput({
      items: [{
        product_id: testProduct1.id,
        quantity: 200, // More than available (100)
        unit_price: 10.00
      }]
    });

    await expect(createTransaction(input))
      .rejects.toThrow(/Insufficient stock/i);
  });

  it('should calculate totals correctly with no discount or tax', async () => {
    const input = createTestInput({
      discount_amount: 0,
      tax_amount: 0
    });
    const result = await createTransaction(input);

    expect(result.total_amount).toEqual(40.00);
    expect(result.discount_amount).toEqual(0);
    expect(result.tax_amount).toEqual(0);
    expect(result.final_amount).toEqual(40.00);
  });

  it('should handle multiple items of same product', async () => {
    const input: CreateTransactionInput = {
      customer_id: testCustomer.id,
      items: [
        {
          product_id: testProduct1.id,
          quantity: 3,
          unit_price: 10.00
        }
      ],
      discount_amount: 0,
      tax_amount: 0,
      payment_method: 'qris',
      notes: null
    };

    const result = await createTransaction(input);

    expect(result.total_amount).toEqual(30.00);
    expect(result.payment_method).toEqual('qris');
    expect(result.payment_status).toEqual('paid');

    // Check stock was updated correctly
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProduct1.id))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(97); // 100 - 3
  });
});
