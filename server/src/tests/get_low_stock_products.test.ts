
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getLowStockProducts } from '../handlers/get_low_stock_products';

describe('getLowStockProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return products with stock below minimum', async () => {
    // Create a product with low stock
    await db.insert(productsTable)
      .values({
        name: 'Low Stock Product',
        price: '10.00',
        stock_quantity: 5,
        min_stock: 10,
        is_active: true
      })
      .execute();

    const results = await getLowStockProducts();

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Low Stock Product');
    expect(results[0].stock_quantity).toEqual(5);
    expect(results[0].min_stock).toEqual(10);
    expect(typeof results[0].price).toBe('number');
    expect(results[0].price).toEqual(10.00);
  });

  it('should return products with stock equal to minimum', async () => {
    // Create a product with stock equal to minimum
    await db.insert(productsTable)
      .values({
        name: 'Equal Stock Product',
        price: '15.50',
        stock_quantity: 8,
        min_stock: 8,
        is_active: true
      })
      .execute();

    const results = await getLowStockProducts();

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Equal Stock Product');
    expect(results[0].stock_quantity).toEqual(8);
    expect(results[0].min_stock).toEqual(8);
  });

  it('should not return products with stock above minimum', async () => {
    // Create a product with sufficient stock
    await db.insert(productsTable)
      .values({
        name: 'Good Stock Product',
        price: '20.00',
        stock_quantity: 15,
        min_stock: 10,
        is_active: true
      })
      .execute();

    const results = await getLowStockProducts();

    expect(results).toHaveLength(0);
  });

  it('should not return products with null min_stock', async () => {
    // Create a product with null min_stock (no minimum defined)
    await db.insert(productsTable)
      .values({
        name: 'No Min Stock Product',
        price: '12.00',
        stock_quantity: 2,
        min_stock: null,
        is_active: true
      })
      .execute();

    const results = await getLowStockProducts();

    expect(results).toHaveLength(0);
  });

  it('should return multiple low stock products', async () => {
    // Create multiple products with different stock situations
    await db.insert(productsTable)
      .values([
        {
          name: 'Low Stock 1',
          price: '10.00',
          stock_quantity: 3,
          min_stock: 10,
          is_active: true
        },
        {
          name: 'Low Stock 2',
          price: '25.50',
          stock_quantity: 1,
          min_stock: 5,
          is_active: true
        },
        {
          name: 'Good Stock',
          price: '30.00',
          stock_quantity: 20,
          min_stock: 15,
          is_active: true
        }
      ])
      .execute();

    const results = await getLowStockProducts();

    expect(results).toHaveLength(2);
    
    const productNames = results.map(p => p.name);
    expect(productNames).toContain('Low Stock 1');
    expect(productNames).toContain('Low Stock 2');
    expect(productNames).not.toContain('Good Stock');

    // Verify numeric conversions
    results.forEach(product => {
      expect(typeof product.price).toBe('number');
      expect(product.stock_quantity).toBeTypeOf('number');
      expect(product.min_stock).toBeTypeOf('number');
    });
  });

  it('should handle products with cost values correctly', async () => {
    // Create product with cost field
    await db.insert(productsTable)
      .values({
        name: 'Product with Cost',
        price: '15.99',
        cost: '8.50',
        stock_quantity: 2,
        min_stock: 5,
        is_active: true
      })
      .execute();

    const results = await getLowStockProducts();

    expect(results).toHaveLength(1);
    expect(typeof results[0].price).toBe('number');
    expect(results[0].price).toEqual(15.99);
    expect(typeof results[0].cost).toBe('number');
    expect(results[0].cost).toEqual(8.50);
  });

  it('should return empty array when no products exist', async () => {
    const results = await getLowStockProducts();

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });
});
