
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getProductById } from '../handlers/get_product_by_id';

describe('getProductById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a product when found', async () => {
    // Create test product
    const testProduct = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: 'TEST123',
        price: '29.99',
        cost: '15.50',
        stock_quantity: 100,
        min_stock: 10,
        category: 'Electronics',
        image_url: 'https://example.com/image.jpg',
        is_active: true
      })
      .returning()
      .execute();

    const productId = testProduct[0].id;
    
    const result = await getProductById(productId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(productId);
    expect(result!.name).toBe('Test Product');
    expect(result!.barcode).toBe('TEST123');
    expect(result!.price).toBe(29.99);
    expect(typeof result!.price).toBe('number');
    expect(result!.cost).toBe(15.50);
    expect(typeof result!.cost).toBe('number');
    expect(result!.stock_quantity).toBe(100);
    expect(result!.min_stock).toBe(10);
    expect(result!.category).toBe('Electronics');
    expect(result!.image_url).toBe('https://example.com/image.jpg');
    expect(result!.is_active).toBe(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when product not found', async () => {
    const result = await getProductById(999);
    
    expect(result).toBeNull();
  });

  it('should handle products with null optional fields', async () => {
    // Create product with minimal required fields
    const testProduct = await db.insert(productsTable)
      .values({
        name: 'Minimal Product',
        price: '10.00',
        stock_quantity: 50
      })
      .returning()
      .execute();

    const productId = testProduct[0].id;
    
    const result = await getProductById(productId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(productId);
    expect(result!.name).toBe('Minimal Product');
    expect(result!.barcode).toBeNull();
    expect(result!.price).toBe(10.00);
    expect(typeof result!.price).toBe('number');
    expect(result!.cost).toBeNull();
    expect(result!.stock_quantity).toBe(50);
    expect(result!.min_stock).toBeNull();
    expect(result!.category).toBeNull();
    expect(result!.image_url).toBeNull();
    expect(result!.is_active).toBe(true); // Default value
  });

  it('should handle numeric conversion correctly', async () => {
    // Create product with decimal values
    const testProduct = await db.insert(productsTable)
      .values({
        name: 'Decimal Product',
        price: '123.45',
        cost: '67.89',
        stock_quantity: 25
      })
      .returning()
      .execute();

    const productId = testProduct[0].id;
    
    const result = await getProductById(productId);

    expect(result).not.toBeNull();
    expect(result!.price).toBe(123.45);
    expect(typeof result!.price).toBe('number');
    expect(result!.cost).toBe(67.89);
    expect(typeof result!.cost).toBe('number');
  });
});
