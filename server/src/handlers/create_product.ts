
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';

export const createProduct = async (input: CreateProductInput): Promise<Product> => {
  try {
    // Insert product record
    const result = await db.insert(productsTable)
      .values({
        name: input.name,
        barcode: input.barcode,
        price: input.price.toString(), // Convert number to string for numeric column
        cost: input.cost ? input.cost.toString() : null, // Handle nullable cost
        stock_quantity: input.stock_quantity, // Integer column - no conversion needed
        min_stock: input.min_stock, // Integer column - no conversion needed
        category: input.category,
        image_url: input.image_url
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price), // Convert string back to number
      cost: product.cost ? parseFloat(product.cost) : null // Handle nullable cost
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
};
