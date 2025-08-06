
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingCart, Plus, Minus, Trash2, QrCode, CreditCard, Banknote, UserPlus, Search, Camera } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, Customer, CreateTransactionInput } from '../../../server/src/schema';

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

interface POSSystemProps {
  onTransactionComplete: () => void;
}

export function POSSystem({ onTransactionComplete }: POSSystemProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debt' | 'bank_transfer'>('cash');
  const [notes, setNotes] = useState<string>('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query({ is_active: true });
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const result = await trpc.getCustomers.query();
      setCustomers(result);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, [loadProducts, loadCustomers]);

  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm)) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addToCart = (product: Product) => {
    setCart((prevCart: CartItem[]) => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.product.price
              }
            : item
        );
      }
      return [...prevCart, {
        product,
        quantity: 1,
        subtotal: product.price
      }];
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart((prevCart: CartItem[]) =>
      prevCart.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.product.price
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prevCart: CartItem[]) => prevCart.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal - discountAmount + taxAmount;

  const processTransaction = async () => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      const transactionData: CreateTransactionInput = {
        customer_id: selectedCustomer?.id || null,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price
        })),
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        payment_method: paymentMethod,
        notes: notes || null
      };

      await trpc.createTransaction.mutate(transactionData);
      
      // Reset form
      setCart([]);
      setSelectedCustomer(null);
      setDiscountAmount(0);
      setTaxAmount(0);
      setPaymentMethod('cash');
      setNotes('');
      setShowCheckout(false);
      
      onTransactionComplete();
      
      // TODO: Show success message or receipt
    } catch (error) {
      console.error('Failed to process transaction:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Selection */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📦 Pilih Produk
              <Badge variant="secondary" className="ml-auto">
                {products.length} produk tersedia
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari nama produk, barcode, atau kategori..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" className="flex-shrink-0">
                <Camera className="h-4 w-4" />
              </Button>
              <div className="text-xs text-gray-500 self-center">
                📷 AI Scanner
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'Tidak ada produk yang cocok dengan pencarian' : 'Belum ada produk. Tambahkan produk di menu Produk.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {filteredProducts.map((product: Product) => (
                  <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => addToCart(product)}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-sm truncate flex-1">{product.name}</h3>
                        {product.stock_quantity <= (product.min_stock || 5) && (
                          <Badge variant="destructive" className="text-xs ml-1">Sedikit</Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-green-600">
                          Rp {product.price.toLocaleString('id-ID')}
                        </div>
                        <div className="text-xs text-gray-500">
                          Stok: {product.stock_quantity}
                        </div>
                        {product.category && (
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cart and Checkout */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Keranjang ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                Keranjang kosong
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.map((item: CartItem) => (
                    <div key={item.product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.product.name}</div>
                        <div className="text-xs text-gray-500">
                          Rp {item.product.price.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6 ml-1"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Diskon:</span>
                    <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pajak:</span>
                    <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">Rp {total.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => setShowCheckout(true)}
                  disabled={cart.length === 0}
                >
                  💳 Checkout
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>💳 Checkout Transaksi</DialogTitle>
            <DialogDescription>
              Lengkapi detail transaksi sebelum memproses pembayaran
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Pelanggan (Opsional)</label>
              <Select
                value={selectedCustomer?.id?.toString() || 'none'}
                onValueChange={(value) => {
                  const customer = customers.find(c => c.id.toString() === value);
                  setSelectedCustomer(customer || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pelanggan..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pelanggan Umum</SelectItem>
                  {customers.map((customer: Customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Diskon (Rp)</label>
                <Input
                  type="number"
                  value={discountAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDiscountAmount(parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  step="1000"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Pajak (Rp)</label>
                <Input
                  type="number"
                  value={taxAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTaxAmount(parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Metode Pembayaran</label>
              <Select
                value={paymentMethod}
                onValueChange={(value: 'cash' | 'qris' | 'debt' | 'bank_transfer') =>
                  setPaymentMethod(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Tunai
                    </div>
                  </SelectItem>
                  <SelectItem value="qris">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      QRIS (Coming Soon)
                    </div>
                  </SelectItem>
                  <SelectItem value="bank_transfer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Transfer Bank
                    </div>
                  </SelectItem>
                  <SelectItem value="debt">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Hutang
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Catatan (Opsional)</label>
              <Textarea
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                placeholder="Tambahkan catatan transaksi..."
                rows={3}
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Bayar:</span>
                <span className="text-green-600">Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Batal
            </Button>
            <Button
              onClick={processTransaction}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Memproses...' : 'Proses Pembayaran'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
