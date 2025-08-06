
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Package, AlertTriangle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, CreateProductInput, UpdateProductInput } from '../../../server/src/schema';

interface ProductManagementProps {
  onStockUpdate: () => void;
}

export function ProductManagement({ onStockUpdate }: ProductManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    barcode: null,
    price: 0,
    cost: null,
    stock_quantity: 0,
    min_stock: null,
    category: null,
    image_url: null
  });

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
      onStockUpdate();
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, [onStockUpdate]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = Array.from(new Set(
    products
      .map(p => p.category)
      .filter((category): category is string => category !== null)
  ));

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm));
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active) ||
      (statusFilter === 'low_stock' && product.stock_quantity <= (product.min_stock || 5));
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      barcode: null,
      price: 0,
      cost: null,
      stock_quantity: 0,
      min_stock: null,
      category: null,
      image_url: null
    });
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingProduct) {
        const updateData: UpdateProductInput = {
          id: editingProduct.id,
          ...formData
        };
        const updatedProduct = await trpc.updateProduct.mutate(updateData);
        setProducts((prev: Product[]) =>
          prev.map(p => p.id === editingProduct.id ? { ...p, ...updatedProduct } : p)
        );
        setShowEditDialog(false);
      } else {
        const newProduct = await trpc.createProduct.mutate(formData);
        setProducts((prev: Product[]) => [...prev, newProduct]);
        setShowAddDialog(false);
      }
      
      resetForm();
      onStockUpdate();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      price: product.price,
      cost: product.cost,
      stock_quantity: product.stock_quantity,
      min_stock: product.min_stock,
      category: product.category,
      image_url: product.image_url
    });
    setShowEditDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📦 Manajemen Produk</h2>
          <p className="text-gray-600">Kelola produk dan stok toko Anda</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Produk Baru</DialogTitle>
              <DialogDescription>
                Isi informasi produk yang akan dijual
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Produk *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nama produk"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Harga Jual *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="0"
                    min="0"
                    step="1000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Harga Beli</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={formData.cost || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, cost: parseFloat(e.target.value) || null }))
                    }
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock">Stok Awal *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))
                    }
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minStock">Stok Minimum</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={formData.min_stock || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, min_stock: parseInt(e.target.value) || null }))
                    }
                    placeholder="5"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateProductInput) => ({ ...prev, barcode: e.target.value || null }))
                  }
                  placeholder="Scan atau ketik barcode"
                />
              </div>

              <div>
                <Label htmlFor="category">Kategori</Label>
                <Input
                  id="category"
                  value={formData.category || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateProductInput) => ({ ...prev, category: e.target.value || null }))
                  }
                  placeholder="Makanan, Minuman, dll."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Cari produk..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((category: string) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Non-aktif</SelectItem>
            <SelectItem value="low_stock">Stok Menipis</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-gray-600 flex items-center">
          📊 {filteredProducts.length} dari {products.length} produk
        </div>
      </div>

      {/* AI Stock Prediction Placeholder */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h3 className="font-semibold text-green-900">Prediksi Stok AI</h3>
              <p className="text-sm text-green-700">
                Sistem akan memprediksi kebutuhan stok berdasarkan pola penjualan (Coming Soon)
              </p>
            </div>
            <Badge className="ml-auto bg-green-600 hover:bg-green-700">
              🚀 Soon
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {products.length === 0 ? 'Belum ada produk' : 'Tidak ada produk yang cocok'}
            </h3>
            <p className="text-gray-600 mb-4">
              {products.length === 0 
                ? 'Mulai dengan menambahkan produk pertama Anda'
                : 'Coba ubah filter pencarian'
              }
            </p>
            {products.length === 0 && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Produk Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product: Product) => {
            const isLowStock = product.stock_quantity <= (product.min_stock || 5);
            const profitMargin = product.cost ? ((product.price - product.cost) / product.price * 100) : null;
            
            return (
              <Card key={product.id} className={`${!product.is_active ? 'opacity-60' : ''} ${isLowStock ? 'ring-2 ring-red-200' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base truncate flex-1">{product.name}</CardTitle>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => startEdit(product)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-600">
                      Rp {product.price.toLocaleString('id-ID')}
                    </span>
                    {profitMargin && (
                      <Badge variant="secondary" className="text-xs">
                        +{profitMargin.toFixed(0)}%
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Stok:</span>
                      <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.stock_quantity}
                        {isLowStock && <AlertTriangle className="inline h-4 w-4 ml-1" />}
                      </span>
                    </div>
                    
                    {product.category && (
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                    )}

                    <div className="flex gap-2">
                      {!product.is_active && (
                        <Badge variant="secondary" className="text-xs">Non-aktif</Badge>
                      )}
                      {isLowStock && (
                        <Badge variant="destructive" className="text-xs">Stok Menipis</Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Dibuat: {product.created_at.toLocaleDateString('id-ID')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Produk</DialogTitle>
            <DialogDescription>
              Ubah informasi produk
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nama Produk *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nama produk"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-price">Harga Jual *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateProductInput) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0"
                  min="0"
                  step="1000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-cost">Harga Beli</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  value={formData.cost || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateProductInput) => ({ ...prev, cost: parseFloat(e.target.value) || null }))
                  }
                  placeholder="0"
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-stock">Stok *</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateProductInput) => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-minStock">Stok Minimum</Label>
                <Input
                  id="edit-minStock"
                  type="number"
                  value={formData.min_stock || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateProductInput) => ({ ...prev, min_stock: parseInt(e.target.value) || null }))
                  }
                  placeholder="5"
                  min="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-category">Kategori</Label>
              <Input
                id="edit-category"
                value={formData.category || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateProductInput) => ({ ...prev, category: e.target.value || null }))
                }
                placeholder="Makanan, Minuman, dll."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
