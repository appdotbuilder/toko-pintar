
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

// Helper function to create a product directly in the database for testing
const createTestProduct = async (input: CreateProductInput) => {
  const result = await db.insert(productsTable)
    .values({
      name: input.name,
      barcode: input.barcode,
      price: input.price.toString(),
      cost: input.cost ? input.cost.toString() : null,
      stock_quantity: input.stock_quantity,
      min_stock: input.min_stock,
      category: input.category,
      image_url: input.image_url
    })
    .returning()
    .execute();

  const product = result[0];
  return {
    ...product,
    price: parseFloat(product.price),
    cost: product.cost ? parseFloat(product.cost) : null
  };
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a product with all fields', async () => {
    // Create a product first
    const createInput: CreateProductInput = {
      name: 'Original Product',
      barcode: 'original-123',
      price: 10.99,
      cost: 5.50,
      stock_quantity: 50,
      min_stock: 10,
      category: 'Original Category',
      image_url: 'http://example.com/original.jpg'
    };
    
    const createdProduct = await createTestProduct(createInput);

    // Update with all fields
    const updateInput: UpdateProductInput = {
      id: createdProduct.id,
      name: 'Updated Product',
      barcode: 'updated-456',
      price: 15.99,
      cost: 8.75,
      stock_quantity: 75,
      min_stock: 15,
      category: 'Updated Category',
      image_url: 'http://example.com/updated.jpg',
      is_active: false
    };

    const result = await updateProduct(updateInput);

    // Verify all fields were updated
    expect(result.id).toEqual(createdProduct.id);
    expect(result.name).toEqual('Updated Product');
    expect(result.barcode).toEqual('updated-456');
    expect(result.price).toEqual(15.99);
    expect(result.cost).toEqual(8.75);
    expect(result.stock_quantity).toEqual(75);
    expect(result.min_stock).toEqual(15);
    expect(result.category).toEqual('Updated Category');
    expect(result.image_url).toEqual('http://example.com/updated.jpg');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdProduct.updated_at).toBe(true);
  });

  it('should update only specified fields', async () => {
    // Create a product first
    const createInput: CreateProductInput = {
      name: 'Original Product',
      barcode: 'original-123',
      price: 10.99,
      cost: 5.50,
      stock_quantity: 50,
      min_stock: 10,
      category: 'Original Category',
      image_url: 'http://example.com/original.jpg'
    };
    
    const createdProduct = await createTestProduct(createInput);

    // Update only name and price
    const updateInput: UpdateProductInput = {
      id: createdProduct.id,
      name: 'Updated Name Only',
      price: 20.99
    };

    const result = await updateProduct(updateInput);

    // Verify only specified fields were updated
    expect(result.name).toEqual('Updated Name Only');
    expect(result.price).toEqual(20.99);
    
    // Verify other fields remained unchanged
    expect(result.barcode).toEqual('original-123');
    expect(result.cost).toEqual(5.50);
    expect(result.stock_quantity).toEqual(50);
    expect(result.min_stock).toEqual(10);
    expect(result.category).toEqual('Original Category');
    expect(result.image_url).toEqual('http://example.com/original.jpg');
    expect(result.is_active).toEqual(true);
  });

  it('should update nullable fields to null', async () => {
    // Create a product with non-null values
    const createInput: CreateProductInput = {
      name: 'Product with Values',
      barcode: 'has-barcode',
      price: 10.99,
      cost: 5.50,
      stock_quantity: 50,
      min_stock: 10,
      category: 'Has Category',
      image_url: 'http://example.com/image.jpg'
    };
    
    const createdProduct = await createTestProduct(createInput);

    // Update nullable fields to null
    const updateInput: UpdateProductInput = {
      id: createdProduct.id,
      barcode: null,
      cost: null,
      min_stock: null,
      category: null,
      image_url: null
    };

    const result = await updateProduct(updateInput);

    // Verify nullable fields were set to null
    expect(result.barcode).toBeNull();
    expect(result.cost).toBeNull();
    expect(result.min_stock).toBeNull();
    expect(result.category).toBeNull();
    expect(result.image_url).toBeNull();
    
    // Verify other fields remained unchanged
    expect(result.name).toEqual('Product with Values');
    expect(result.price).toEqual(10.99);
    expect(result.stock_quantity).toEqual(50);
  });

  it('should save updated product to database', async () => {
    // Create a product first
    const createInput: CreateProductInput = {
      name: 'Database Test Product',
      barcode: null,
      price: 25.99,
      cost: null,
      stock_quantity: 100,
      min_stock: null,
      category: null,
      image_url: null
    };
    
    const createdProduct = await createTestProduct(createInput);

    // Update the product
    const updateInput: UpdateProductInput = {
      id: createdProduct.id,
      name: 'Updated Database Product',
      price: 30.99,
      stock_quantity: 150
    };

    await updateProduct(updateInput);

    // Query database to verify changes were persisted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, createdProduct.id))
      .execute();

    expect(products).toHaveLength(1);
    const dbProduct = products[0];
    expect(dbProduct.name).toEqual('Updated Database Product');
    expect(parseFloat(dbProduct.price)).toEqual(30.99);
    expect(dbProduct.stock_quantity).toEqual(150);
    expect(dbProduct.updated_at).toBeInstanceOf(Date);
    expect(dbProduct.updated_at > createdProduct.updated_at).toBe(true);
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 99999,
      name: 'Non-existent Product'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Product with id 99999 not found/i);
  });

  it('should handle numeric type conversions correctly', async () => {
    // Create a product first
    const createInput: CreateProductInput = {
      name: 'Numeric Test Product',
      barcode: null,
      price: 19.95,
      cost: 12.50,
      stock_quantity: 25,
      min_stock: null,
      category: null,
      image_url: null
    };
    
    const createdProduct = await createTestProduct(createInput);

    // Update with different numeric values
    const updateInput: UpdateProductInput = {
      id: createdProduct.id,
      price: 29.99,
      cost: 18.75
    };

    const result = await updateProduct(updateInput);

    // Verify numeric fields are returned as numbers
    expect(typeof result.price).toBe('number');
    expect(typeof result.cost).toBe('number');
    expect(result.price).toEqual(29.99);
    expect(result.cost).toEqual(18.75);
  });
});
