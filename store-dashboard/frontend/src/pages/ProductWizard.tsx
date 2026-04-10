import React, { useState, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Attribute { key: string; value: string; }
interface Variant {
  id: string;
  title: string;
  price: string;
  costPrice: string;
  quantity: string;
  sku: string;
  barcode: string;
  imageUrl: string;
  isActive: boolean;
  attributes: Attribute[];
}
interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  file?: File;
}
interface FormData {
  name: string;
  category: string;
  brand: string;
  description: string;
  tags: string;
  unit: string;
  price: string;
  costPrice: string;
  salePrice: string;
  saleStart: string;
  saleEnd: string;
  taxRate: string;
  weightKg: string;
  quantity: string;
  minQuantity: string;
  sku: string;
  barcode: string;
  supplierId: string;
  isActive: boolean;
  status: string;
  images: ProductImage[];
  variants: Variant[];
  hasVariants: boolean;
}

interface Props {
  onClose: () => void;
  onSave?: (data: FormData) => Promise<void>;
  initialData?: Partial<FormData>;
  editingId?: string | null;
  suppliers?: { id: string; name: string }[];
  categories?: string[];
  t?: (key: string) => string;
  generateEAN13?: () => string;
}

// ─── Wizard Steps ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: 'الأساسيات', icon: '📋' },
  { id: 1, label: 'التسعير',   icon: '💰' },
  { id: 2, label: 'المخزون',   icon: '📦' },
  { id: 3, label: 'الصور',     icon: '🖼️' },
  { id: 4, label: 'المتغيرات', icon: '🔀' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9); }

function genEAN13(): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const checksum = digits.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0);
  digits.push((10 - (checksum % 10)) % 10);
  return digits.join('');
}

const defaultVariant = (): Variant => ({
  id: uid(), title: '', price: '', costPrice: '',
  quantity: '', sku: '', barcode: '', imageUrl: '',
  isActive: true, attributes: [],
});

const defaultForm = (): FormData => ({
  name: '', category: '', brand: '', description: '',
  tags: '', unit: 'قطعة', price: '', costPrice: '',
  salePrice: '', saleStart: '', saleEnd: '', taxRate: '',
  weightKg: '', quantity: '0', minQuantity: '5',
  sku: '', barcode: '', supplierId: '', isActive: true,
  status: 'published', images: [], variants: [], hasVariants: false,
});

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProductWizard({ onClose, onSave, initialData, editingId, suppliers = [], categories = [], t: _t, generateEAN13: _gen }: Props) {
  const tr = _t ?? ((k: string) => k.split('.').pop() ?? k);
  const genBarcode = _gen ?? genEAN13;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ ...defaultForm(), ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Field helpers ────────────────────────────────────────────────────────
  const set = (field: keyof FormData, value: any) =>
    setForm(f => ({ ...f, [field]: value }));

  const validate = (stepIdx: number): boolean => {
    const e: Record<string, string> = {};
    if (stepIdx === 0) {
      if (!form.name.trim()) e.name = 'اسم المنتج مطلوب';
    }
    if (stepIdx === 1) {
      if (!form.price && !form.hasVariants) e.price = 'السعر مطلوب';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(step)) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep(s => Math.max(s - 1, 0));

  // ── Images ───────────────────────────────────────────────────────────────
  const addImageFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const news: ProductImage[] = Array.from(files).map((f, i) => ({
      id: uid(),
      url: URL.createObjectURL(f),
      isPrimary: form.images.length === 0 && i === 0,
      file: f,
    }));
    setForm(f => ({ ...f, images: [...f.images, ...news] }));
  }, [form.images.length]);

  const removeImage = (id: string) =>
    setForm(f => {
      let imgs = f.images.filter(i => i.id !== id);
      if (imgs.length > 0 && !imgs.some(i => i.isPrimary)) imgs[0].isPrimary = true;
      return { ...f, images: imgs };
    });

  const setPrimary = (id: string) =>
    setForm(f => ({ ...f, images: f.images.map(i => ({ ...i, isPrimary: i.id === id })) }));

  // ── Variants ─────────────────────────────────────────────────────────────
  const addVariant = () => setForm(f => ({ ...f, variants: [...f.variants, defaultVariant()] }));

  const updateVariant = (id: string, field: keyof Variant, value: any) =>
    setForm(f => ({ ...f, variants: f.variants.map(v => v.id === id ? { ...v, [field]: value } : v) }));

  const removeVariant = (id: string) =>
    setForm(f => ({ ...f, variants: f.variants.filter(v => v.id !== id) }));

  const addAttr = (vid: string) =>
    setForm(f => ({ ...f, variants: f.variants.map(v => v.id === vid ? { ...v, attributes: [...v.attributes, { key: '', value: '' }] } : v) }));

  const updateAttr = (vid: string, idx: number, field: 'key' | 'value', val: string) =>
    setForm(f => ({ ...f, variants: f.variants.map(v => {
      if (v.id !== vid) return v;
      const attrs = [...v.attributes];
      attrs[idx] = { ...attrs[idx], [field]: val };
      return { ...v, attributes: attrs };
    })}));

  const removeAttr = (vid: string, idx: number) =>
    setForm(f => ({ ...f, variants: f.variants.map(v => {
      if (v.id !== vid) return v;
      return { ...v, attributes: v.attributes.filter((_, i) => i !== idx) };
    })}));

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate(step)) return;
    setSaving(true);
    try { await onSave?.(form); onClose(); }
    finally { setSaving(false); }
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    addImageFiles(e.dataTransfer.files);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div className="pw-overlay" onClick={onClose}>
        <div className="pw-modal" onClick={e => e.stopPropagation()} dir="rtl">

          {/* Header */}
          <div className="pw-header">
            <div className="pw-header-text">
              <h2>{editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
              <p>{STEPS[step].icon} {STEPS[step].label}</p>
            </div>
            <button className="pw-close" onClick={onClose}>✕</button>
          </div>

          {/* Progress */}
          <div className="pw-progress">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  className={`pw-step-btn ${i === step ? 'active' : i < step ? 'done' : ''}`}
                  onClick={() => i < step && setStep(i)}
                  type="button"
                >
                  <span className="pw-dot">
                    {i < step ? '✓' : s.icon}
                  </span>
                  <span className="pw-step-label">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`pw-line ${i < step ? 'done' : ''}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Body */}
          <div className="pw-body">

            {/* ── Step 0: Basics ── */}
            {step === 0 && (
              <div className="pw-section">
                <div className="pw-field-group">
                  <Field label="اسم المنتج *" error={errors.name}>
                    <input className={errors.name ? 'err' : ''} value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: قميص قطني" />
                  </Field>
                  <div className="pw-two-col">
                    <Field label="الفئة">
                      <input value={form.category} onChange={e => set('category', e.target.value)} placeholder="إلكترونيات، ملابس..." list="cat-list" />
                      <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                    </Field>
                    <Field label="الماركة / البراند">
                      <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Nike, Samsung..." />
                    </Field>
                  </div>
                  <Field label="الوصف">
                    <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف تفصيلي للمنتج..." />
                  </Field>
                  <div className="pw-two-col">
                    <Field label="الوحدة">
                      <select value={form.unit} onChange={e => set('unit', e.target.value)}>
                        {['قطعة','كيلو','لتر','متر','علبة','دزينة','كرتون'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </Field>
                    <Field label="التاقات (مفصولة بفاصلة)">
                      <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="تخفيض, جديد, مميز" />
                    </Field>
                  </div>
                  <div className="pw-two-col">
                    <Field label="الحالة">
                      <select value={form.status} onChange={e => set('status', e.target.value)}>
                        <option value="published">منشور</option>
                        <option value="draft">مسودة</option>
                        <option value="archived">مؤرشف</option>
                      </select>
                    </Field>
                    {suppliers.length > 0 && (
                      <Field label="المورد">
                        <select value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
                          <option value="">بدون مورد</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </Field>
                    )}
                  </div>
                  <label className="pw-toggle-row">
                    <span>المنتج نشط</span>
                    <Toggle checked={form.isActive} onChange={v => set('isActive', v)} />
                  </label>
                </div>
              </div>
            )}

            {/* ── Step 1: Pricing ── */}
            {step === 1 && (
              <div className="pw-section">
                <label className="pw-toggle-row mb-16">
                  <span>هذا المنتج له متغيرات (ألوان، أحجام...)</span>
                  <Toggle checked={form.hasVariants} onChange={v => set('hasVariants', v)} />
                </label>

                {!form.hasVariants && (
                  <div className="pw-field-group">
                    <div className="pw-three-col">
                      <Field label="سعر البيع *" error={errors.price}>
                        <div className="pw-input-with-unit">
                          <input className={errors.price ? 'err' : ''} type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" />
                          <span>ر.س</span>
                        </div>
                      </Field>
                      <Field label="سعر التكلفة">
                        <div className="pw-input-with-unit">
                          <input type="number" min="0" step="0.01" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder="0.00" />
                          <span>ر.س</span>
                        </div>
                      </Field>
                      <Field label="سعر الخصم">
                        <div className="pw-input-with-unit">
                          <input type="number" min="0" step="0.01" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} placeholder="0.00" />
                          <span>ر.س</span>
                        </div>
                      </Field>
                    </div>

                    {form.salePrice && (
                      <div className="pw-two-col">
                        <Field label="بداية الخصم">
                          <input type="date" value={form.saleStart} onChange={e => set('saleStart', e.target.value)} />
                        </Field>
                        <Field label="نهاية الخصم">
                          <input type="date" value={form.saleEnd} onChange={e => set('saleEnd', e.target.value)} />
                        </Field>
                      </div>
                    )}

                    <div className="pw-two-col">
                      <Field label="نسبة الضريبة (%)">
                        <input type="number" min="0" max="100" value={form.taxRate} onChange={e => set('taxRate', e.target.value)} placeholder="15" />
                      </Field>
                      <Field label="الوزن (كجم)">
                        <input type="number" min="0" step="0.01" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} placeholder="0.5" />
                      </Field>
                    </div>

                    {form.price && form.costPrice && +form.price > 0 && +form.costPrice > 0 && (
                      <div className="pw-profit-card">
                        <div className="pw-profit-item">
                          <span>هامش الربح</span>
                          <strong className="green">{(((+form.price - +form.costPrice) / +form.price) * 100).toFixed(1)}%</strong>
                        </div>
                        <div className="pw-profit-item">
                          <span>صافي الربح</span>
                          <strong className="green">{(+form.price - +form.costPrice).toFixed(2)} ر.س</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {form.hasVariants && (
                  <div className="pw-info-note">
                    💡 سيتم تحديد السعر لكل متغير في خطوة المتغيرات
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Inventory ── */}
            {step === 2 && (
              <div className="pw-section">
                <div className="pw-field-group">
                  {!form.hasVariants && (
                    <div className="pw-two-col">
                      <Field label="الكمية الحالية">
                        <input type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" />
                      </Field>
                      <Field label="الحد الأدنى للتنبيه">
                        <input type="number" min="0" value={form.minQuantity} onChange={e => set('minQuantity', e.target.value)} placeholder="5" />
                      </Field>
                    </div>
                  )}
                  <div className="pw-two-col">
                    <Field label="SKU (كود المنتج)">
                      <input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="SKU-001" />
                    </Field>
                    <Field label="الباركود">
                      <div className="pw-barcode-row">
                        <input value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="1234567890123" />
                        <button type="button" className="pw-gen-btn" onClick={() => set('barcode', genBarcode())} title="توليد تلقائي">⚡</button>
                      </div>
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Images ── */}
            {step === 3 && (
              <div className="pw-section">
                <div
                  className={`pw-drop-zone ${dragOver ? 'dragging' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => addImageFiles(e.target.files)} />
                  <div className="pw-drop-icon">🖼️</div>
                  <p>اسحب الصور هنا أو <span className="pw-link">انقر للرفع</span></p>
                  <small>PNG, JPG, WEBP — حتى 5 صور</small>
                </div>

                {form.images.length > 0 && (
                  <div className="pw-images-grid">
                    {form.images.map(img => (
                      <div key={img.id} className={`pw-img-card ${img.isPrimary ? 'primary' : ''}`}>
                        <img src={img.url} alt="" />
                        {img.isPrimary && <span className="pw-primary-badge">رئيسية</span>}
                        <div className="pw-img-actions">
                          {!img.isPrimary && (
                            <button type="button" onClick={() => setPrimary(img.id)} title="تعيين كرئيسية">⭐</button>
                          )}
                          <button type="button" onClick={() => removeImage(img.id)} title="حذف">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 4: Variants ── */}
            {step === 4 && (
              <div className="pw-section">
                {!form.hasVariants ? (
                  <div className="pw-info-note">
                    💡 لم تفعّل خيار المتغيرات. ارجع لخطوة التسعير لتفعيلها.
                  </div>
                ) : (
                  <>
                    <button type="button" className="pw-add-variant-btn" onClick={addVariant}>
                      + إضافة متغير
                    </button>
                    {form.variants.length === 0 && (
                      <div className="pw-empty-variants">لا توجد متغيرات بعد، انقر الزر أعلاه للإضافة</div>
                    )}
                    {form.variants.map((v, vi) => (
                      <div key={v.id} className="pw-variant-card">
                        <div className="pw-variant-head">
                          <span className="pw-variant-num">متغير {vi + 1}</span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <label className="pw-mini-toggle">
                              <Toggle checked={v.isActive} onChange={val => updateVariant(v.id, 'isActive', val)} />
                              <span>نشط</span>
                            </label>
                            <button type="button" className="pw-remove-variant" onClick={() => removeVariant(v.id)}>✕</button>
                          </div>
                        </div>

                        <div className="pw-field-group">
                          <Field label="الاسم / العنوان">
                            <input value={v.title} onChange={e => updateVariant(v.id, 'title', e.target.value)} placeholder="مثال: أحمر - XL" />
                          </Field>
                          <div className="pw-three-col">
                            <Field label="سعر البيع">
                              <input type="number" min="0" step="0.01" value={v.price} onChange={e => updateVariant(v.id, 'price', e.target.value)} placeholder="0.00" />
                            </Field>
                            <Field label="سعر التكلفة">
                              <input type="number" min="0" step="0.01" value={v.costPrice} onChange={e => updateVariant(v.id, 'costPrice', e.target.value)} placeholder="0.00" />
                            </Field>
                            <Field label="الكمية">
                              <input type="number" min="0" value={v.quantity} onChange={e => updateVariant(v.id, 'quantity', e.target.value)} placeholder="0" />
                            </Field>
                          </div>
                          <div className="pw-two-col">
                            <Field label="SKU">
                              <input value={v.sku} onChange={e => updateVariant(v.id, 'sku', e.target.value)} placeholder="SKU-VAR-001" />
                            </Field>
                            <Field label="الباركود">
                              <div className="pw-barcode-row">
                                <input value={v.barcode} onChange={e => updateVariant(v.id, 'barcode', e.target.value)} placeholder="توليد تلقائي" />
                                <button type="button" className="pw-gen-btn" onClick={() => updateVariant(v.id, 'barcode', genBarcode())}>⚡</button>
                              </div>
                            </Field>
                          </div>

                          {/* Attributes */}
                          <div className="pw-attrs-section">
                            <div className="pw-attrs-head">
                              <span>الخصائص</span>
                              <button type="button" className="pw-add-attr-btn" onClick={() => addAttr(v.id)}>+ خاصية</button>
                            </div>
                            {v.attributes.map((a, ai) => (
                              <div key={ai} className="pw-attr-row">
                                <input
                                  value={a.key}
                                  onChange={e => updateAttr(v.id, ai, 'key', e.target.value)}
                                  placeholder="اللون، الحجم..."
                                  className="pw-attr-key"
                                />
                                <input
                                  value={a.value}
                                  onChange={e => updateAttr(v.id, ai, 'value', e.target.value)}
                                  placeholder="أحمر، XL..."
                                  className="pw-attr-val"
                                />
                                <button type="button" className="pw-remove-attr" onClick={() => removeAttr(v.id, ai)}>✕</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer Nav */}
          <div className="pw-footer">
            <button type="button" className="pw-btn-back" onClick={step === 0 ? onClose : back}>
              {step === 0 ? 'إلغاء' : '→ السابق'}
            </button>
            <div className="pw-step-dots">
              {STEPS.map((_, i) => <span key={i} className={`pw-dot-mini ${i === step ? 'active' : i < step ? 'done' : ''}`} />)}
            </div>
            {step < STEPS.length - 1 ? (
              <button type="button" className="pw-btn-next" onClick={next}>التالي ←</button>
            ) : (
              <button type="button" className="pw-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ جارٍ الحفظ...' : editingId ? '💾 حفظ التعديلات' : '✅ إضافة المنتج'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="pw-field">
      <label className="pw-label">{label}</label>
      {children}
      {error && <span className="pw-error">{error}</span>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`pw-toggle ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="pw-thumb" />
    </button>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');

.pw-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(10, 20, 40, 0.6);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  font-family: 'Cairo', sans-serif;
}
.pw-modal {
  background: #fff;
  border-radius: 20px;
  width: 100%; max-width: 680px;
  max-height: 92vh;
  display: flex; flex-direction: column;
  box-shadow: 0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.1);
  overflow: hidden;
}

/* Header */
.pw-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px 16px;
  background: linear-gradient(135deg, #0f3460 0%, #185FA5 100%);
  color: #fff;
}
.pw-header-text h2 { margin: 0; font-size: 18px; font-weight: 700; }
.pw-header-text p  { margin: 2px 0 0; font-size: 13px; opacity: 0.8; }
.pw-close {
  background: rgba(255,255,255,0.15); border: none; color: #fff;
  width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
  font-size: 14px; display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.pw-close:hover { background: rgba(255,255,255,0.3); }

/* Progress bar */
.pw-progress {
  display: flex; align-items: center; padding: 16px 24px 12px;
  border-bottom: 1px solid #f0f0f0; overflow-x: auto;
  scrollbar-width: none; gap: 0;
}
.pw-progress::-webkit-scrollbar { display: none; }
.pw-step-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: none; border: none; cursor: default; min-width: 54px; padding: 0;
}
.pw-step-btn.done { cursor: pointer; }
.pw-dot {
  width: 32px; height: 32px; border-radius: 50%;
  background: #f0f3f7; color: #aaa; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.25s; border: 2px solid transparent;
}
.pw-step-btn.active .pw-dot {
  background: #185FA5; color: #fff; border-color: #185FA5;
  box-shadow: 0 0 0 4px rgba(24,95,165,0.15);
}
.pw-step-btn.done .pw-dot {
  background: #e8f5e9; color: #2e7d32; border-color: #a5d6a7; font-size: 12px;
}
.pw-step-label {
  font-size: 10px; color: #999; white-space: nowrap;
  font-family: 'Cairo', sans-serif; font-weight: 600;
}
.pw-step-btn.active .pw-step-label { color: #185FA5; }
.pw-step-btn.done  .pw-step-label { color: #2e7d32; }
.pw-line {
  flex: 1; height: 2px; background: #eee; min-width: 12px;
  margin-bottom: 16px; transition: background 0.3s;
}
.pw-line.done { background: #a5d6a7; }

/* Body */
.pw-body {
  flex: 1; overflow-y: auto; padding: 20px 24px;
  scrollbar-width: thin; scrollbar-color: #ddd #fff;
}
.pw-body::-webkit-scrollbar { width: 6px; }
.pw-body::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }

.pw-section {}
.pw-field-group { display: flex; flex-direction: column; gap: 14px; }
.pw-two-col   { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pw-three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
@media (max-width: 500px) {
  .pw-two-col, .pw-three-col { grid-template-columns: 1fr; }
}

/* Field */
.pw-field { display: flex; flex-direction: column; gap: 5px; }
.pw-label { font-size: 12.5px; font-weight: 600; color: #555; font-family: 'Cairo', sans-serif; }
.pw-field input, .pw-field select, .pw-field textarea {
  padding: 9px 12px; border: 1.5px solid #e0e5ee; border-radius: 9px;
  font-size: 13.5px; color: #222; background: #fafbfc;
  font-family: 'Cairo', sans-serif; transition: border 0.2s, box-shadow 0.2s;
  width: 100%; box-sizing: border-box; outline: none;
}
.pw-field input:focus, .pw-field select:focus, .pw-field textarea:focus {
  border-color: #185FA5; background: #fff; box-shadow: 0 0 0 3px rgba(24,95,165,0.08);
}
.pw-field input.err { border-color: #e53935; }
.pw-error { color: #e53935; font-size: 11.5px; }
.pw-field textarea { resize: vertical; min-height: 70px; }

/* Input with unit */
.pw-input-with-unit {
  display: flex; align-items: stretch; border: 1.5px solid #e0e5ee;
  border-radius: 9px; overflow: hidden; background: #fafbfc;
  transition: border 0.2s, box-shadow 0.2s;
}
.pw-input-with-unit:focus-within {
  border-color: #185FA5; box-shadow: 0 0 0 3px rgba(24,95,165,0.08); background: #fff;
}
.pw-input-with-unit input {
  border: none; background: transparent; border-radius: 0; flex: 1; box-shadow: none !important;
}
.pw-input-with-unit span {
  padding: 0 10px; background: #f0f3f7; color: #777; font-size: 12px;
  display: flex; align-items: center; border-right: 1px solid #e0e5ee;
  font-family: 'Cairo', sans-serif;
}

/* Barcode row */
.pw-barcode-row { display: flex; gap: 6px; }
.pw-barcode-row input { flex: 1; }
.pw-gen-btn {
  padding: 0 12px; background: #185FA5; color: #fff; border: none;
  border-radius: 8px; cursor: pointer; font-size: 15px; transition: background 0.2s;
}
.pw-gen-btn:hover { background: #1249a0; }

/* Toggle */
.pw-toggle {
  width: 44px; height: 24px; border-radius: 12px; background: #ddd;
  border: none; cursor: pointer; position: relative; transition: background 0.25s;
  flex-shrink: 0;
}
.pw-toggle.on { background: #185FA5; }
.pw-thumb {
  position: absolute; top: 3px; right: 3px; width: 18px; height: 18px;
  border-radius: 50%; background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  transition: transform 0.25s; transform: translateX(0);
}
.pw-toggle.on .pw-thumb { transform: translateX(-20px); }
.pw-toggle-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px; background: #f7f9fc; border-radius: 10px;
  border: 1px solid #e8edf4; cursor: pointer;
  font-size: 13px; font-weight: 600; color: #333;
  font-family: 'Cairo', sans-serif;
}
.mb-16 { margin-bottom: 4px; }

/* Profit Card */
.pw-profit-card {
  display: flex; gap: 12px; padding: 14px; background: #f0faf0;
  border-radius: 10px; border: 1px solid #c8e6c9;
}
.pw-profit-item { flex: 1; text-align: center; }
.pw-profit-item span { display: block; font-size: 11px; color: #666; margin-bottom: 4px; font-family: 'Cairo', sans-serif; }
.pw-profit-item strong { font-size: 18px; font-family: 'Cairo', sans-serif; }
.pw-profit-item strong.green { color: #2e7d32; }

/* Info note */
.pw-info-note {
  background: #fffde7; border: 1px solid #ffe082; border-radius: 10px;
  padding: 14px 16px; font-size: 13px; color: #5d4037;
  font-family: 'Cairo', sans-serif;
}

/* Drop zone */
.pw-drop-zone {
  border: 2px dashed #c5d0e0; border-radius: 14px; padding: 36px 20px;
  text-align: center; cursor: pointer; transition: all 0.2s; background: #f8fafc;
  margin-bottom: 16px;
}
.pw-drop-zone:hover, .pw-drop-zone.dragging {
  border-color: #185FA5; background: #e8f2fd;
}
.pw-drop-icon { font-size: 36px; margin-bottom: 8px; }
.pw-drop-zone p { margin: 0 0 4px; font-size: 14px; color: #444; font-family: 'Cairo', sans-serif; }
.pw-drop-zone small { color: #999; font-family: 'Cairo', sans-serif; font-size: 12px; }
.pw-link { color: #185FA5; font-weight: 700; }

/* Images grid */
.pw-images-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px;
}
.pw-img-card {
  position: relative; border-radius: 10px; overflow: hidden;
  aspect-ratio: 1; border: 2px solid #e0e5ee; background: #f5f5f5;
  transition: border 0.2s;
}
.pw-img-card.primary { border-color: #185FA5; }
.pw-img-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pw-primary-badge {
  position: absolute; bottom: 0; right: 0; left: 0;
  background: rgba(24,95,165,0.85); color: #fff; text-align: center;
  font-size: 10px; padding: 3px; font-family: 'Cairo', sans-serif;
}
.pw-img-actions {
  position: absolute; top: 0; left: 0; right: 0;
  display: flex; justify-content: flex-end; gap: 4px; padding: 5px;
  opacity: 0; transition: opacity 0.2s;
}
.pw-img-card:hover .pw-img-actions { opacity: 1; }
.pw-img-actions button {
  background: rgba(0,0,0,0.65); color: #fff; border: none;
  border-radius: 6px; padding: 3px 6px; cursor: pointer; font-size: 12px;
}

/* Variant card */
.pw-add-variant-btn {
  width: 100%; padding: 11px; border: 2px dashed #185FA5; background: #e8f2fd;
  color: #185FA5; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 700;
  font-family: 'Cairo', sans-serif; margin-bottom: 14px; transition: background 0.2s;
}
.pw-add-variant-btn:hover { background: #d0e6f8; }
.pw-empty-variants { text-align: center; color: #aaa; padding: 24px; font-family: 'Cairo', sans-serif; }
.pw-variant-card {
  border: 1.5px solid #e0e5ee; border-radius: 14px; padding: 16px; margin-bottom: 14px;
  background: #fafbfc;
}
.pw-variant-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #eee;
}
.pw-variant-num { font-size: 13px; font-weight: 700; color: #185FA5; font-family: 'Cairo', sans-serif; }
.pw-remove-variant {
  background: #fee; border: none; color: #c33; border-radius: 6px;
  width: 28px; height: 28px; cursor: pointer; font-size: 12px;
}
.pw-mini-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #555; cursor: pointer; font-family: 'Cairo', sans-serif; }

/* Attributes */
.pw-attrs-section { background: #f7f9fc; border-radius: 10px; padding: 12px; }
.pw-attrs-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.pw-attrs-head span { font-size: 12.5px; font-weight: 700; color: #444; font-family: 'Cairo', sans-serif; }
.pw-add-attr-btn {
  font-size: 12px; padding: 4px 10px; background: #185FA5; color: #fff;
  border: none; border-radius: 6px; cursor: pointer; font-family: 'Cairo', sans-serif;
}
.pw-attr-row { display: grid; grid-template-columns: 1fr 1fr 28px; gap: 6px; margin-bottom: 6px; align-items: center; }
.pw-attr-key, .pw-attr-val {
  padding: 7px 10px; border: 1px solid #dde; border-radius: 7px;
  font-size: 12.5px; font-family: 'Cairo', sans-serif; background: #fff;
}
.pw-remove-attr {
  background: #fee; border: none; color: #c33; border-radius: 5px;
  height: 28px; cursor: pointer; font-size: 11px;
}

/* Footer */
.pw-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 24px; border-top: 1px solid #f0f0f0; background: #fafbfc;
}
.pw-step-dots { display: flex; gap: 6px; }
.pw-dot-mini { width: 8px; height: 8px; border-radius: 50%; background: #ddd; transition: all 0.2s; }
.pw-dot-mini.active { background: #185FA5; width: 20px; border-radius: 4px; }
.pw-dot-mini.done   { background: #a5d6a7; }
.pw-btn-back {
  padding: 9px 18px; background: #f0f3f7; border: none; border-radius: 9px;
  cursor: pointer; font-size: 13px; color: #555; font-family: 'Cairo', sans-serif;
  font-weight: 600; transition: background 0.2s;
}
.pw-btn-back:hover { background: #e0e5ee; }
.pw-btn-next {
  padding: 9px 22px; background: linear-gradient(135deg, #185FA5, #1249a0);
  border: none; border-radius: 9px; cursor: pointer; font-size: 13px;
  color: #fff; font-family: 'Cairo', sans-serif; font-weight: 700;
  box-shadow: 0 4px 14px rgba(24,95,165,0.3); transition: opacity 0.2s;
}
.pw-btn-next:hover { opacity: 0.9; }
.pw-btn-save {
  padding: 9px 22px; background: linear-gradient(135deg, #27500A, #3a7514);
  border: none; border-radius: 9px; cursor: pointer; font-size: 13px;
  color: #fff; font-family: 'Cairo', sans-serif; font-weight: 700;
  box-shadow: 0 4px 14px rgba(39,80,10,0.3); transition: opacity 0.2s;
}
.pw-btn-save:hover  { opacity: 0.9; }
.pw-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
`;
