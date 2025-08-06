
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    // Check if product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.barcode !== undefined) updateData.barcode = input.barcode;
    if (input.price !== undefined) updateData.price = input.price.toString();
    if (input.cost !== undefined) updateData.cost = input.cost ? input.cost.toString() : null;
    if (input.stock_quantity !== undefined) updateData.stock_quantity = input.stock_quantity;
    if (input.min_stock !== undefined) updateData.min_stock = input.min_stock;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.image_url !== undefined) updateData.image_url = input.image_url;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the product
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price),
      cost: product.cost ? parseFloat(product.cost) : null
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};
