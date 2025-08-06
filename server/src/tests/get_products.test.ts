
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type GetProductsInput, type CreateProductInput } from '../schema';
import { getProducts } from '../handlers/get_products';
import { eq } from 'drizzle-orm';

// Test helper to create a product
const createTestProduct = async (overrides: Partial<CreateProductInput> = {}) => {
  const defaultProduct = {
    name: 'Test Product',
    barcode: '1234567890',
    price: 19.99,
    cost: 10.50,
    stock_quantity: 100,
    min_stock: 10,
    category: 'Electronics',
    image_url: 'https://example.com/image.jpg'
  };

  const productData = { ...defaultProduct, ...overrides };

  const result = await db.insert(productsTable)
    .values({
      name: productData.name,
      barcode: productData.barcode,
      price: productData.price.toString(),
      cost: productData.cost?.toString() || null,
      stock_quantity: productData.stock_quantity,
      min_stock: productData.min_stock,
      category: productData.category,
      image_url: productData.image_url
    })
    .returning()
    .execute();

  return result[0];
};

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all products with default pagination', async () => {
    await createTestProduct({ name: 'Product 1' });
    await createTestProduct({ name: 'Product 2' });

    const result = await getProducts();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBeDefined();
    expect(typeof result[0].price).toBe('number');
    expect(typeof result[0].cost).toBe('number');
    expect(result[0].is_active).toBe(true);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter by category', async () => {
    await createTestProduct({ name: 'Electronics Product', category: 'Electronics' });
    await createTestProduct({ name: 'Clothing Product', category: 'Clothing' });

    const input: GetProductsInput = {
      category: 'Electronics',
      limit: 50,
      offset: 0
    };

    const result = await getProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Electronics Product');
    expect(result[0].category).toBe('Electronics');
  });

  it('should filter by active status', async () => {
    const activeProduct = await createTestProduct({ name: 'Active Product' });
    await createTestProduct({ name: 'Inactive Product' });

    // Mark one product as inactive
    await db.update(productsTable)
      .set({ is_active: false })
      .where(eq(productsTable.id, activeProduct.id))
      .execute();

    const input: GetProductsInput = {
      is_active: true,
      limit: 50,
      offset: 0
    };

    const result = await getProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Inactive Product');
    expect(result[0].is_active).toBe(true);
  });

  it('should filter by low stock', async () => {
    await createTestProduct({ 
      name: 'Low Stock Product', 
      stock_quantity: 5, 
      min_stock: 10 
    });
    await createTestProduct({ 
      name: 'Good Stock Product', 
      stock_quantity: 50, 
      min_stock: 10 
    });

    const input: GetProductsInput = {
      low_stock: true,
      limit: 50,
      offset: 0
    };

    const result = await getProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Low Stock Product');
    expect(result[0].stock_quantity).toBe(5);
  });

  it('should filter low stock when min_stock is null', async () => {
    await createTestProduct({ 
      name: 'Low Stock No Min', 
      stock_quantity: 5, 
      min_stock: null 
    });
    await createTestProduct({ 
      name: 'Good Stock No Min', 
      stock_quantity: 50, 
      min_stock: null 
    });

    const input: GetProductsInput = {
      low_stock: true,
      limit: 50,
      offset: 0
    };

    const result = await getProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Low Stock No Min');
    expect(result[0].stock_quantity).toBe(5);
    expect(result[0].min_stock).toBe(null);
  });

  it('should search by name', async () => {
    await createTestProduct({ name: 'iPhone 15 Pro' });
    await createTestProduct({ name: 'Samsung Galaxy' });

    const input: GetProductsInput = {
      search: 'iPhone',
      limit: 50,
      offset: 0
    };

    const result = await getProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('iPhone 15 Pro');
  });

  it('should search by barcode', async () => {
    await createTestProduct({ name: 'Product A', barcode: '1111111111' });
    await createTestProduct({ name: 'Product B', barcode: '2222222222' });

    const input: GetProductsInput = {
      search: '1111',
      limit: 50,
      offset: 0
    };

    const result = await getProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].barcode).toBe('1111111111');
  });

  it('should handle pagination correctly', async () => {
    // Create multiple products
    for (let i = 1; i <= 5; i++) {
      await createTestProduct({ name: `Product ${i}` });
    }

    const firstPage: GetProductsInput = {
      limit: 2,
      offset: 0
    };

    const secondPage: GetProductsInput = {
      limit: 2,
      offset: 2
    };

    const firstResult = await getProducts(firstPage);
    const secondResult = await getProducts(secondPage);

    expect(firstResult).toHaveLength(2);
    expect(secondResult).toHaveLength(2);
    expect(firstResult[0].id).not.toBe(secondResult[0].id);
  });

  it('should combine multiple filters', async () => {
    await createTestProduct({ 
      name: 'Target Product',
      category: 'Electronics',
      stock_quantity: 5,
      min_stock: 10
    });
    await createTestProduct({ 
      name: 'Other Product',
      category: 'Clothing',
      stock_quantity: 5,
      min_stock: 10
    });

    const input: GetProductsInput = {
      category: 'Electronics',
      low_stock: true,
      search: 'Target',
      limit: 50,
      offset: 0
    };

    const result = await getProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Target Product');
    expect(result[0].category).toBe('Electronics');
  });

  it('should return empty array when no products match filters', async () => {
    await createTestProduct({ category: 'Electronics' });

    const input: GetProductsInput = {
      category: 'NonExistent',
      limit: 50,
      offset: 0
    };

    const result = await getProducts(input);

    expect(result).toHaveLength(0);
  });

  it('should handle products with null values correctly', async () => {
    await createTestProduct({
      name: 'Minimal Product',
      barcode: null,
      cost: null,
      min_stock: null,
      category: null,
      image_url: null
    });

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].barcode).toBe(null);
    expect(result[0].cost).toBe(null);
    expect(result[0].min_stock).toBe(null);
    expect(result[0].category).toBe(null);
    expect(result[0].image_url).toBe(null);
  });

  it('should handle case insensitive search', async () => {
    await createTestProduct({ name: 'iPhone 15 Pro' });
    await createTestProduct({ name: 'Samsung Galaxy' });

    const input: GetProductsInput = {
      search: 'iphone',
      limit: 50,
      offset: 0
    };

    const result = await getProducts(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('iPhone 15 Pro');
  });
});
