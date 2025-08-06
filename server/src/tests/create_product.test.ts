
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Simple test input with all required fields
const testInput: CreateProductInput = {
  name: 'Test Product',
  barcode: '123456789',
  price: 19.99,
  cost: 15.50,
  stock_quantity: 100,
  min_stock: 10,
  category: 'Electronics',
  image_url: 'https://example.com/image.jpg'
};

// Test input with nullable fields as null
const minimalInput: CreateProductInput = {
  name: 'Minimal Product',
  barcode: null,
  price: 9.99,
  cost: null,
  stock_quantity: 50,
  min_stock: null,
  category: null,
  image_url: null
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product with all fields', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Product');
    expect(result.barcode).toEqual('123456789');
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toEqual('number');
    expect(result.cost).toEqual(15.50);
    expect(typeof result.cost).toEqual('number');
    expect(result.stock_quantity).toEqual(100);
    expect(result.min_stock).toEqual(10);
    expect(result.category).toEqual('Electronics');
    expect(result.image_url).toEqual('https://example.com/image.jpg');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a product with nullable fields as null', async () => {
    const result = await createProduct(minimalInput);

    // Validate required fields
    expect(result.name).toEqual('Minimal Product');
    expect(result.price).toEqual(9.99);
    expect(typeof result.price).toEqual('number');
    expect(result.stock_quantity).toEqual(50);

    // Validate nullable fields
    expect(result.barcode).toBeNull();
    expect(result.cost).toBeNull();
    expect(result.min_stock).toBeNull();
    expect(result.category).toBeNull();
    expect(result.image_url).toBeNull();

    // Validate defaults
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const result = await createProduct(testInput);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Test Product');
    expect(products[0].barcode).toEqual('123456789');
    expect(parseFloat(products[0].price)).toEqual(19.99);
    expect(parseFloat(products[0].cost!)).toEqual(15.50);
    expect(products[0].stock_quantity).toEqual(100);
    expect(products[0].min_stock).toEqual(10);
    expect(products[0].category).toEqual('Electronics');
    expect(products[0].image_url).toEqual('https://example.com/image.jpg');
    expect(products[0].is_active).toEqual(true);
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle numeric conversions correctly', async () => {
    const result = await createProduct(testInput);

    // Verify that price and cost are returned as numbers
    expect(typeof result.price).toEqual('number');
    expect(typeof result.cost).toEqual('number');
    expect(result.price).toEqual(19.99);
    expect(result.cost).toEqual(15.50);

    // Verify database storage and retrieval
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    // In database, numeric fields are stored as strings
    expect(typeof products[0].price).toEqual('string');
    expect(typeof products[0].cost).toEqual('string');
    expect(parseFloat(products[0].price)).toEqual(19.99);
    expect(parseFloat(products[0].cost!)).toEqual(15.50);
  });
});
