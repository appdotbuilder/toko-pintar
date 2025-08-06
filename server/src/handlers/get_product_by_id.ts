
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const getProductById = async (id: number): Promise<Product | null> => {
  try {
    const result = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const product = result[0];
    
    // Convert numeric fields back to numbers
    return {
      ...product,
      price: parseFloat(product.price),
      cost: product.cost ? parseFloat(product.cost) : null
    };
  } catch (error) {
    console.error('Failed to fetch product by ID:', error);
    throw error;
  }
};
