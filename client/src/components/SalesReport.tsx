
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, DollarSign, ShoppingBag, Users, BarChart3 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { SalesReport as SalesReportType, SalesReportInput } from '../../../server/src/schema';

export function SalesReport() {
  const [reports, setReports] = useState<SalesReportType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const reportData: SalesReportInput = {
        start_date: startDate,
        end_date: endDate,
        group_by: groupBy
      };
      const result = await trpc.getSalesReport.query(reportData);
      setReports(result);
    } catch (error) {
      console.error('Failed to load sales report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, groupBy]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Calculate summary statistics
  const totalSales = reports.reduce((sum, report) => sum + report.total_sales, 0);
  const totalTransactions = reports.reduce((sum, report) => sum + report.total_transactions, 0);
  const totalItemsSold = reports.reduce((sum, report) => sum + report.total_items_sold, 0);
  const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const formatPeriod = (period: string) => {
    const date = new Date(period);
    switch (groupBy) {
      case 'day':
        return date.toLocaleDateString('id-ID', { 
          weekday: 'short', 
          day: '2-digit', 
          month: 'short' 
        });
      case 'week':
        return `Minggu ${date.toLocaleDateString('id-ID', { 
          day: '2-digit', 
          month: 'short' 
        })}`;
      case 'month':
        return date.toLocaleDateString('id-ID', { 
          month: 'long', 
          year: 'numeric' 
        });
      default:
        return period;
    }
  };

  const quickDateRanges = [
    { label: 'Hari Ini', days: 0 },
    { label: '7 Hari Terakhir', days: 7 },
    { label: '30 Hari Terakhir', days: 30 },
    { label: '90 Hari Terakhir', days: 90 }
  ];

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold">📊 Laporan Penjualan</h2>
          <p className="text-gray-600">Analisis performa penjualan dan tren bisnis</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal Mulai</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal Selesai</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Kelompokkan</label>
            <Select value={groupBy} onValueChange={(value: 'day' | 'week' | 'month') => setGroupBy(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Per Hari</SelectItem>
                <SelectItem value="week">Per Minggu</SelectItem>
                <SelectItem value="month">Per Bulan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Rentang Cepat</label>
            <div className="flex gap-1">
              {quickDateRanges.map((range) => (
                <Button
                  key={range.label}
                  variant="outline"
                  size="sm"
                  className="text-xs flex-1"
                  onClick={() => setQuickRange(range.days)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Analytics Placeholder */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🧠</div>
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-900 mb-2">Analisis AI untuk Insight Bisnis</h3>
              <p className="text-sm text-indigo-700 mb-3">
                • Prediksi Penjualan Periode Mendatang<br/>
                • Analisis Tren dan Pola Konsumen<br/>
                • Rekomendasi Strategi Pricing<br/>
                • Identifikasi Produk Best Seller
              </p>
            </div>
            <Badge className="bg-indigo-600 hover:bg-indigo-700">
              🚀 Coming Soon
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">{formatCurrency(totalSales)}</p>
                <p className="text-sm text-gray-600">Total Penjualan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold">{totalTransactions}</p>
                <p className="text-sm text-gray-600">Total Transaksi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">{formatCurrency(averageTransactionValue)}</p>
                <p className="text-sm text-gray-600">Rata-rata Transaksi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold">{totalItemsSold}</p>
                <p className="text-sm text-gray-600">Total Item Terjual</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Detail Penjualan
            </CardTitle>
            <Button
              onClick={loadReport}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? 'Memuat...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Memuat data laporan...
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tidak ada data penjualan untuk periode yang dipilih
            </div>
          ) : (
            <div className="space-y-4">
              <div className="hidden md:grid grid-cols-5 gap-4 font-medium text-sm text-gray-600 border-b pb-2">
                <div>Periode</div>
                <div>Total Penjualan</div>
                <div>Jumlah Transaksi</div>
                <div>Rata-rata Transaksi</div>
                <div>Item Terjual</div>
              </div>
              
              <div className="space-y-2">
                {reports.map((report: SalesReportType, index: number) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium">
                      <span className="md:hidden text-sm text-gray-600">Periode: </span>
                      {formatPeriod(report.period)}
                    </div>
                    <div>
                      <span className="md:hidden text-sm text-gray-600">Penjualan: </span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(report.total_sales)}
                      </span>
                    </div>
                    <div>
                      <span className="md:hidden text-sm text-gray-600">Transaksi: </span>
                      {report.total_transactions}
                    </div>
                    <div>
                      <span className="md:hidden text-sm text-gray-600">Rata-rata: </span>
                      {formatCurrency(report.average_transaction)}
                    </div>
                    <div>
                      <span className="md:hidden text-sm text-gray-600">Item: </span>
                      <Badge variant="secondary">{report.total_items_sold}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
