
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { and, lte, isNotNull } from 'drizzle-orm';

export async function getLowStockProducts(): Promise<Product[]> {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(
        and(
          isNotNull(productsTable.min_stock),
          lte(productsTable.stock_quantity, productsTable.min_stock)
        )
      )
      .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price),
      cost: product.cost ? parseFloat(product.cost) : null,
      debt_limit: null // This field doesn't exist in products table
    }));
  } catch (error) {
    console.error('Failed to fetch low stock products:', error);
    throw error;
  }
}
