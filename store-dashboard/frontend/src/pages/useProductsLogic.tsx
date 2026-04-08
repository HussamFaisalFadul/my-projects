// src/pages/useProductsLogic.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, Product as ApiProduct, socket, uploadImageToCloudinary, Supplier } from '../api';
import BarcodeScanner from '../BarcodeScanner'; // قد لا تحتاج له هنا، لكنه مستخدم في الفورم – سنضيفه في JSX

// نفس الواجهات والثوابت من الملف الأصلي
interface ProductImage { id: string; url: string; is_primary: boolean; sort_order: number; }
interface Variant { id: string; title: string; attributes: Record<string, string>; price: number; quantity: number; sku?: string; image_url?: string; }
type ExtendedProduct = ApiProduct & {
  images?: ProductImage[]; variants?: Variant[]; brand?: string; weight_kg?: number; tax_rate?: number;
  sale_price?: number; sale_start?: string; sale_end?: string; description?: string; cost_price?: number;
  unit?: string; is_active?: boolean; tagsText?: string; supplierId?: string; reservedQuantity?: number;
};
type ViewMode = 'grid' | 'table'; type ProductsMode = 'simple' | 'advanced';
type SortMode = 'newest' | 'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc';
type Tab = 'basic' | 'media' | 'pricing' | 'inventory' | 'variants' | 'movements';
type MovementReason = 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage';

const getStoreId = () => localStorage.getItem('store_id') || 'default';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const toNumber = (value: string | number) => { const n = typeof value === 'number' ? value : Number(value); return Number.isFinite(n) ? n : 0; };
const formatMoney = (value?: number, t?: any) => { if (value === undefined || value === null || Number.isNaN(value)) return '—'; return `${Number(value).toFixed(2)} ${t ? t('common.currency') : 'ر.س'}`; };
const formatDate = (value?: string) => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-SA'); };
const getInitials = (name: string) => { const parts = name.trim().split(/\s+/).slice(0, 2); if (parts.length === 0) return 'P'; return parts.map(p => p[0]).join('').toUpperCase(); };
const createId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const generateEAN13 = () => { const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)); const sum = digits.reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 1 : 3), 0); const checksum = (10 - (sum % 10)) % 10; return `${digits.join('')}${checksum}`; };

const emptyForm = {
  name: '', price: 0, quantity: 0, category: '', minQuantity: 5, imageUrl: '',
  images: [] as ProductImage[], variants: [] as Variant[], barcode: '', brand: '',
  weight_kg: 0, tax_rate: 0, sale_price: 0, sale_start: '', sale_end: '', sku: '',
  description: '', cost_price: 0, unit: 'قطعة', is_active: true, tagsText: '', supplierId: '',
};
type FormState = typeof emptyForm;

export function useProductsLogic() {
  const { t } = useTranslation();
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const productsData = await api.getProducts();
      setProducts(productsData as ExtendedProduct[]);
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

  useEffect(() => {
    let isMounted = true;
    api.getSuppliers()
      .then(data => { if (isMounted) setSuppliers(data); })
      .catch(err => console.error(t('products.loadSuppliersError'), err));
    return () => { isMounted = false; };
  }, [t]);

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
      name: product.name || '', price: product.price || 0, quantity: product.quantity || 0,
      category: product.category || '', minQuantity: product.minQuantity ?? 5, imageUrl: product.imageUrl || '',
      images: (product.images || []).map(img => ({ id: (img as any).id || createId(), url: (img as any).url || '', is_primary: (img as any).isPrimary ?? (img as any).is_primary ?? false, sort_order: (img as any).sortOrder ?? (img as any).sort_order ?? 0 })),
      variants: (product.variants || []).map((v: any) => ({ id: v.id || createId(), title: v.title || '', attributes: v.attributes || {}, price: v.price || 0, quantity: v.quantity || 0, sku: v.sku || '', image_url: v.imageUrl || v.image_url || '' })),
      barcode: product.barcode || '', brand: product.brand || '', weight_kg: product.weightKg ?? (product as any).weight_kg ?? 0,
      tax_rate: product.taxRate ?? (product as any).tax_rate ?? 0, sale_price: product.salePrice ?? (product as any).sale_price ?? 0,
      sale_start: product.saleStart || (product as any).sale_start || '', sale_end: product.saleEnd || (product as any).sale_end || '',
      sku: product.sku || '', description: product.description || '', cost_price: product.costPrice ?? (product as any).cost_price ?? 0,
      unit: product.unit || 'قطعة', is_active: product.isActive ?? (product as any).is_active ?? true,
      tagsText: Array.isArray(product.tags) ? product.tags.join(', ') : '', supplierId: product.supplierId || '',
    });
    setActiveTab('basic');
    setShowForm(true);
  };
  const syncPrimaryImage = (images: ProductImage[]) => {
    if (images.length === 0) return images;
    const hasPrimary = images.some(img => img.is_primary);
    if (hasPrimary) return images;
    return images.map((img, idx) => ({ ...img, is_primary: idx === 0 }));
  };
  const addImageFromUrl = (url: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    const newImages = syncPrimaryImage([...form.images, { id: createId(), url: cleanUrl, is_primary: form.images.length === 0, sort_order: form.images.length }]).map((img, idx) => ({ ...img, sort_order: idx }));
    setForm(prev => ({ ...prev, images: newImages }));
  };
  const addImagesFromFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const storeId = getStoreId();
    setUploadingImages(true);
    try {
      const results = await Promise.all(fileArray.map(async (file, i) => ({ id: createId(), url: await uploadImageToCloudinary(file, storeId, 'products'), is_primary: false, sort_order: form.images.length + i })));
      const merged = syncPrimaryImage([...form.images, ...results]).map((img, idx) => ({ ...img, sort_order: idx }));
      setForm(prev => ({ ...prev, images: merged }));
    } catch { alert(t('products.uploadFailed')); }
    finally { setUploadingImages(false); }
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
  const addVariant = () => {
    const newVariant: Variant = { id: createId(), title: `${t('products.variant')} ${form.variants.length + 1}`, attributes: {}, price: form.price, quantity: 0, sku: '', image_url: '' };
    setForm(prev => ({ ...prev, variants: [...prev.variants, newVariant] }));
  };
  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    setForm(prev => { const next = [...prev.variants]; next[index] = { ...next[index], [field]: value }; return { ...prev, variants: next }; });
  };
  const updateVariantAttribute = (index: number, key: string, value: string) => {
    setForm(prev => { const next = [...prev.variants]; next[index] = { ...next[index], attributes: { ...next[index].attributes, [key]: value } }; return { ...prev, variants: next }; });
  };
  const addVariantAttributeKey = (index: number) => {
    setForm(prev => { const next = [...prev.variants]; const attrKeys = Object.keys(next[index].attributes); const baseKey = `${t('products.attribute')}_${attrKeys.length + 1}`; next[index] = { ...next[index], attributes: { ...next[index].attributes, [baseKey]: '' } }; return { ...prev, variants: next }; });
  };
  const removeVariant = (index: number) => {
    setForm(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  };
  const handleSubmit = async () => {
    if (!form.name.trim() || form.price <= 0) return;
    setSaving(true);
    try {
      const finalImages = syncPrimaryImage(form.images).map((img, idx) => ({ ...img, sort_order: idx }));
      const baseProduct = {
        name: form.name.trim(), price: form.price, quantity: form.quantity, category: form.category.trim(),
        minQuantity: form.minQuantity, imageUrl: finalImages.find(img => img.is_primary)?.url || form.imageUrl || '',
        storeId: getStoreId(), sku: form.sku || undefined, barcode: form.barcode || undefined,
        costPrice: form.cost_price || undefined, salePrice: form.sale_price || undefined,
        saleStart: form.sale_start || undefined, saleEnd: form.sale_end || undefined,
        brand: form.brand || undefined, description: form.description || undefined,
        weightKg: form.weight_kg || undefined, taxRate: form.tax_rate || undefined,
        unit: form.unit, isActive: form.is_active,
        tags: form.tagsText.split(',').map(t => t.trim()).filter(Boolean),
        status: form.is_active ? 'published' : 'draft', supplierId: form.supplierId || undefined,
        images: finalImages.map(img => ({ id: img.id, productId: '', url: img.url, isPrimary: img.is_primary, sortOrder: img.sort_order, createdAt: new Date().toISOString() })),
        variants: form.variants.map((v, idx) => ({ id: v.id, productId: '', title: v.title, attributes: v.attributes, price: v.price, costPrice: 0, quantity: v.quantity, sku: v.sku || undefined, imageUrl: v.image_url || undefined, isActive: true, sortOrder: idx })),
      };
      if (editingId) await api.updateProduct(editingId, baseProduct);
      else await api.addProduct(baseProduct);
      await fetchProducts();
      setShowForm(false);
      setEditingId(null);
      setForm(clone(emptyForm));
    } catch (error) { console.error(t('products.saveError'), error); alert(t('products.saveErrorMsg')); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm(t('products.deleteConfirm'))) return;
    try { await api.deleteProduct(id); await fetchProducts(); }
    catch (error) { console.error(t('products.deleteError'), error); alert(t('products.deleteErrorMsg')); }
  };
  const handleQuantityChange = async (product: ExtendedProduct, delta: number) => {
    try {
      await api.addStockMovement(product.id, { type: 'adjustment', quantityChange: delta, note: delta > 0 ? t('products.stockIncrease') : t('products.stockDecrease') });
      await fetchProducts();
    } catch (error) { console.error(t('products.quantityUpdateError'), error); alert(t('products.quantityUpdateErrorMsg')); }
  };
  const showStockLog = async (product: ExtendedProduct) => {
    setSelectedProductForLog(product);
    setMovementsData([]);
    setShowMovementModal(true);
    try { const movements = await api.getStockMovements(product.id); setMovementsData(movements); } catch { setMovementsData([]); }
  };
  const addStockMovement = async (productId: string, change: number, reason: MovementReason, note: string) => {
    try {
      await api.addStockMovement(productId, { type: reason, quantityChange: change, note });
      const movements = await api.getStockMovements(productId);
      setMovementsData(movements);
      await fetchProducts();
      alert(t('products.movementSuccess'));
    } catch (error) { console.error(t('products.movementError'), error); alert(t('products.movementErrorMsg')); }
  };
  const categories = useMemo(() => [...new Set(products.map(p => (p.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')), [products]);
  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    const result = products.filter(p => {
      const matchesSearch = !s || (p.name || '').toLowerCase().includes(s) || (p.category || '').toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s) || (p.barcode || '').toLowerCase().includes(s) || (p.brand || '').toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s);
      const matchesCategory = !filterCategory || p.category === filterCategory;
      const matchesLow = !filterLowStock || (p.quantity || 0) <= (p.minQuantity ?? 5);
      const matchesActive = filterActive === 'all' ? true : filterActive === 'active' ? p.isActive !== false : p.isActive === false;
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
  const getMainImage = (p: ExtendedProduct) => { const images = p.images || []; const primary = images.find((i: any) => i.isPrimary || i.is_primary)?.url; return primary || images[0]?.url || p.imageUrl || ''; };
  const onDropFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (!files || files.length === 0) return; await addImagesFromFiles(files); e.target.value = ''; };
  const productBadge = (p: ExtendedProduct) => {
    const isLow = (p.quantity || 0) <= (p.minQuantity ?? 5);
    const isActive = p.isActive !== false;
    return ( <div className="product-badges"><span className={`pill ${isActive ? 'pill-green' : 'pill-gray'}`}>{isActive ? t('products.active') : t('products.inactive')}</span>{isLow && <span className="pill pill-orange">{t('products.lowStock')}</span>}{(p.salePrice || 0) > 0 && <span className="pill pill-red">{t('products.discount')}</span>}</div> );
  };

  return {
    // state
    mode, viewMode, sortMode, products, loading, showForm, editingId, form, saving, uploadingImages, showScanner,
    search, filterCategory, filterLowStock, filterActive, activeTab, selectedProductForLog, showMovementModal,
    movementReason, movementQuantity, movementNote, movementsData, suppliers,
    // computed
    categories, filteredProducts, lowStockCount, activeCount, imageCount, totalValue,
    // handlers
    toggleMode, toggleViewMode, changeSort, openAddForm, handleEdit, addImageFromUrl, addImagesFromFiles,
    removeImage, setPrimaryImage, moveImage, addVariant, updateVariant, updateVariantAttribute,
    addVariantAttributeKey, removeVariant, handleSubmit, handleDelete, handleQuantityChange, showStockLog,
    addStockMovement, onDropFileInput, productBadge, getMainImage, setForm, setSearch, setFilterCategory,
    setFilterLowStock, setFilterActive, setActiveTab, setShowForm, setShowScanner, setForm, setMovementReason,
    setMovementQuantity, setMovementNote, setSelectedProductForLog, setShowMovementModal, fetchProducts,
    // utilities
    t, formatMoney, formatDate, getInitials, toNumber, generateEAN13, syncPrimaryImage,
  };
}
