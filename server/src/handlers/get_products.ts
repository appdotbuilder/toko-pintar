
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type GetProductsInput, type Product } from '../schema';
import { eq, and, or, ilike, lte, isNull, SQL } from 'drizzle-orm';

export async function getProducts(input?: GetProductsInput): Promise<Product[]> {
  try {
    // Use defaults if input is not provided
    const filters = input || { limit: 50, offset: 0 };

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Category filter
    if (filters.category) {
      conditions.push(eq(productsTable.category, filters.category));
    }

    // Active status filter
    if (filters.is_active !== undefined) {
      conditions.push(eq(productsTable.is_active, filters.is_active));
    }

    // Low stock filter
    if (filters.low_stock === true) {
      conditions.push(
        or(
          lte(productsTable.stock_quantity, productsTable.min_stock),
          and(
            isNull(productsTable.min_stock),
            lte(productsTable.stock_quantity, 10) // Default low stock threshold
          )
        )!
      );
    }

    // Text search filter
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(productsTable.name, searchPattern),
          ilike(productsTable.barcode, searchPattern)
        )!
      );
    }

    // Build final query
    let finalQuery = db.select().from(productsTable);

    // Apply where conditions if any
    if (conditions.length > 0) {
      finalQuery = finalQuery.where(
        conditions.length === 1 ? conditions[0] : and(...conditions)
      ) as any;
    }

    // Apply pagination
    const results = await finalQuery
      .limit(filters.limit)
      .offset(filters.offset)
      .execute();

    // Convert numeric fields from strings to numbers
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price),
      cost: product.cost ? parseFloat(product.cost) : null
    }));
  } catch (error) {
    console.error('Failed to get products:', error);
    throw error;
  }
}
