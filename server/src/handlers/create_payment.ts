
import { db } from '../db';
import { paymentsTable, transactionsTable } from '../db/schema';
import { type CreatePaymentInput, type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export const createPayment = async (input: CreatePaymentInput): Promise<Payment> => {
  try {
    // Validate that the transaction exists and is a debt transaction
    const transaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.transaction_id))
      .execute();

    if (transaction.length === 0) {
      throw new Error('Transaction not found');
    }

    if (transaction[0].payment_method !== 'debt') {
      throw new Error('Payment can only be made for debt transactions');
    }

    // Insert payment record
    const result = await db.insert(paymentsTable)
      .values({
        transaction_id: input.transaction_id,
        customer_id: input.customer_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        payment_method: input.payment_method,
        notes: input.notes
      })
      .returning()
      .execute();

    // Get total payments for this transaction to check if fully paid
    const totalPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.transaction_id, input.transaction_id))
      .execute();

    const totalPaidAmount = totalPayments.reduce((sum, payment) => 
      sum + parseFloat(payment.amount), 0
    );

    const transactionFinalAmount = parseFloat(transaction[0].final_amount);

    // Update transaction payment status if fully paid
    let newPaymentStatus = transaction[0].payment_status;
    if (totalPaidAmount >= transactionFinalAmount) {
      newPaymentStatus = 'paid';
    } else if (totalPaidAmount > 0) {
      newPaymentStatus = 'partial';
    }

    if (newPaymentStatus !== transaction[0].payment_status) {
      await db.update(transactionsTable)
        .set({ payment_status: newPaymentStatus })
        .where(eq(transactionsTable.id, input.transaction_id))
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    const payment = result[0];
    return {
      id: payment.id,
      transaction_id: payment.transaction_id,
      customer_id: payment.customer_id,
      amount: parseFloat(payment.amount), // Convert string back to number
      payment_method: input.payment_method, // Use the input payment method which has the correct type
      notes: payment.notes,
      created_at: payment.created_at
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
};
