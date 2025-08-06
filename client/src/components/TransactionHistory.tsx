
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Eye, Filter, Receipt, Banknote, QrCode, CreditCard, UserPlus } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Transaction, GetTransactionsInput } from '../../../server/src/schema';

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<GetTransactionsInput>({
    limit: 50,
    offset: 0
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getTransactions.query(filters);
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4 text-green-600" />;
      case 'qris': return <QrCode className="h-4 w-4 text-blue-600" />;
      case 'bank_transfer': return <CreditCard className="h-4 w-4 text-purple-600" />;
      case 'debt': return <UserPlus className="h-4 w-4 text-orange-600" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Tunai';
      case 'qris': return 'QRIS';
      case 'bank_transfer': return 'Transfer Bank';
      case 'debt': return 'Hutang';
      default: return method;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Lunas</Badge>;
      case 'pending':
        return <Badge variant="destructive">Pending</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Sebagian</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const setDateFilter = (type: 'today' | 'week' | 'month') => {
    const today = new Date();
    const startDate = new Date(today);
    
    switch (type) {
      case 'today':
        break;
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(today.getDate() - 30);
        break;
    }
    
    setFilters(prev => ({
      ...prev,
      start_date: startDate.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    }));
  };

  const clearFilters = () => {
    setFilters({
      limit: 50,
      offset: 0
    });
  };

  const showTransactionDetail = async (transaction: Transaction) => {
    try {
      const detailTransaction = await trpc.getTransactionById.query(transaction.id);
      setSelectedTransaction(detailTransaction);
    } catch (error) {
      console.error('Failed to load transaction detail:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold">🧾 Riwayat Transaksi</h2>
          <p className="text-gray-600">Daftar semua transaksi yang telah dilakukan</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cari transaksi..."
                className="pl-10"
                // Note: Search functionality would need to be implemented on the backend
              />
            </div>
          </div>
          
          <Select
            value={filters.payment_status || 'all'}
            onValueChange={(value) =>
              setFilters(prev => ({
                ...prev,
                payment_status: value === 'all' ? undefined : value as 'paid' | 'pending' | 'partial'
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="paid">Lunas</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Sebagian</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDateFilter('today')}>
              Hari Ini
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDateFilter('week')}>
              Minggu
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDateFilter('month')}>
              Bulan
            </Button>
          </div>

          <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Reset Filter
          </Button>

          <div className="text-sm text-gray-600 flex items-center">
            📊 {transactions.length} transaksi
          </div>
        </div>
      </div>

      {/* Transaction Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {transactions.filter(t => t.payment_status === 'paid').length}
              </div>
              <div className="text-sm text-gray-600">Transaksi Lunas</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {transactions.filter(t => t.payment_status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(transactions.reduce((sum, t) => sum + t.final_amount, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Nilai</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {transactions.length > 0 
                  ? formatCurrency(transactions.reduce((sum, t) => sum + t.final_amount, 0) / transactions.length)
                  : formatCurrency(0)
                }
              </div>
              <div className="text-sm text-gray-600">Rata-rata</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Daftar Transaksi
            <Button
              onClick={loadTransactions}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              {isLoading ? 'Memuat...' : 'Refresh'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Memuat data transaksi...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Belum ada transaksi</h3>
              <p className="text-sm">Transaksi akan muncul setelah Anda melakukan penjualan pertama</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction: Transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-mono text-sm text-gray-600">
                        #{transaction.id.toString().padStart(6, '0')}
                      </div>
                      <div className="flex items-center gap-1">
                        {getPaymentMethodIcon(transaction.payment_method)}
                        <span className="text-sm text-gray-600">
                          {getPaymentMethodLabel(transaction.payment_method)}
                        </span>
                      </div>
                      {getPaymentStatusBadge(transaction.payment_status)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-green-600">
                          {formatCurrency(transaction.final_amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.created_at.toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => showTransactionDetail(transaction)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detail
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>
                              Detail Transaksi #{transaction.id.toString().padStart(6, '0')}
                            </DialogTitle>
                            <DialogDescription>
                              Informasi lengkap transaksi
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedTransaction && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Tanggal:</span>
                                  <div className="font-medium">
                                    {selectedTransaction.created_at.toLocaleDateString('id-ID')}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-600">Waktu:</span>
                                  <div className="font-medium">
                                    {selectedTransaction.created_at.toLocaleTimeString('id-ID')}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="border-t pt-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(selectedTransaction.total_amount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Diskon:</span>
                                    <span>- {formatCurrency(selectedTransaction.discount_amount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Pajak:</span>
                                    <span>{formatCurrency(selectedTransaction.tax_amount)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Total:</span>
                                    <span className="text-green-600">
                                      {formatCurrency(selectedTransaction.final_amount)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="border-t pt-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getPaymentMethodIcon(selectedTransaction.payment_method)}
                                    <span>{getPaymentMethodLabel(selectedTransaction.payment_method)}</span>
                                  </div>
                                  {getPaymentStatusBadge(selectedTransaction.payment_status)}
                                </div>
                              </div>
                              
                              {selectedTransaction.notes && (
                                <div className="border-t pt-4">
                                  <span className="text-gray-600 text-sm">Catatan:</span>
                                  <div className="bg-gray-50 p-3 rounded mt-1 text-sm">
                                    {selectedTransaction.notes}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
