
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Package, Users, BarChart3, History, Settings } from 'lucide-react';
import { POSSystem } from '@/components/POSSystem';
import { ProductManagement } from '@/components/ProductManagement';
import { CustomerManagement } from '@/components/CustomerManagement';
import { SalesReport } from '@/components/SalesReport';
import { TransactionHistory } from '@/components/TransactionHistory';
import { trpc } from '@/utils/trpc';

function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  const checkLowStock = useCallback(async () => {
    try {
      const lowStockProducts = await trpc.getLowStockProducts.query();
      setLowStockCount(lowStockProducts.length);
    } catch (error) {
      console.error('Failed to check low stock:', error);
    }
  }, []);

  useEffect(() => {
    checkLowStock();
  }, [checkLowStock]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🏪 Toko Pintar</h1>
                <p className="text-sm text-gray-600">Kasir Cepat & Pintar untuk UMKM</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✨ AI Ready
              </Badge>
              {lowStockCount > 0 && (
                <Badge variant="destructive">
                  {lowStockCount} Stok Menipis
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-white shadow-sm">
            <TabsTrigger value="pos" className="flex items-center gap-2 data-[state=active]:bg-blue-100">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Kasir</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2 data-[state=active]:bg-blue-100">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Produk</span>
              {lowStockCount > 0 && <Badge variant="destructive" className="text-xs">{lowStockCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2 data-[state=active]:bg-blue-100">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Pelanggan</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2 data-[state=active]:bg-blue-100">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Laporan</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-blue-100">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Riwayat</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-blue-100">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Pengaturan</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="pos" className="space-y-4">
              <POSSystem onTransactionComplete={checkLowStock} />
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <ProductManagement onStockUpdate={checkLowStock} />
            </TabsContent>

            <TabsContent value="customers" className="space-y-4">
              <CustomerManagement />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <SalesReport />
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <TransactionHistory />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>⚙️ Pengaturan Toko</CardTitle>
                  <CardDescription>
                    Konfigurasi aplikasi dan fitur AI (Coming Soon)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-lg border-2 border-dashed border-purple-300">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🤖</div>
                      <h3 className="text-lg font-semibold text-purple-900 mb-2">
                        Fitur AI Segera Hadir!
                      </h3>
                      <p className="text-purple-700 text-sm mb-4">
                        • Prediksi Stok Otomatis<br/>
                        • Analisis Penjualan Cerdas<br/>
                        • Rekomendasi Produk<br/>
                        • Pengenalan Produk via Kamera
                      </p>
                      <Badge className="bg-purple-600 hover:bg-purple-700">
                        🚀 Update Coming Soon
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">📱 Progressive Web App</h4>
                    <p className="text-blue-700 text-sm">
                      Aplikasi ini dapat diinstall di perangkat Android Anda untuk pengalaman seperti aplikasi native.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
