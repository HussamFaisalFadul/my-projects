// src/pages/useProductsLogic.tsx (مع إضافة handleSubmitDirect)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  api,
  socket,
  uploadImageToCloudinary,
  Product,
  ProductImage,
  ProductVariant,
  Supplier,
  StockMovement,
} from '../api';
import * as XLSX from 'xlsx';

// ===== الأنواع المحلية =====
type ViewMode = 'grid' | 'table';
type ProductsMode = 'simple' | 'advanced';
type SortMode = 'newest' | 'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc';
type Tab = 'basic' | 'media' | 'pricing' | 'inventory' | 'variants' | 'movements';
type MovementReason = 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage';

interface ExtendedProduct extends Product {
  images?: ProductImage[];
  variants?: ProductVariant[];
}

interface FormState {
  name: string;
  price: number;
  quantity: number;
  category: string;
  minQuantity: number;
  imageUrl: string;
  images: ProductImage[];
  variants: ProductVariant[];
  barcode: string;
  brand: string;
  weight_kg: number;
  tax_rate: number;
  sale_price: number;
  sale_start: string;
  sale_end: string;
  sku: string;
  description: string;
  cost_price: number;
  unit: string;
  is_active: boolean;
  tagsText: string;
  supplierId: string;
}

// ===== دوال مساعدة =====
const getStoreId = (): string => localStorage.getItem('store_id') || 'default';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const toNumber = (value: string | number): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return isFinite(n) ? n : 0;
};

export const generateEAN13 = (): string => {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const checksum = (10 - (sum % 10)) % 10;
  return `${digits.join('')}${checksum}`;
};

export const formatMoney = (value?: number, t?: any): string => {
  if (value === undefined || value === null || isNaN(value)) return '—';
  return `${value.toFixed(2)} ${t ? t('common.currency') : 'ر.س'}`;
};

export const formatDate = (value?: string): string => {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-SA');
};

export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return 'P';
  return parts.map(p => p[0]).join('').toUpperCase();
};

const createId = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const emptyForm: FormState = {
  name: '', price: 0, quantity: 0, category: '', minQuantity: 5, imageUrl: '',
  images: [], variants: [], barcode: '', brand: '', weight_kg: 0, tax_rate: 0,
  sale_price: 0, sale_start: '', sale_end: '', sku: '', description: '',
  cost_price: 0, unit: 'قطعة', is_active: true, tagsText: '', supplierId: '',
};

// ===== الـ Hook الرئيسي =====
export function useProductsLogic() {
  const { t } = useTranslation();

  // حالة العرض
  const [mode, setMode] = useState<ProductsMode>(
    () => (localStorage.getItem('products_mode') as ProductsMode) || 'advanced'
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem('products_view') as ViewMode) || 'grid'
  );
  const [sortMode, setSortMode] = useState<SortMode>(
    () => (localStorage.getItem('products_sort') as SortMode) || 'newest'
  );

  // البيانات
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // الفلاتر
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // النموذج
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(clone(emptyForm));
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('basic');

  // حركة المخزون
  const [selectedProductForLog, setSelectedProductForLog] = useState<ExtendedProduct | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementReason, setMovementReason] = useState<MovementReason>('adjustment');
  const [movementQuantity, setMovementQuantity] = useState(0);
  const [movementNote, setMovementNote] = useState('');
  const [movementsData, setMovementsData] = useState<StockMovement[]>([]);

  // جلب المنتجات
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data as ExtendedProduct[]);
    } catch (error) {
      console.error(t('products.loadError'), error);
      alert(t('products.loadErrorMsg'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchProducts();
    const refresh = () => fetchProducts();
    socket.on('product_updated', refresh);
    socket.on('product_added', refresh);
    socket.on('product_deleted', refresh);
    return () => {
      socket.off('product_updated', refresh);
      socket.off('product_added', refresh);
      socket.off('product_deleted', refresh);
    };
  }, [fetchProducts]);

  // جلب الموردين
  useEffect(() => {
    let mounted = true;
    api.getSuppliers()
      .then(data => { if (mounted) setSuppliers(data); })
      .catch(err => console.error(t('products.loadSuppliersError'), err));
    return () => { mounted = false; };
  }, [t]);

  // تبديل العرض
  const toggleMode = () => {
    const next = mode === 'simple' ? 'advanced' : 'simple';
    setMode(next);
    localStorage.setItem('products_mode', next);
  };
  const toggleViewMode = () => {
    const next = viewMode === 'grid' ? 'table' : 'grid';
    setViewMode(next);
    localStorage.setItem('products_view', next);
  };
  const changeSort = (value: SortMode) => {
    setSortMode(value);
    localStorage.setItem('products_sort', value);
  };

  // فتح وإغلاق النموذج
  const openAddForm = () => {
    setEditingId(null);
    setForm(clone(emptyForm));
    setActiveTab('basic');
    setShowForm(true);
  };

  const handleEdit = (product: ExtendedProduct) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      price: product.price || 0,
      quantity: (product.variants || []).length > 0
        ? (product.variants as ProductVariant[]).reduce((s, v) => s + (v.quantity || 0), 0)
        : product.quantity || 0,
      category: product.category || '',
      minQuantity: product.minQuantity ?? 5,
      imageUrl: product.imageUrl || '',
      images: (product.images || []).map(img => ({
        ...img,
        id: img.id || createId(),
        isPrimary: img.isPrimary ?? false,
        sortOrder: img.sortOrder ?? 0,
      })),
      variants: (product.variants || []).map(v => ({
        ...v,
        id: v.id || createId(),
        costPrice: v.costPrice ?? 0,
        barcode: (v as any).barcode || '',
        isActive: v.isActive ?? true,
      })),
      barcode: product.barcode || '',
      brand: product.brand || '',
      weight_kg: product.weightKg ?? 0,
      tax_rate: product.taxRate ?? 0,
      sale_price: product.salePrice ?? 0,
      sale_start: product.saleStart || '',
      sale_end: product.saleEnd || '',
      sku: product.sku || '',
      description: product.description || '',
      cost_price: product.costPrice ?? 0,
      unit: product.unit || 'قطعة',
      is_active: product.isActive ?? true,
      tagsText: Array.isArray(product.tags) ? product.tags.join(', ') : '',
      supplierId: product.supplierId || '',
    });
    setActiveTab('basic');
    setShowForm(true);
  };

  // الصور
  const syncPrimaryImage = (images: ProductImage[]): ProductImage[] => {
    if (images.length === 0) return images;
    if (images.some(img => img.isPrimary)) return images;
    return images.map((img, idx) => ({ ...img, isPrimary: idx === 0 }));
  };

  const addImageFromUrl = (url: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    const newImages = syncPrimaryImage([
      ...form.images,
      {
        id: createId(),
        productId: '',
        url: cleanUrl,
        isPrimary: form.images.length === 0,
        sortOrder: form.images.length,
        createdAt: new Date().toISOString(),
      },
    ]).map((img, idx) => ({ ...img, sortOrder: idx }));
    setForm(prev => ({ ...prev, images: newImages }));
  };

  const addImagesFromFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setUploadingImages(true);
    try {
      const results = await Promise.all(
        fileArray.map(async (file, i) => ({
          id: createId(),
          productId: '',
          url: await uploadImageToCloudinary(file, getStoreId(), 'products'),
          isPrimary: false,
          sortOrder: form.images.length + i,
          createdAt: new Date().toISOString(),
        }))
      );
      const merged = syncPrimaryImage([...form.images, ...results])
        .map((img, idx) => ({ ...img, sortOrder: idx }));
      setForm(prev => ({ ...prev, images: merged }));
    } catch {
      alert(t('products.uploadFailed'));
    } finally {
      setUploadingImages(false);
    }
  };

  const onDropFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await addImagesFromFiles(files);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const next = form.images.filter((_, i) => i !== index);
    const updated = syncPrimaryImage(next).map((img, idx) => ({ ...img, sortOrder: idx }));
    setForm(prev => ({ ...prev, images: updated }));
  };

  const setPrimaryImage = (index: number) => {
    const updated = form.images.map((img, i) => ({ ...img, isPrimary: i === index }));
    setForm(prev => ({ ...prev, images: updated }));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= form.images.length) return;
    const next = [...form.images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const updated = next.map((img, idx) => ({ ...img, sortOrder: idx }));
    setForm(prev => ({ ...prev, images: updated }));
  };

  // المتغيرات
  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: createId(),
      productId: '',
      title: `${t('products.variant')} ${form.variants.length + 1}`,
      attributes: {},
      price: form.price,
      costPrice: 0,
      quantity: 0,
      sku: '',
      barcode: '',
      imageUrl: '',
      isActive: true,
      sortOrder: form.variants.length,
    };
    setForm(prev => ({ ...prev, variants: [...prev.variants, newVariant] }));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setForm(prev => {
      const next = [...prev.variants];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, variants: next };
    });
  };

  const updateVariantAttribute = (index: number, key: string, value: string) => {
    setForm(prev => {
      const next = [...prev.variants];
      next[index] = {
        ...next[index],
        attributes: { ...next[index].attributes, [key]: value },
      };
      return { ...prev, variants: next };
    });
  };

  const addVariantAttributeKey = (index: number) => {
    setForm(prev => {
      const next = [...prev.variants];
      const attrKeys = Object.keys(next[index].attributes);
      const baseKey = `${t('products.attribute')}_${attrKeys.length + 1}`;
      next[index] = {
        ...next[index],
        attributes: { ...next[index].attributes, [baseKey]: '' },
      };
      return { ...prev, variants: next };
    });
  };

  const removeVariant = (index: number) => {
    setForm(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  // حفظ المنتج (النموذج العادي)
  const handleSubmit = async () => {
    if (!form.name.trim() || form.price < 0) return;
    setSaving(true);
    try {
      const finalImages = syncPrimaryImage(form.images)
        .map((img, idx) => ({ ...img, sortOrder: idx }));

      const hasVariants = form.variants.length > 0;
      const totalQty = hasVariants
        ? form.variants.reduce((s, v) => s + (v.quantity || 0), 0)
        : form.quantity;

      const baseProduct = {
        storeId: getStoreId(),
        name: form.name.trim(),
        price: form.price,
        quantity: totalQty,
        category: form.category.trim(),
        minQuantity: form.minQuantity,
        imageUrl: finalImages.find(img => img.isPrimary)?.url || form.imageUrl || '',
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        costPrice: form.cost_price || undefined,
        salePrice: form.sale_price || undefined,
        saleStart: form.sale_start || undefined,
        saleEnd: form.sale_end || undefined,
        brand: form.brand || undefined,
        description: form.description || undefined,
        weightKg: form.weight_kg || undefined,
        taxRate: form.tax_rate || undefined,
        unit: form.unit,
        isActive: form.is_active,
        tags: form.tagsText.split(',').map(tag => tag.trim()).filter(Boolean),
        status: form.is_active ? 'published' : 'draft',
        supplierId: form.supplierId || undefined,
        images: finalImages.map(img => ({
          id: img.id,
          productId: '',
          url: img.url,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
          createdAt: new Date().toISOString(),
        })),
        variants: form.variants.map((v, idx) => ({
          id: v.id,
          productId: '',
          title: v.title,
          attributes: v.attributes,
          price: v.price,
          costPrice: v.costPrice || 0,
          quantity: v.quantity,
          sku: v.sku || undefined,
          barcode: v.barcode || undefined,
          imageUrl: v.imageUrl || undefined,
          isActive: v.isActive,
          sortOrder: idx,
        })),
      };

      if (editingId) {
        await api.updateProduct(editingId, baseProduct);
      } else {
        await api.addProduct(baseProduct);
      }

      await fetchProducts();
      setShowForm(false);
      setEditingId(null);
      setForm(clone(emptyForm));
    } catch (error) {
      console.error(t('products.saveError'), error);
      alert(t('products.saveErrorMsg'));
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // دالة الحفظ المباشر (handleSubmitDirect) - أضيفت بجانب handleSubmit
  // ══════════════════════════════════════════════════════════
  const handleSubmitDirect = async (directData: {
    name: string; price: number; quantity: number; category: string;
    minQuantity: number; imageUrl?: string; images: any[]; variants: any[];
    barcode?: string; brand?: string; weight_kg?: number; tax_rate?: number;
    sale_price?: number; sale_start?: string; sale_end?: string; sku?: string;
    description?: string; cost_price?: number; unit?: string; is_active?: boolean;
    tagsText?: string; supplierId?: string;
  }) => {
    if (!directData.name.trim()) return;
    setSaving(true);
    try {
      const finalImages = directData.images.map((img, idx) => ({ ...img, sortOrder: idx }));
      const hasVariants = directData.variants.length > 0;
      const totalQty = hasVariants
        ? directData.variants.reduce((s: number, v: any) => s + (v.quantity || 0), 0)
        : directData.quantity;

      const baseProduct = {
        storeId: getStoreId(),
        name: directData.name.trim(),
        price: directData.price,
        quantity: totalQty,
        category: directData.category.trim(),
        minQuantity: directData.minQuantity,
        imageUrl: finalImages.find((img: any) => img.isPrimary)?.url || directData.imageUrl || '',
        sku: directData.sku || undefined,
        barcode: directData.barcode || undefined,
        costPrice: directData.cost_price || undefined,
        salePrice: directData.sale_price || undefined,
        saleStart: directData.sale_start || undefined,
        saleEnd: directData.sale_end || undefined,
        brand: directData.brand || undefined,
        description: directData.description || undefined,
        weightKg: directData.weight_kg || undefined,
        taxRate: directData.tax_rate || undefined,
        unit: directData.unit || 'قطعة',
        isActive: directData.is_active !== false,
        tags: (directData.tagsText || '').split(',').map((tag: string) => tag.trim()).filter(Boolean),
        status: directData.is_active !== false ? 'published' : 'draft',
        supplierId: directData.supplierId || undefined,
        images: finalImages.map((img: any) => ({
          id: img.id, productId: '', url: img.url,
          isPrimary: img.isPrimary, sortOrder: img.sortOrder,
          createdAt: new Date().toISOString(),
        })),
        variants: directData.variants.map((v: any, idx: number) => ({
          id: v.id, productId: '', title: v.title,
          attributes: v.attributes,
          price: v.price, costPrice: v.costPrice || 0, quantity: v.quantity,
          sku: v.sku || undefined, barcode: v.barcode || undefined,
          imageUrl: v.imageUrl || undefined, isActive: v.isActive !== false, sortOrder: idx,
        })),
      };

      if (editingId) {
        await api.updateProduct(editingId, baseProduct);
      } else {
        await api.addProduct(baseProduct);
      }

      await fetchProducts();
      setShowForm(false);
      setEditingId(null);
      setForm(clone(emptyForm));
    } catch (error) {
      console.error('Save error:', error);
      alert(t('products.saveErrorMsg'));
    } finally {
      setSaving(false);
    }
  };

  // حذف
  const handleDelete = async (id: string) => {
    if (!confirm(t('products.deleteConfirm'))) return;
    try {
      await api.deleteProduct(id);
      await fetchProducts();
    } catch (error) {
      console.error(t('products.deleteError'), error);
      alert(t('products.deleteErrorMsg'));
    }
  };

  // تغيير الكمية السريع
  const handleQuantityChange = async (product: ExtendedProduct, delta: number) => {
    try {
      await api.addStockMovement(product.id, {
        type: 'adjustment',
        quantityChange: delta,
        note: delta > 0 ? t('products.stockIncrease') : t('products.stockDecrease'),
      });
      await fetchProducts();
    } catch (error) {
      console.error(t('products.quantityUpdateError'), error);
      alert(t('products.quantityUpdateErrorMsg'));
    }
  };

  // سجل المخزون
  const showStockLog = async (product: ExtendedProduct) => {
    setSelectedProductForLog(product);
    setMovementsData([]);
    setShowMovementModal(true);
    try {
      const movements = await api.getStockMovements(product.id);
      setMovementsData(movements);
    } catch {
      setMovementsData([]);
    }
  };

  const addStockMovement = async (
    productId: string,
    change: number,
    reason: MovementReason,
    note: string
  ) => {
    try {
      await api.addStockMovement(productId, { type: reason, quantityChange: change, note });
      const movements = await api.getStockMovements(productId);
      setMovementsData(movements);
      await fetchProducts();
      alert(t('products.movementSuccess'));
    } catch (error) {
      console.error(t('products.movementError'), error);
      alert(t('products.movementErrorMsg'));
    }
  };

  // ========== الفلاتر والترتيب (يجب أن تأتي قبل exportToExcel) ==========
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => (p.category || '').trim()).filter(Boolean));
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    let result = products.filter(p => {
      const effectiveQty = (p.variants || []).length > 0
        ? (p.variants as ProductVariant[]).reduce((s, v) => s + (v.quantity || 0), 0)
        : p.quantity || 0;
      const matchesSearch = !searchLower ||
        (p.name || '').toLowerCase().includes(searchLower) ||
        (p.category || '').toLowerCase().includes(searchLower) ||
        (p.sku || '').toLowerCase().includes(searchLower) ||
        (p.barcode || '').toLowerCase().includes(searchLower) ||
        (p.brand || '').toLowerCase().includes(searchLower) ||
        (p.description || '').toLowerCase().includes(searchLower);
      const matchesCategory = !filterCategory || p.category === filterCategory;
      const matchesLow = !filterLowStock || effectiveQty <= (p.minQuantity ?? 5);
      const matchesActive = filterActive === 'all'
        ? true
        : filterActive === 'active'
        ? p.isActive !== false
        : p.isActive === false;
      return matchesSearch && matchesCategory && matchesLow && matchesActive;
    });
    result.sort((a, b) => {
      switch (sortMode) {
        case 'name': return (a.name || '').localeCompare(b.name || '', 'ar');
        case 'price_asc': return (a.price || 0) - (b.price || 0);
        case 'price_desc': return (b.price || 0) - (a.price || 0);
        case 'stock_asc': {
          const qa = (a.variants || []).length > 0
            ? (a.variants as ProductVariant[]).reduce((s, v) => s + v.quantity, 0)
            : a.quantity || 0;
          const qb = (b.variants || []).length > 0
            ? (b.variants as ProductVariant[]).reduce((s, v) => s + v.quantity, 0)
            : b.quantity || 0;
          return qa - qb;
        }
        case 'stock_desc': {
          const qa = (a.variants || []).length > 0
            ? (a.variants as ProductVariant[]).reduce((s, v) => s + v.quantity, 0)
            : a.quantity || 0;
          const qb = (b.variants || []).length > 0
            ? (b.variants as ProductVariant[]).reduce((s, v) => s + v.quantity, 0)
            : b.quantity || 0;
          return qb - qa;
        }
        default: return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
    return result;
  }, [products, search, filterCategory, filterLowStock, filterActive, sortMode]);

  // ========== تصدير إلى Excel (بعد تعريف filteredProducts) ==========
  const exportToExcel = useCallback(() => {
    const exportData = filteredProducts.map(p => {
      const totalQty = (p.variants && p.variants.length > 0)
        ? p.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
        : (p.quantity || 0);
      let priceDisplay = '';
      if (p.variants && p.variants.length > 0) {
        const prices = p.variants.map(v => v.price).filter(pr => pr > 0);
        if (prices.length > 0) {
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          priceDisplay = min === max ? `${min} ر.س` : `${min} – ${max} ر.س`;
        } else {
          priceDisplay = `${p.price || 0} ر.س`;
        }
      } else {
        priceDisplay = `${p.price || 0} ر.س`;
      }
      const variantTitles = (p.variants || []).map(v => `${v.title} (${v.price} ر.س)`).join(', ');
      return {
        'الاسم': p.name || '',
        'السعر': priceDisplay,
        'المخزون الإجمالي': totalQty,
        'المتغيرات': variantTitles || '—',
        'الفئة': p.category || '—',
        'الماركة': p.brand || '—',
        'SKU': p.sku || '—',
        'الباركود': p.barcode || '—',
        'الحالة': p.isActive !== false ? 'نشط' : 'معطل',
        'تاريخ الإضافة': new Date(p.createdAt).toLocaleDateString('ar-SA'),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 30 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      { wch: 10 }, { wch: 15 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'المنتجات');
    XLSX.writeFile(workbook, `المنتجات_${new Date().toISOString().slice(0,19)}.xlsx`);
  }, [filteredProducts]);

  // باقي القيم المحسوبة
  const lowStockCount = useMemo(() => {
    return products.filter(p => {
      const qty = (p.variants || []).length > 0
        ? (p.variants as ProductVariant[]).reduce((s, v) => s + (v.quantity || 0), 0)
        : p.quantity || 0;
      return qty <= (p.minQuantity ?? 5);
    }).length;
  }, [products]);

  const activeCount = useMemo(() => products.filter(p => p.isActive !== false).length, [products]);
  const imageCount = useMemo(() => products.filter(p => (p.images?.length || 0) > 0 || !!p.imageUrl).length, [products]);
  const totalValue = useMemo(() => {
    return products.reduce((sum, p) => {
      if ((p.variants || []).length > 0) {
        return sum + (p.variants as ProductVariant[]).reduce((s, v) => s + (v.price || 0) * (v.quantity || 0), 0);
      }
      return sum + (p.price || 0) * (p.quantity || 0);
    }, 0);
  }, [products]);

  const getMainImage = (product: ExtendedProduct): string | null => {
    const images = product.images || [];
    const primary = images.find(img => img.isPrimary)?.url;
    return primary || images[0]?.url || product.imageUrl || null;
  };

  const productBadge = (product: ExtendedProduct) => {
    const effectiveQty = (product.variants || []).length > 0
      ? (product.variants as ProductVariant[]).reduce((s, v) => s + (v.quantity || 0), 0)
      : product.quantity || 0;
    const isLow = effectiveQty <= (product.minQuantity ?? 5);
    const isActive = product.isActive !== false;
    return (
      <div className="product-badges">
        <span className={`pill ${isActive ? 'pill-green' : 'pill-gray'}`}>
          {isActive ? t('products.active') : t('products.inactive')}
        </span>
        {isLow && <span className="pill pill-orange">{t('products.lowStock')}</span>}
        {(product.salePrice || 0) > 0 && <span className="pill pill-red">{t('products.discount')}</span>}
      </div>
    );
  };

  return {
    // الحالة العامة
    mode, viewMode, sortMode, products, loading, suppliers,
    // الفلاتر
    search, filterCategory, filterLowStock, filterActive, activeTab,
    // النموذج
    showForm, editingId, form, saving, uploadingImages, showScanner,
    // حركة المخزون
    selectedProductForLog, showMovementModal, movementReason, movementQuantity, movementNote, movementsData,
    // القيم المحسوبة
    categories, filteredProducts, lowStockCount, activeCount, imageCount, totalValue,
    // دوال التبديل
    toggleMode, toggleViewMode, changeSort,
    // فتح وإغلاق
    openAddForm, handleEdit, setShowForm, setShowScanner, setActiveTab,
    // الصور
    addImageFromUrl, onDropFileInput, removeImage, setPrimaryImage, moveImage,
    // المتغيرات
    addVariant, updateVariant, updateVariantAttribute, addVariantAttributeKey, removeVariant,
    // الحفظ والحذف
    handleSubmit, handleSubmitDirect, handleDelete, handleQuantityChange,
    // المخزون
    showStockLog, addStockMovement, setMovementReason, setMovementQuantity, setMovementNote, setSelectedProductForLog, setShowMovementModal,
    // الفلاتر
    setSearch, setFilterCategory, setFilterLowStock, setFilterActive,
    // أخرى
    setForm, fetchProducts, syncPrimaryImage, getMainImage, getInitials, productBadge,
    toNumber, generateEAN13, formatMoney, formatDate,
    // تصدير Excel
    exportToExcel,
    // الترجمة
    t,
  };
}