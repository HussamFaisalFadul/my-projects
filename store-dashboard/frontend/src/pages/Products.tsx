import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, Product as ApiProduct, socket, uploadImageToCloudinary, Supplier } from '../api';
import BarcodeScanner from '../BarcodeScanner';

interface ProductImage {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

interface Variant {
  id: string;
  title: string;
  attributes: Record<string, string>;
  price: number;
  quantity: number;
  sku?: string;
  image_url?: string;
}

type ExtendedProduct = Omit<ApiProduct, 'variants' | 'stockMovements'> & {
  images?: ProductImage[];
  variants?: Variant[];
  brand?: string;
  weight_kg?: number;
  tax_rate?: number;
  sale_price?: number;
  sale_start?: string;
  sale_end?: string;
  description?: string;
  cost_price?: number;
  unit?: string;
  is_active?: boolean;
  tagsText?: string;
  supplierId?: string; // إضافة حقل المورد
};

type ViewMode = 'grid' | 'table';
type ProductsMode = 'simple' | 'advanced';
type SortMode = 'newest' | 'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc';
type Tab = 'basic' | 'media' | 'pricing' | 'inventory' | 'variants' | 'movements';
type MovementReason = 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage';

const getStoreId = () => localStorage.getItem('store_id') || 'default';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const toNumber = (value: string | number) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(2)} ر.س`;
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-SA');
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return 'P';
  return parts.map(p => p[0]).join('').toUpperCase();
};

const createId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const generateEAN13 = () => {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const sum = digits.reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 1 : 3), 0);
  const checksum = (10 - (sum % 10)) % 10;
  return `${digits.join('')}${checksum}`;
};

const emptyForm = {
  name: '',
  price: 0,
  quantity: 0,
  category: '',
  minQuantity: 5,
  imageUrl: '',
  images: [] as ProductImage[],
  variants: [] as Variant[],
  barcode: '',
  brand: '',
  weight_kg: 0,
  tax_rate: 0,
  sale_price: 0,
  sale_start: '',
  sale_end: '',
  sku: '',
  description: '',
  cost_price: 0,
  unit: 'قطعة',
  is_active: true,
  tagsText: '',
  supplierId: '', // حقل المورد
};

type FormState = typeof emptyForm;

export default function Products() {
  const [mode, setMode] = useState<ProductsMode>(() => (localStorage.getItem('products_mode') as ProductsMode) || 'advanced');
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('products_view') as ViewMode) || 'grid');
  const [sortMode, setSortMode] = useState<SortMode>(() => (localStorage.getItem('products_sort') as SortMode) || 'newest');

  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(clone(emptyForm));
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [selectedProductForLog, setSelectedProductForLog] = useState<ExtendedProduct | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementReason, setMovementReason] = useState<MovementReason>('adjustment');
  const [movementQuantity, setMovementQuantity] = useState(0);
  const [movementNote, setMovementNote] = useState('');
  const [movementsData, setMovementsData] = useState<any[]>([]);

  // ===== حالة الموردين =====
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // ===== جلب المنتجات والموردين =====
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const productsData = await api.getProducts();
      setProducts(productsData as ExtendedProduct[]);
    } catch (error) {
      console.error('فشل تحميل المنتجات', error);
      alert('حدث خطأ أثناء تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    api.getSuppliers().then(setSuppliers).catch(console.error);
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
      quantity: product.quantity || 0,
      category: product.category || '',
      minQuantity: product.minQuantity ?? 5,
      imageUrl: product.imageUrl || '',
      images: (product.images || []).map(img => ({
        id: (img as any).id || createId(),
        url: (img as any).url || '',
        is_primary: (img as any).isPrimary ?? (img as any).is_primary ?? false,
        sort_order: (img as any).sortOrder ?? (img as any).sort_order ?? 0,
      })),
      variants: (product.variants || []).map((v: any) => ({
        id: v.id || createId(),
        title: v.title || '',
        attributes: v.attributes || {},
        price: v.price || 0,
        quantity: v.quantity || 0,
        sku: v.sku || '',
        image_url: v.imageUrl || v.image_url || '',
      })),
      barcode: product.barcode || '',
      brand: product.brand || '',
      weight_kg: product.weightKg ?? (product as any).weight_kg ?? 0,
      tax_rate: product.taxRate ?? (product as any).tax_rate ?? 0,
      sale_price: product.salePrice ?? (product as any).sale_price ?? 0,
      sale_start: product.saleStart || (product as any).sale_start || '',
      sale_end: product.saleEnd || (product as any).sale_end || '',
      sku: product.sku || '',
      description: product.description || '',
      cost_price: product.costPrice ?? (product as any).cost_price ?? 0,
      unit: product.unit || 'قطعة',
      is_active: product.isActive ?? (product as any).is_active ?? true,
      tagsText: Array.isArray(product.tags) ? product.tags.join(', ') : '',
      supplierId: product.supplierId || '', // قراءة المورد
    });
    setActiveTab('basic');
    setShowForm(true);
  };

  // ===== إدارة الصور =====
  const syncPrimaryImage = (images: ProductImage[]) => {
    if (images.length === 0) return images;
    const hasPrimary = images.some(img => img.is_primary);
    if (hasPrimary) return images;
    return images.map((img, idx) => ({ ...img, is_primary: idx === 0 }));
  };

  const addImageFromUrl = (url: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    const newImages = syncPrimaryImage([
      ...form.images,
      { id: createId(), url: cleanUrl, is_primary: form.images.length === 0, sort_order: form.images.length },
    ]).map((img, idx) => ({ ...img, sort_order: idx }));
    setForm(prev => ({ ...prev, images: newImages }));
  };

  const addImagesFromFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const storeId = getStoreId();
    setUploadingImages(true);
    try {
      const results = await Promise.all(
        fileArray.map(async (file, i) => {
          const url = await uploadImageToCloudinary(file, storeId, 'products');
          return {
            id: createId(),
            url,
            is_primary: false,
            sort_order: form.images.length + i,
          };
        })
      );
      const merged = syncPrimaryImage([...form.images, ...results])
        .map((img, idx) => ({ ...img, sort_order: idx }));
      setForm(prev => ({ ...prev, images: merged }));
    } catch (err) {
      alert('فشل رفع بعض الصور، تحقق من الاتصال وحاول مجدداً');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    const next = form.images.filter((_, i) => i !== index);
    const updated = syncPrimaryImage(next).map((img, idx) => ({ ...img, sort_order: idx }));
    setForm(prev => ({ ...prev, images: updated }));
  };

  const setPrimaryImage = (index: number) => {
    const updated = form.images.map((img, i) => ({ ...img, is_primary: i === index }));
    setForm(prev => ({ ...prev, images: updated }));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= form.images.length) return;
    const next = [...form.images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const updated = next.map((img, idx) => ({ ...img, sort_order: idx }));
    setForm(prev => ({ ...prev, images: updated }));
  };

  // ===== إدارة الـ Variants =====
  const addVariant = () => {
    const newVariant: Variant = {
      id: createId(),
      title: `متغير ${form.variants.length + 1}`,
      attributes: {},
      price: form.price,
      quantity: 0,
      sku: '',
      image_url: '',
    };
    setForm(prev => ({ ...prev, variants: [...prev.variants, newVariant] }));
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    setForm(prev => {
      const next = [...prev.variants];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, variants: next };
    });
  };

  const updateVariantAttribute = (index: number, key: string, value: string) => {
    setForm(prev => {
      const next = [...prev.variants];
      next[index] = { ...next[index], attributes: { ...next[index].attributes, [key]: value } };
      return { ...prev, variants: next };
    });
  };

  const addVariantAttributeKey = (index: number) => {
    setForm(prev => {
      const next = [...prev.variants];
      const attrKeys = Object.keys(next[index].attributes);
      const baseKey = `خاصية_${attrKeys.length + 1}`;
      next[index] = { ...next[index], attributes: { ...next[index].attributes, [baseKey]: '' } };
      return { ...prev, variants: next };
    });
  };

  const removeVariant = (index: number) => {
    setForm(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  };

  // ===== حفظ المنتج (مع إرسال supplierId) =====
  const handleSubmit = async () => {
    if (!form.name.trim() || form.price <= 0) return;
    setSaving(true);
    try {
      const finalImages = syncPrimaryImage(form.images)
        .map((img, idx) => ({ ...img, sort_order: idx }));

      const baseProduct = {
        name: form.name.trim(),
        price: form.price,
        quantity: form.quantity,
        category: form.category.trim(),
        minQuantity: form.minQuantity,
        imageUrl: finalImages.find(img => img.is_primary)?.url || form.imageUrl || '',
        storeId: getStoreId(),
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
        tags: form.tagsText.split(',').map(t => t.trim()).filter(Boolean),
        status: form.is_active ? 'published' : 'draft',
        supplierId: form.supplierId || null, // إرسال المورد
        images: finalImages.map(img => ({
          id: img.id,
          productId: '',
          url: img.url,
          isPrimary: img.is_primary,
          sortOrder: img.sort_order,
          createdAt: new Date().toISOString(),
        })),
        variants: form.variants.map((v, idx) => ({
          id: v.id,
          productId: '',
          title: v.title,
          attributes: v.attributes,
          price: v.price,
          costPrice: 0,
          quantity: v.quantity,
          sku: v.sku || undefined,
          imageUrl: v.image_url || undefined,
          isActive: true,
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
      console.error('خطأ في الحفظ', error);
      alert('حدث خطأ أثناء حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
      await api.deleteProduct(id);
      await fetchProducts();
    } catch (error) {
      console.error('خطأ في الحذف', error);
      alert('حدث خطأ أثناء حذف المنتج');
    }
  };

  const handleQuantityChange = async (product: ExtendedProduct, delta: number) => {
    try {
      await api.addStockMovement(product.id, {
        type: 'adjustment',
        quantityChange: delta,
        note: delta > 0 ? 'زيادة مخزون' : 'تعديل مخزون',
      });
      await fetchProducts();
    } catch (error) {
      console.error('خطأ في تحديث الكمية', error);
      alert('فشل تحديث الكمية');
    }
  };

  // ===== حركة المخزون =====
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

  const addStockMovement = async (productId: string, change: number, reason: MovementReason, note: string) => {
    try {
      await api.addStockMovement(productId, {
        type: reason,
        quantityChange: change,
        note,
      });
      const movements = await api.getStockMovements(productId);
      setMovementsData(movements);
      await fetchProducts();
      alert('تم تسجيل الحركة بنجاح');
    } catch (error) {
      console.error('خطأ في إضافة الحركة', error);
      alert('فشل تسجيل الحركة');
    }
  };

  // ===== الفلاتر والترتيب =====
  const categories = useMemo(() => {
    return [...new Set(products.map(p => (p.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    const result = products.filter(p => {
      const matchesSearch =
        !s ||
        (p.name || '').toLowerCase().includes(s) ||
        (p.category || '').toLowerCase().includes(s) ||
        (p.sku || '').toLowerCase().includes(s) ||
        (p.barcode || '').toLowerCase().includes(s) ||
        (p.brand || '').toLowerCase().includes(s) ||
        (p.description || '').toLowerCase().includes(s);
      const matchesCategory = !filterCategory || p.category === filterCategory;
      const matchesLow = !filterLowStock || (p.quantity || 0) <= (p.minQuantity ?? 5);
      const matchesActive =
        filterActive === 'all' ? true : filterActive === 'active' ? p.isActive !== false : p.isActive === false;
      return matchesSearch && matchesCategory && matchesLow && matchesActive;
    });

    return [...result].sort((a, b) => {
      switch (sortMode) {
        case 'name': return (a.name || '').localeCompare(b.name || '', 'ar');
        case 'price_asc': return (a.price || 0) - (b.price || 0);
        case 'price_desc': return (b.price || 0) - (a.price || 0);
        case 'stock_asc': return (a.quantity || 0) - (b.quantity || 0);
        case 'stock_desc': return (b.quantity || 0) - (a.quantity || 0);
        default: return Number(new Date(b.createdAt || 0)) - Number(new Date(a.createdAt || 0));
      }
    });
  }, [products, search, filterCategory, filterLowStock, filterActive, sortMode]);

  const lowStockCount = useMemo(() => products.filter(p => (p.quantity || 0) <= (p.minQuantity ?? 5)).length, [products]);
  const activeCount = useMemo(() => products.filter(p => p.isActive !== false).length, [products]);
  const imageCount = useMemo(() => products.filter(p => (p.images?.length || 0) > 0 || !!p.imageUrl).length, [products]);
  const totalValue = useMemo(() => products.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0), [products]);

  const getMainImage = (p: ExtendedProduct) => {
    const images = p.images || [];
    const primary = images.find((i: any) => i.isPrimary || i.is_primary)?.url;
    return primary || images[0]?.url || p.imageUrl || '';
  };

  const onDropFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await addImagesFromFiles(files);
    e.target.value = '';
  };

  const productBadge = (p: ExtendedProduct) => {
    const isLow = (p.quantity || 0) <= (p.minQuantity ?? 5);
    const isActive = p.isActive !== false;
    return (
      <div className="product-badges">
        <span className={`pill ${isActive ? 'pill-green' : 'pill-gray'}`}>{isActive ? 'نشط' : 'موقوف'}</span>
        {isLow && <span className="pill pill-orange">مخزون منخفض</span>}
        {(p.salePrice || 0) > 0 && <span className="pill pill-red">خصم</span>}
      </div>
    );
  };

  return (
    <div className="products-page" dir="rtl">
      {showScanner && (
        <BarcodeScanner
          onDetected={(code) => { setForm(prev => ({ ...prev, barcode: code })); setShowScanner(false); }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ===== Hero ===== */}
      <div className="hero-card">
        <div>
          <p className="eyebrow">إدارة المنتجات</p>
          <h1 className="page-title">المنتجات</h1>
          <p className="subtitle">صور حقيقية على Cloudinary، متغيرات وحركات مخزون محفوظة في قاعدة البيانات.</p>
        </div>
        <div className="hero-actions">
          <button className={`mode-toggle ${mode}`} onClick={toggleMode} type="button">
            {mode === 'simple' ? '⚡ بسيط' : '🧠 متقدم'}
          </button>
          <button className="view-toggle" onClick={toggleViewMode} type="button">
            {viewMode === 'grid' ? '☷ جدول' : '▣ بطاقات'}
          </button>
          <button className="btn-add" onClick={openAddForm} type="button">+ منتج جديد</button>
        </div>
      </div>

      {/* ===== إحصائيات ===== */}
      <div className="stats-grid">
        <div className="stat-card"><span>عدد المنتجات</span><strong>{products.length}</strong></div>
        <div className="stat-card"><span>نشطة</span><strong>{activeCount}</strong></div>
        <div className="stat-card warning"><span>مخزون منخفض</span><strong>{lowStockCount}</strong></div>
        <div className="stat-card"><span>بصور</span><strong>{imageCount}</strong></div>
        <div className="stat-card"><span>إجمالي القيمة</span><strong>{formatMoney(totalValue)}</strong></div>
      </div>

      {/* ===== فلاتر ===== */}
      <div className="filters-panel">
        <input
          className="search-input"
          placeholder="ابحث بالاسم أو SKU أو الباركود..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">كل التصنيفات</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filterActive} onChange={e => setFilterActive(e.target.value as any)}>
          <option value="all">كل الحالات</option>
          <option value="active">نشطة</option>
          <option value="inactive">موقوفة</option>
        </select>
        <select className="filter-select" value={sortMode} onChange={e => changeSort(e.target.value as SortMode)}>
          <option value="newest">الأحدث</option>
          <option value="name">الاسم</option>
          <option value="price_asc">السعر: من الأقل</option>
          <option value="price_desc">السعر: من الأعلى</option>
          <option value="stock_asc">المخزون: من الأقل</option>
          <option value="stock_desc">المخزون: من الأعلى</option>
        </select>
        <button className={`filter-low-btn ${filterLowStock ? 'active' : ''}`} onClick={() => setFilterLowStock(v => !v)} type="button">
          {filterLowStock ? '✅' : '⚠️'} مخزون منخفض
        </button>
      </div>

      {/* ===== المحتوى ===== */}
      {loading ? (
        <div className="loading-box">جار التحميل...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>لا توجد منتجات مطابقة</h3>
          <p>جرّب تغيير البحث أو الفلاتر أو أضف منتجًا جديدًا.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="products-grid">
          {filteredProducts.map(p => {
            const isLow = (p.quantity || 0) <= (p.minQuantity ?? 5);
            const mainImage = getMainImage(p);
            const imagesCount = (p.images || []).length;
            const hasSale = (p.salePrice || 0) > 0 && (p.salePrice || 0) < (p.price || 0);
            return (
              <article key={p.id} className={`product-card ${isLow ? 'low' : ''} ${p.isActive === false ? 'inactive' : ''}`}>
                <div className="card-media">
                  {mainImage ? <img src={mainImage} alt={p.name} /> : <div className="no-image">{getInitials(p.name || 'P')}</div>}
                  <div className="media-overlay">
                    {imagesCount > 1 && <span className="overlay-badge">+{imagesCount - 1} صور</span>}
                    <div className="quick-actions">
                      <button type="button" onClick={() => handleEdit(p)}>✏️</button>
                      <button type="button" onClick={() => showStockLog(p)}>📋</button>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {productBadge(p)}
                  <h3 title={p.name}>{p.name}</h3>
                  <p className="card-subtitle">{p.category || 'بدون تصنيف'}</p>
                  <div className="price-row">
                    {hasSale ? (
                      <><strong className="sale-price">{formatMoney(p.salePrice)}</strong><span className="old-price">{formatMoney(p.price)}</span></>
                    ) : (
                      <strong>{formatMoney(p.price)}</strong>
                    )}
                  </div>
                  <div className="meta-grid">
                    <div><span>المخزون</span><strong>{p.quantity || 0}</strong></div>
                    <div><span>الحد الأدنى</span><strong>{p.minQuantity ?? 5}</strong></div>
                    <div><span>SKU</span><strong>{p.sku || '—'}</strong></div>
                    <div><span>باركود</span><strong>{p.barcode || '—'}</strong></div>
                  </div>
                  {mode === 'advanced' && (
                    <div className="extra-lines">
                      <div><span>العلامة</span><strong>{p.brand || '—'}</strong></div>
                      <div><span>التكلفة</span><strong>{formatMoney(p.costPrice)}</strong></div>
                      <div><span>الضريبة</span><strong>{p.taxRate ? `${p.taxRate}%` : '—'}</strong></div>
                    </div>
                  )}
                </div>
                <div className="card-footer">
                  <div className="qty-control">
                    <button type="button" onClick={() => handleQuantityChange(p, -1)}>−</button>
                    <span className={`qty-badge ${isLow ? 'qty-low' : 'qty-ok'}`}>{p.quantity || 0}</span>
                    <button type="button" onClick={() => handleQuantityChange(p, 1)}>+</button>
                  </div>
                  <div className="action-row">
                    <button className="btn-secondary" type="button" onClick={() => handleEdit(p)}>تعديل</button>
                    <button className="btn-ghost" type="button" onClick={() => showStockLog(p)}>سجل</button>
                    <button className="btn-danger" type="button" onClick={() => handleDelete(p.id)}>حذف</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="table-shell">
          <table className="products-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>السعر</th>
                <th>المخزون</th>
                <th>التصنيف</th>
                <th>الحالة</th>
                {mode === 'advanced' && <th>SKU</th>}
                {mode === 'advanced' && <th>باركود</th>}
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const isLow = (p.quantity || 0) <= (p.minQuantity ?? 5);
                const image = getMainImage(p);
                return (
                  <tr key={p.id} className={isLow ? 'row-low-stock' : ''}>
                    <td>
                      <div className="product-name-cell">
                        {image ? <img src={image} alt={p.name} className="product-thumb" /> : <div className="thumb-fallback">{getInitials(p.name || 'P')}</div>}
                        <div>
                          <strong>{p.name}</strong>
                          {mode === 'advanced' && <div className="muted">{p.brand || '—'}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {((p.salePrice || 0) > 0 && (p.salePrice || 0) < (p.price || 0)) ? (
                        <div className="price-compact">
                          <strong className="sale-price">{formatMoney(p.salePrice)}</strong>
                          <span className="old-price">{formatMoney(p.price)}</span>
                        </div>
                      ) : (
                        <strong>{formatMoney(p.price)}</strong>
                      )}
                    </td>
                    <td>
                      <div className="quantity-control">
                        <button onClick={() => handleQuantityChange(p, -1)} type="button">−</button>
                        <span className={`qty-badge ${isLow ? 'qty-low' : 'qty-ok'}`}>{p.quantity || 0}</span>
                        <button onClick={() => handleQuantityChange(p, 1)} type="button">+</button>
                      </div>
                    </td>
                    <td>{p.category || '—'}</td>
                    <td>{p.isActive === false ? 'موقوف' : 'نشط'}</td>
                    {mode === 'advanced' && <td>{p.sku || '—'}</td>}
                    {mode === 'advanced' && <td>{p.barcode || '—'}</td>}
                    <td>
                      <div className="action-btns">
                        <button className="btn-edit" onClick={() => handleEdit(p)} type="button">تعديل</button>
                        <button className="btn-log" onClick={() => showStockLog(p)} type="button">سجل</button>
                        <button className="btn-delete" onClick={() => handleDelete(p.id)} type="button">حذف</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== مودال سجل الحركات ===== */}
      {showMovementModal && selectedProductForLog && (
        <div className="modal-overlay" onClick={() => setShowMovementModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">سجل الحركات</p>
                <h2>{selectedProductForLog.name}</h2>
              </div>
              <button className="modal-close" onClick={() => setShowMovementModal(false)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <table className="movements-table">
                <thead>
                  <tr><th>التاريخ</th><th>التغيير</th><th>قبل</th><th>بعد</th><th>النوع</th><th>ملاحظة</th></tr>
                </thead>
                <tbody>
                  {movementsData.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>لا توجد حركات مسجلة</td></tr>
                  )}
                  {movementsData.map((m: any) => (
                    <tr key={m.id}>
                      <td>{formatDate(m.createdAt)}</td>
                      <td className={m.quantityChange > 0 ? 'positive' : 'negative'}>{m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}</td>
                      <td>{m.quantityBefore}</td>
                      <td>{m.quantityAfter}</td>
                      <td>{m.type}</td>
                      <td>{m.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="add-movement-form">
                <h4>تسجيل حركة جديدة</h4>
                <div className="movement-grid">
                  <input
                    type="number"
                    placeholder="الكمية (+/-)"
                    value={movementQuantity}
                    onChange={e => setMovementQuantity(toNumber(e.target.value))}
                  />
                  <select value={movementReason} onChange={e => setMovementReason(e.target.value as MovementReason)}>
                    <option value="purchase">شراء</option>
                    <option value="sale">بيع</option>
                    <option value="return">مرتجع</option>
                    <option value="adjustment">تعديل</option>
                    <option value="damage">تلف</option>
                  </select>
                </div>
                <input placeholder="ملاحظة" value={movementNote} onChange={e => setMovementNote(e.target.value)} />
                <button
                  type="button"
                  className="btn-save-inline"
                  onClick={async () => {
                    await addStockMovement(selectedProductForLog.id, movementQuantity, movementReason, movementNote);
                    setMovementQuantity(0);
                    setMovementNote('');
                  }}
                >
                  تسجيل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال إضافة/تعديل المنتج ===== */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header sticky">
              <div>
                <p className="modal-kicker">{editingId ? 'تعديل منتج' : 'منتج جديد'}</p>
                <h2>{editingId ? 'تحرير المنتج' : 'إنشاء منتج احترافي'}</h2>
              </div>
              <button className="modal-close" onClick={() => setShowForm(false)} type="button">✕</button>
            </div>

            <div className="modal-tabs">
              <button className={activeTab === 'basic' ? 'active' : ''} onClick={() => setActiveTab('basic')} type="button">الأساسيات</button>
              <button className={activeTab === 'media' ? 'active' : ''} onClick={() => setActiveTab('media')} type="button">
                الصور {form.images.length > 0 && `(${form.images.length})`}
              </button>
              <button className={activeTab === 'pricing' ? 'active' : ''} onClick={() => setActiveTab('pricing')} type="button">الأسعار</button>
              <button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => setActiveTab('inventory')} type="button">المخزون</button>
              {mode === 'advanced' && (
                <button className={activeTab === 'variants' ? 'active' : ''} onClick={() => setActiveTab('variants')} type="button">
                  المتغيرات {form.variants.length > 0 && `(${form.variants.length})`}
                </button>
              )}
            </div>

            <form className="product-form" onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
              {/* تبويب الأساسيات */}
              {activeTab === 'basic' && (
                <div className="form-section">
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>اسم المنتج *</label>
                      <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="form-row">
                      <label>التصنيف</label>
                      <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>الباركود</label>
                      <div className="input-with-button">
                        <input
                          value={form.barcode}
                          onChange={e => setForm({ ...form, barcode: e.target.value })}
                          placeholder="يمكن إدخاله يدويًا أو مسحه"
                        />
                        <button type="button" onClick={() => setShowScanner(true)} className="btn-scan">📷</button>
                        <button type="button" onClick={() => setForm({ ...form, barcode: generateEAN13() })}>توليد</button>
                      </div>
                    </div>
                    <div className="form-row">
                      <label>SKU</label>
                      <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>العلامة التجارية</label>
                      <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
                    </div>
                    <div className="form-row">
                      <label>الوحدة</label>
                      <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                        <option>قطعة</option>
                        <option>كيلو</option>
                        <option>لتر</option>
                        <option>متر</option>
                        <option>علبة</option>
                        <option>كرتون</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>المورد</label>
                      <select
                        value={form.supplierId}
                        onChange={e => setForm({ ...form, supplierId: e.target.value })}
                      >
                        <option value="">— بدون مورد —</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row form-row-checkbox">
                      <label>
                        <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                        المنتج نشط
                      </label>
                    </div>
                  </div>
                  <div className="form-row">
                    <label>الوصف</label>
                    <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>الوسوم (مفصولة بفاصلة)</label>
                      <input value={form.tagsText} onChange={e => setForm({ ...form, tagsText: e.target.value })} placeholder="مثال: جديد, مميز" />
                    </div>
                  </div>
                </div>
              )}

              {/* تبويب الصور */}
              {activeTab === 'media' && (
                <div className="form-section">
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>إضافة صورة من رابط</label>
                      <div className="input-with-button">
                        <input id="newImageUrl" type="url" placeholder="https://..." />
                        <button type="button" onClick={() => {
                          const input = document.getElementById('newImageUrl') as HTMLInputElement | null;
                          if (!input || !input.value.trim()) return;
                          addImageFromUrl(input.value);
                          input.value = '';
                        }}>إضافة</button>
                      </div>
                    </div>
                    <div className="form-row">
                      <label>رفع صور من الجهاز {uploadingImages && '⏳ جاري الرفع...'}</label>
                      <input type="file" multiple accept="image/*" onChange={onDropFileInput} disabled={uploadingImages} />
                      <small style={{ color: '#6b7280' }}>الصور ترفع مباشرة على Cloudinary ✅</small>
                    </div>
                  </div>
                  {uploadingImages && (
                    <div className="upload-progress">⏳ جاري رفع الصور على Cloudinary...</div>
                  )}
                  <div className="images-grid">
                    {form.images.map((img, idx) => (
                      <div key={img.id} className="image-item">
                        <div className="image-wrap">
                          <img src={img.url} alt={`صورة ${idx + 1}`} />
                          {img.is_primary && <span className="primary-badge">رئيسية</span>}
                        </div>
                        <div className="image-actions">
                          <button type="button" onClick={() => setPrimaryImage(idx)} className={img.is_primary ? 'active' : ''} title="تعيين كرئيسية">⭐</button>
                          <button type="button" onClick={() => moveImage(idx, idx - 1)} disabled={idx === 0}>⬆️</button>
                          <button type="button" onClick={() => moveImage(idx, idx + 1)} disabled={idx === form.images.length - 1}>⬇️</button>
                          <button type="button" onClick={() => removeImage(idx)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                    {form.images.length === 0 && !uploadingImages && (
                      <p className="muted-box">لا توجد صور بعد. أضف من رابط أو ارفع من جهازك.</p>
                    )}
                  </div>
                </div>
              )}

              {/* تبويب الأسعار */}
              {activeTab === 'pricing' && (
                <div className="form-section">
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>السعر الأساسي *</label>
                      <input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: toNumber(e.target.value) })} />
                    </div>
                    <div className="form-row">
                      <label>سعر البيع (بعد الخصم)</label>
                      <input type="number" min="0" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: toNumber(e.target.value) })} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>سعر التكلفة</label>
                      <input type="number" min="0" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: toNumber(e.target.value) })} />
                    </div>
                    <div className="form-row">
                      <label>نسبة الضريبة %</label>
                      <input type="number" min="0" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: toNumber(e.target.value) })} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>بداية الخصم</label>
                      <input type="datetime-local" value={form.sale_start} onChange={e => setForm({ ...form, sale_start: e.target.value })} />
                    </div>
                    <div className="form-row">
                      <label>نهاية الخصم</label>
                      <input type="datetime-local" value={form.sale_end} onChange={e => setForm({ ...form, sale_end: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {/* تبويب المخزون */}
              {activeTab === 'inventory' && (
                <div className="form-section">
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>الكمية الحالية *</label>
                      <input type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: toNumber(e.target.value) })} />
                    </div>
                    <div className="form-row">
                      <label>الحد الأدنى للتنبيه</label>
                      <input type="number" min="0" value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: toNumber(e.target.value) })} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>الوزن (كجم)</label>
                      <input type="number" min="0" step="0.01" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: toNumber(e.target.value) })} />
                    </div>
                    <div className="form-row">
                      <label>حالة المنتج</label>
                      <select value={String(form.is_active)} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                        <option value="true">نشط</option>
                        <option value="false">موقوف</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* تبويب المتغيرات */}
              {activeTab === 'variants' && mode === 'advanced' && (
                <div className="form-section">
                  <div className="section-head">
                    <h4>المتغيرات (مقاسات / ألوان / ...)</h4>
                    <button type="button" onClick={addVariant}>+ أضف متغير</button>
                  </div>
                  <div className="variants-list">
                    {form.variants.map((v, idx) => (
                      <div key={v.id} className="variant-item">
                        <div className="form-grid-2">
                          <div className="form-row">
                            <label>اسم المتغير</label>
                            <input value={v.title} onChange={e => updateVariant(idx, 'title', e.target.value)} placeholder="مثال: أحمر / L" />
                          </div>
                          <div className="form-row">
                            <label>SKU</label>
                            <input value={v.sku || ''} onChange={e => updateVariant(idx, 'sku', e.target.value)} />
                          </div>
                        </div>
                        <div className="form-grid-2">
                          <div className="form-row">
                            <label>السعر</label>
                            <input type="number" min="0" value={v.price} onChange={e => updateVariant(idx, 'price', toNumber(e.target.value))} />
                          </div>
                          <div className="form-row">
                            <label>الكمية</label>
                            <input type="number" min="0" value={v.quantity} onChange={e => updateVariant(idx, 'quantity', toNumber(e.target.value))} />
                          </div>
                        </div>
                        <div className="attributes-box">
                          <div className="attributes-head">
                            <strong>السمات</strong>
                            <button type="button" onClick={() => addVariantAttributeKey(idx)}>+ سمة</button>
                          </div>
                          {Object.entries(v.attributes).map(([key, value]) => (
                            <div className="attribute-row" key={key}>
                              <input value={key} disabled className="attr-key" />
                              <input value={value} onChange={e => updateVariantAttribute(idx, key, e.target.value)} placeholder="القيمة" />
                            </div>
                          ))}
                          {Object.keys(v.attributes).length === 0 && (
                            <p className="muted-box" style={{ margin: 0, fontSize: '13px' }}>اضغط "+ سمة" لإضافة خاصية كاللون أو المقاس</p>
                          )}
                        </div>
                        <div className="variant-actions">
                          <button type="button" onClick={() => removeVariant(idx)}>حذف المتغير</button>
                        </div>
                      </div>
                    ))}
                    {form.variants.length === 0 && (
                      <p className="muted-box">لا توجد متغيرات بعد. اضغط "+ أضف متغير" للبدء.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>إلغاء</button>
                <button type="submit" className="btn-save" disabled={saving || uploadingImages}>
                  {uploadingImages ? '⏳ جاري رفع الصور...' : saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        :root {
          --bg: #f5f7fb;
          --card: #ffffff;
          --text: #172033;
          --muted: #6b7280;
          --line: #e5e7eb;
          --brand: #4361ee;
          --brand-2: #7c3aed;
          --green: #10b981;
          --orange: #f59e0b;
          --red: #ef4444;
          --shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }

        .products-page {
          padding: 24px;
          color: var(--text);
          background:
            radial-gradient(circle at top right, rgba(67,97,238,0.08), transparent 28%),
            radial-gradient(circle at top left, rgba(124,58,237,0.08), transparent 24%),
            var(--bg);
          min-height: 100%;
          font-family: 'Segoe UI', Tahoma, sans-serif;
        }

        .hero-card { background: linear-gradient(135deg, #fff 0%, #f8fbff 100%); border: 1px solid rgba(229,231,235,0.9); border-radius: 24px; padding: 20px 22px; margin-bottom: 18px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; box-shadow: var(--shadow); }
        .eyebrow { margin: 0 0 6px; color: var(--brand); font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        .page-title { margin: 0; font-size: 30px; line-height: 1.2; }
        .subtitle { margin: 8px 0 0; color: var(--muted); max-width: 760px; line-height: 1.7; }
        .hero-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

        .btn-add, .mode-toggle, .view-toggle, .btn-save, .btn-cancel, .btn-secondary, .btn-ghost, .btn-danger, .btn-save-inline { border: none; border-radius: 14px; padding: 11px 16px; cursor: pointer; font-weight: 700; transition: transform .15s ease, box-shadow .15s ease; }
        .btn-add, .btn-save, .btn-save-inline { background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff; }
        .btn-add:hover, .btn-save:hover, .btn-save-inline:hover, .btn-secondary:hover, .btn-ghost:hover, .btn-danger:hover, .mode-toggle:hover, .view-toggle:hover { transform: translateY(-1px); }
        .mode-toggle.simple { background: #eef2ff; color: var(--brand); }
        .mode-toggle.advanced { background: #f3e8ff; color: #6b21a8; }
        .view-toggle { background: #fff; border: 1px solid var(--line); color: var(--text); }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 18px; }
        .stat-card { background: var(--card); border-radius: 18px; padding: 14px 16px; border: 1px solid rgba(229,231,235,.9); box-shadow: var(--shadow); }
        .stat-card span { display: block; color: var(--muted); font-size: 13px; margin-bottom: 8px; }
        .stat-card strong { font-size: 24px; }
        .stat-card.warning strong { color: var(--orange); }

        .filters-panel { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; background: rgba(255,255,255,.9); border: 1px solid rgba(229,231,235,.9); border-radius: 20px; padding: 14px; margin-bottom: 18px; backdrop-filter: blur(8px); box-shadow: var(--shadow); }
        .search-input, .filter-select { border: 1px solid var(--line); border-radius: 14px; background: #fff; padding: 11px 14px; outline: none; transition: border .15s ease, box-shadow .15s ease; }
        .search-input:focus, .filter-select:focus { border-color: rgba(67,97,238,.8); box-shadow: 0 0 0 4px rgba(67,97,238,.10); }
        .search-input { flex: 1 1 320px; }
        .filter-select { flex: 0 1 180px; }
        .filter-low-btn { border: 1px solid var(--line); background: #fff; border-radius: 14px; padding: 11px 14px; cursor: pointer; font-weight: 700; }
        .filter-low-btn.active { background: #fff7ed; border-color: #fdba74; color: #b45309; }

        .loading-box, .empty-state { background: var(--card); border-radius: 22px; padding: 42px 20px; text-align: center; border: 1px solid rgba(229,231,235,.9); box-shadow: var(--shadow); }
        .empty-icon { font-size: 44px; margin-bottom: 10px; }
        .empty-state h3 { margin: 0 0 8px; }
        .empty-state p { margin: 0; color: var(--muted); }

        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .product-card { background: var(--card); border-radius: 22px; overflow: hidden; border: 1px solid rgba(229,231,235,.9); display: flex; flex-direction: column; box-shadow: var(--shadow); }
        .product-card.low { border-color: rgba(245,158,11,.45); }
        .product-card.inactive { opacity: .78; }

        .card-media { position: relative; height: 210px; background: linear-gradient(135deg, #eef2ff, #f8fafc); overflow: hidden; }
        .card-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .no-image { width: 100%; height: 100%; display: grid; place-items: center; font-size: 38px; color: #64748b; font-weight: 800; }
        .media-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 12px; background: linear-gradient(180deg, rgba(2,6,23,.04), rgba(2,6,23,.30)); pointer-events: none; }
        .overlay-badge { display: inline-flex; align-items: center; width: fit-content; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700; color: #fff; background: rgba(15,23,42,.55); backdrop-filter: blur(6px); }
        .quick-actions { display: flex; justify-content: flex-end; gap: 8px; pointer-events: auto; }
        .quick-actions button { border: none; width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,.92); cursor: pointer; box-shadow: 0 8px 20px rgba(15,23,42,.14); }

        .card-body { padding: 14px 14px 12px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .product-badges { display: flex; gap: 8px; flex-wrap: wrap; }
        .pill { display: inline-flex; align-items: center; width: fit-content; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700; }
        .pill-green { background: #dcfce7; color: #166534; }
        .pill-orange { background: #ffedd5; color: #9a3412; }
        .pill-red { background: #fee2e2; color: #991b1b; }
        .pill-gray { background: #e5e7eb; color: #374151; }
        .card-body h3 { margin: 0; font-size: 18px; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .card-subtitle, .muted { margin: 0; color: var(--muted); font-size: 13px; }
        .price-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .sale-price { color: #dc2626; font-size: 18px; }
        .old-price { color: var(--muted); text-decoration: line-through; font-size: 13px; }
        .meta-grid, .extra-lines { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .meta-grid div, .extra-lines div { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 14px; padding: 10px; }
        .meta-grid span, .extra-lines span { display: block; color: var(--muted); font-size: 12px; margin-bottom: 4px; }
        .meta-grid strong, .extra-lines strong { display: block; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .card-footer { padding: 0 14px 14px; display: flex; flex-direction: column; gap: 10px; }
        .qty-control, .quantity-control { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .qty-control button, .quantity-control button { width: 34px; height: 34px; border-radius: 12px; border: 1px solid var(--line); background: #fff; cursor: pointer; font-size: 18px; }
        .qty-badge { min-width: 64px; text-align: center; padding: 7px 10px; border-radius: 999px; font-weight: 800; }
        .qty-ok { background: #dcfce7; color: #166534; }
        .qty-low { background: #fee2e2; color: #991b1b; }
        .action-row, .action-btns { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn-secondary, .btn-ghost, .btn-danger, .btn-edit, .btn-log, .btn-delete { padding: 9px 12px; border-radius: 12px; font-size: 13px; font-weight: 700; }
        .btn-secondary, .btn-edit { background: #eef2ff; color: var(--brand); border: none; }
        .btn-ghost, .btn-log { background: #f8fafc; color: #334155; border: none; }
        .btn-danger, .btn-delete { background: #fff1f2; color: #be123c; border: none; }

        .table-shell { background: var(--card); border-radius: 22px; overflow: auto; border: 1px solid rgba(229,231,235,.9); box-shadow: var(--shadow); }
        .products-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .products-table th, .products-table td { padding: 14px 16px; text-align: right; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .products-table th { background: #f8fafc; color: #334155; font-size: 13px; white-space: nowrap; }
        .row-low-stock td { background: #fffbeb; }
        .product-name-cell { display: flex; align-items: center; gap: 12px; }
        .product-thumb { width: 50px; height: 50px; border-radius: 14px; object-fit: cover; flex-shrink: 0; }
        .thumb-fallback { width: 50px; height: 50px; border-radius: 14px; background: #e2e8f0; display: grid; place-items: center; font-weight: 800; color: #475569; flex-shrink: 0; }
        .price-compact { display: flex; flex-direction: column; gap: 2px; }

        .sticky { position: sticky; top: 0; z-index: 2; background: #fff; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.56); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 1000; backdrop-filter: blur(3px); }
        .modal { width: min(1180px, 100%); max-height: 92vh; overflow: auto; background: #fff; border-radius: 26px; border: 1px solid rgba(229,231,235,.9); box-shadow: 0 30px 60px rgba(15,23,42,.2); }
        .large-modal { width: min(1240px, 100%); }
        .modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 22px; border-bottom: 1px solid #eef2f7; }
        .modal-kicker { margin: 0 0 4px; color: var(--brand); font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
        .modal-header h2 { margin: 0; font-size: 22px; }
        .modal-close { width: 42px; height: 42px; border-radius: 14px; border: 1px solid var(--line); background: #fff; cursor: pointer; font-size: 18px; }
        .modal-body { padding: 20px 22px; }
        .modal-tabs { display: flex; gap: 8px; padding: 0 22px; border-bottom: 1px solid #eef2f7; overflow-x: auto; }
        .modal-tabs button { border: none; background: transparent; cursor: pointer; padding: 14px 6px; white-space: nowrap; color: var(--muted); font-weight: 700; border-bottom: 2px solid transparent; }
        .modal-tabs button.active { color: var(--brand); border-bottom-color: var(--brand); }

        .product-form { padding: 20px 22px 22px; }
        .form-section { display: flex; flex-direction: column; gap: 16px; }
        .form-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .form-row { display: flex; flex-direction: column; gap: 7px; }
        .form-row label { font-weight: 700; color: #334155; font-size: 14px; }
        .form-row input, .form-row select, .form-row textarea, .add-movement-form input, .add-movement-form select { width: 100%; border: 1px solid var(--line); border-radius: 14px; background: #fff; padding: 11px 14px; outline: none; transition: border .15s ease, box-shadow .15s ease; box-sizing: border-box; }
        .form-row input:focus, .form-row select:focus, .form-row textarea:focus, .add-movement-form input:focus, .add-movement-form select:focus { border-color: rgba(67,97,238,.8); box-shadow: 0 0 0 4px rgba(67,97,238,.10); }
        .form-row textarea { resize: vertical; min-height: 110px; }
        .form-row-checkbox label { display: flex; align-items: center; gap: 10px; margin-top: 30px; background: #f8fafc; border: 1px solid #eef2f7; padding: 13px 14px; border-radius: 14px; cursor: pointer; }

        .input-with-button { display: flex; gap: 8px; }
        .input-with-button input { flex: 1; border: 1px solid var(--line); border-radius: 14px; background: #fff; padding: 11px 14px; outline: none; }
        .input-with-button button { border: none; padding: 11px 16px; border-radius: 14px; background: #eef2ff; color: var(--brand); font-weight: 800; cursor: pointer; white-space: nowrap; }
        .btn-scan { background: linear-gradient(135deg, var(--brand), var(--brand-2)) !important; color: #fff !important; }

        .upload-progress { background: #eef2ff; border-radius: 14px; padding: 12px 16px; color: var(--brand); font-weight: 700; text-align: center; }
        .images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }
        .image-item { border: 1px solid var(--line); border-radius: 18px; background: #fff; overflow: hidden; }
        .image-wrap { position: relative; height: 140px; background: #f8fafc; }
        .image-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .primary-badge { position: absolute; top: 10px; right: 10px; background: rgba(245,158,11,.95); color: #fff; border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 700; }
        .image-actions { display: flex; gap: 6px; padding: 8px; justify-content: center; flex-wrap: wrap; }
        .image-actions button { width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--line); background: #fff; cursor: pointer; font-size: 14px; }
        .image-actions button.active { background: #fbbf24; border-color: #f59e0b; }

        .section-head, .attributes-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .section-head h4 { margin: 0; font-size: 16px; }
        .section-head button, .attributes-head button { border: none; background: #eef2ff; color: var(--brand); border-radius: 12px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
        .variant-item { border: 1px solid var(--line); border-radius: 18px; padding: 14px; background: #fff; display: flex; flex-direction: column; gap: 12px; }
        .attributes-box { border-radius: 16px; background: #f8fafc; border: 1px solid #eef2f7; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        .attribute-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .attribute-row input { border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; outline: none; box-sizing: border-box; }
        .attr-key { background: #eef2f7 !important; color: #475569 !important; }
        .variant-actions { display: flex; justify-content: flex-start; }
        .variant-actions button { border: none; background: #fff1f2; color: #be123c; border-radius: 12px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
        .variants-list { display: flex; flex-direction: column; gap: 12px; }
        .muted-box { margin: 0; padding: 16px; border-radius: 16px; background: #f8fafc; color: var(--muted); border: 1px dashed #dbe2ea; }

        .movements-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; }
        .movements-table th, .movements-table td { padding: 10px 12px; border-bottom: 1px solid #eef2f7; text-align: right; font-size: 13px; }
        .movements-table th { background: #f8fafc; }
        .positive { color: var(--green); font-weight: 800; }
        .negative { color: var(--red); font-weight: 800; }
        .add-movement-form { margin-top: 16px; padding-top: 16px; border-top: 1px solid #eef2f7; display: flex; flex-direction: column; gap: 12px; }
        .add-movement-form h4 { margin: 0; }
        .movement-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }

        .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; padding-top: 18px; border-top: 1px solid #eef2f7; }
        .btn-cancel { background: #fff; border: 1px solid var(--line); color: var(--text); }
        .btn-save:disabled { opacity: .65; cursor: not-allowed; }

        @media (max-width: 900px) {
          .form-grid-2, .movement-grid, .attribute-row { grid-template-columns: 1fr; }
          .hero-card { padding: 18px; }
          .page-title { font-size: 26px; }
        }
        @media (max-width: 640px) {
          .products-page { padding: 14px; }
          .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .meta-grid, .extra-lines { grid-template-columns: 1fr; }
          .action-row { gap: 6px; }
          .btn-secondary, .btn-ghost, .btn-danger { flex: 1; }
          .modal { border-radius: 18px; }
          .modal-header, .product-form { padding-left: 14px; padding-right: 14px; }
        }
      `}</style>
    </div>
  );
}
