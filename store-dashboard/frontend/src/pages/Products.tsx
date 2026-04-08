// src/pages/Products.tsx
import { useProductsLogic } from './useProductsLogic';
import BarcodeScanner from '../BarcodeScanner';
import './Products.css';

export default function Products() {
  const {
    mode, viewMode, sortMode, products, loading, showForm, editingId, form, saving, uploadingImages, showScanner,
    search, filterCategory, filterLowStock, filterActive, activeTab, selectedProductForLog, showMovementModal,
    movementReason, movementQuantity, movementNote, movementsData, suppliers,
    categories, filteredProducts, lowStockCount, activeCount, imageCount, totalValue,
    toggleMode, toggleViewMode, changeSort, openAddForm, handleEdit, addImageFromUrl, addImagesFromFiles,
    removeImage, setPrimaryImage, moveImage, addVariant, updateVariant, updateVariantAttribute,
    addVariantAttributeKey, removeVariant, handleSubmit, handleDelete, handleQuantityChange, showStockLog,
    addStockMovement, onDropFileInput, productBadge, getMainImage, setForm, setSearch, setFilterCategory,
    setFilterLowStock, setFilterActive, setActiveTab, setShowForm, setShowScanner, setMovementReason,
    setMovementQuantity, setMovementNote, setSelectedProductForLog, setShowMovementModal,
    t, formatMoney, formatDate, getInitials, toNumber, generateEAN13, syncPrimaryImage,
  } = useProductsLogic();

  return (
    <div className="products-page" dir="rtl">
      {showScanner && (
        <BarcodeScanner
          onDetected={(code) => { setForm(prev => ({ ...prev, barcode: code })); setShowScanner(false); }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="hero-card">
        <div>
          <p className="eyebrow">{t('products.management')}</p>
          <h1 className="page-title">{t('products.title')}</h1>
          <p className="subtitle">{t('products.subtitle')}</p>
        </div>
        <div className="hero-actions">
          <button className={`mode-toggle ${mode}`} onClick={toggleMode} type="button">
            {mode === 'simple' ? `⚡ ${t('products.simple')}` : `🧠 ${t('products.advanced')}`}
          </button>
          <button className="view-toggle" onClick={toggleViewMode} type="button">
            {viewMode === 'grid' ? `☷ ${t('products.table')}` : `▣ ${t('products.grid')}`}
          </button>
          <button className="btn-add" onClick={openAddForm} type="button">+ {t('products.addProduct')}</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>{t('products.totalProducts')}</span><strong>{products.length}</strong></div>
        <div className="stat-card"><span>{t('products.activeCount')}</span><strong>{activeCount}</strong></div>
        <div className="stat-card warning"><span>{t('products.lowStockCount')}</span><strong>{lowStockCount}</strong></div>
        <div className="stat-card"><span>{t('products.withImages')}</span><strong>{imageCount}</strong></div>
        <div className="stat-card"><span>{t('products.totalValue')}</span><strong>{formatMoney(totalValue, t)}</strong></div>
      </div>

      <div className="filters-panel">
        <input
          className="search-input"
          placeholder={t('products.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">{t('products.allCategories')}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filterActive} onChange={e => setFilterActive(e.target.value as any)}>
          <option value="all">{t('products.allStatus')}</option>
          <option value="active">{t('products.active')}</option>
          <option value="inactive">{t('products.inactive')}</option>
        </select>
        <select className="filter-select" value={sortMode} onChange={e => changeSort(e.target.value as SortMode)}>
          <option value="newest">{t('products.sortNewest')}</option>
          <option value="name">{t('products.sortName')}</option>
          <option value="price_asc">{t('products.sortPriceAsc')}</option>
          <option value="price_desc">{t('products.sortPriceDesc')}</option>
          <option value="stock_asc">{t('products.sortStockAsc')}</option>
          <option value="stock_desc">{t('products.sortStockDesc')}</option>
        </select>
        <button className={`filter-low-btn ${filterLowStock ? 'active' : ''}`} onClick={() => setFilterLowStock(v => !v)} type="button">
          {filterLowStock ? '✅' : '⚠️'} {t('products.lowStockFilter')}
        </button>
      </div>

      {loading ? (
        <div className="loading-box">{t('common.loading')}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>{t('products.noProductsMatch')}</h3>
          <p>{t('products.noProductsMatchDesc')}</p>
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
                    {imagesCount > 1 && <span className="overlay-badge">+{imagesCount - 1} {t('products.images')}</span>}
                    <div className="quick-actions">
                      <button type="button" onClick={() => handleEdit(p)}>✏️</button>
                      <button type="button" onClick={() => showStockLog(p)}>📋</button>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {productBadge(p)}
                  <h3 title={p.name}>{p.name}</h3>
                  <p className="card-subtitle">{p.category || t('products.noCategory')}</p>
                  <div className="price-row">
                    {hasSale ? (
                      <><strong className="sale-price">{formatMoney(p.salePrice, t)}</strong><span className="old-price">{formatMoney(p.price, t)}</span></>
                    ) : (
                      <strong>{formatMoney(p.price, t)}</strong>
                    )}
                  </div>
                  <div className="meta-grid">
                    <div><span>{t('products.stock')}</span><strong>{p.quantity || 0}</strong></div>
                    <div><span>{t('products.minQuantity')}</span><strong>{p.minQuantity ?? 5}</strong></div>
                    <div><span>{t('products.sku')}</span><strong>{p.sku || '—'}</strong></div>
                    <div><span>{t('products.barcode')}</span><strong>{p.barcode || '—'}</strong></div>
                  </div>
                  {mode === 'advanced' && (
                    <div className="extra-lines">
                      <div><span>{t('products.brand')}</span><strong>{p.brand || '—'}</strong></div>
                      <div><span>{t('products.costPrice')}</span><strong>{formatMoney(p.costPrice, t)}</strong></div>
                      <div><span>{t('products.taxRate')}</span><strong>{p.taxRate ? `${p.taxRate}%` : '—'}</strong></div>
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
                    <button className="btn-secondary" type="button" onClick={() => handleEdit(p)}>{t('common.edit')}</button>
                    <button className="btn-ghost" type="button" onClick={() => showStockLog(p)}>{t('products.log')}</button>
                    <button className="btn-danger" type="button" onClick={() => handleDelete(p.id)}>{t('common.delete')}</button>
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
                <th>{t('products.product')}</th>
                <th>{t('products.price')}</th>
                <th>{t('products.stock')}</th>
                <th>{t('products.category')}</th>
                <th>{t('products.status')}</th>
                {mode === 'advanced' && <th>{t('products.sku')}</th>}
                {mode === 'advanced' && <th>{t('products.barcode')}</th>}
                <th>{t('products.actions')}</th>
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
                          <strong className="sale-price">{formatMoney(p.salePrice, t)}</strong>
                          <span className="old-price">{formatMoney(p.price, t)}</span>
                        </div>
                      ) : (
                        <strong>{formatMoney(p.price, t)}</strong>
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
                    <td>{p.isActive === false ? t('products.inactive') : t('products.active')}</td>
                    {mode === 'advanced' && <td>{p.sku || '—'}</td>}
                    {mode === 'advanced' && <td>{p.barcode || '—'}</td>}
                    <td>
                      <div className="action-btns">
                        <button className="btn-edit" onClick={() => handleEdit(p)} type="button">{t('common.edit')}</button>
                        <button className="btn-log" onClick={() => showStockLog(p)} type="button">{t('products.log')}</button>
                        <button className="btn-delete" onClick={() => handleDelete(p.id)} type="button">{t('common.delete')}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for stock movements */}
      {showMovementModal && selectedProductForLog && (
        <div className="modal-overlay" onClick={() => setShowMovementModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">{t('products.stockMovements')}</p>
                <h2>{selectedProductForLog.name}</h2>
              </div>
              <button className="modal-close" onClick={() => setShowMovementModal(false)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <table className="movements-table">
                <thead>
                  <tr>
                    <th>{t('products.date')}</th>
                    <th>{t('products.change')}</th>
                    <th>{t('products.before')}</th>
                    <th>{t('products.after')}</th>
                    <th>{t('products.type')}</th>
                    <th>{t('products.note')}</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsData.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>{t('products.noMovements')}</td></tr>
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
                <h4>{t('products.addMovement')}</h4>
                <div className="movement-grid">
                  <input
                    type="number"
                    placeholder={t('products.quantityChange')}
                    value={movementQuantity}
                    onChange={e => setMovementQuantity(toNumber(e.target.value))}
                  />
                  <select value={movementReason} onChange={e => setMovementReason(e.target.value as MovementReason)}>
                    <option value="purchase">{t('products.purchase')}</option>
                    <option value="sale">{t('products.sale')}</option>
                    <option value="return">{t('products.return')}</option>
                    <option value="adjustment">{t('products.adjustment')}</option>
                    <option value="damage">{t('products.damage')}</option>
                  </select>
                </div>
                <input placeholder={t('products.note')} value={movementNote} onChange={e => setMovementNote(e.target.value)} />
                <button
                  type="button"
                  className="btn-save-inline"
                  onClick={async () => {
                    await addStockMovement(selectedProductForLog.id, movementQuantity, movementReason, movementNote);
                    setMovementQuantity(0);
                    setMovementNote('');
                  }}
                >
                  {t('products.recordMovement')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for add/edit product */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header sticky">
              <div>
                <p className="modal-kicker">{editingId ? t('products.editProduct') : t('products.newProduct')}</p>
                <h2>{editingId ? t('products.editProduct') : t('products.createProduct')}</h2>
              </div>
              <button className="modal-close" onClick={() => setShowForm(false)} type="button">✕</button>
            </div>

            <div className="modal-tabs">
              <button className={activeTab === 'basic' ? 'active' : ''} onClick={() => setActiveTab('basic')} type="button">{t('products.basic')}</button>
              <button className={activeTab === 'media' ? 'active' : ''} onClick={() => setActiveTab('media')} type="button">
                {t('products.images')} {form.images.length > 0 && `(${form.images.length})`}
              </button>
              <button className={activeTab === 'pricing' ? 'active' : ''} onClick={() => setActiveTab('pricing')} type="button">{t('products.pricing')}</button>
              <button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => setActiveTab('inventory')} type="button">{t('products.inventory')}</button>
              {mode === 'advanced' && (
                <button className={activeTab === 'variants' ? 'active' : ''} onClick={() => setActiveTab('variants')} type="button">
                  {t('products.variants')} {form.variants.length > 0 && `(${form.variants.length})`}
                </button>
              )}
            </div>

            <form className="product-form" onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
              {/* تبويب الأساسيات */}
              {activeTab === 'basic' && (
                <div className="form-section">
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>{t('products.name')} *</label>
                      <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="form-row">
                      <label>{t('products.category')}</label>
                      <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>{t('products.barcode')}</label>
                      <div className="input-with-button">
                        <input
                          value={form.barcode}
                          onChange={e => setForm({ ...form, barcode: e.target.value })}
                          placeholder={t('products.barcodePlaceholder')}
                        />
                        <button type="button" onClick={() => setShowScanner(true)} className="btn-scan">📷</button>
                        <button type="button" onClick={() => setForm({ ...form, barcode: generateEAN13() })}>{t('products.generate')}</button>
                      </div>
                    </div>
                    <div className="form-row">
                      <label>{t('products.sku')}</label>
                      <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>{t('products.brand')}</label>
                      <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
                    </div>
                    <div className="form-row">
                      <label>{t('products.unit')}</label>
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
                      <label>{t('products.supplier')}</label>
                      <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
                        <option value="">{t('products.noSupplier')}</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="form-row form-row-checkbox">
                      <label>
                        <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                        {t('products.active')}
                      </label>
                    </div>
                  </div>
                  <div className="form-row">
                    <label>{t('products.description')}</label>
                    <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>{t('products.tags')}</label>
                      <input value={form.tagsText} onChange={e => setForm({ ...form, tagsText: e.target.value })} placeholder={t('products.tagsPlaceholder')} />
                    </div>
                  </div>
                </div>
              )}

              {/* تبويب الصور */}
              {activeTab === 'media' && (
                <div className="form-section">
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>{t('products.addImageUrl')}</label>
                      <div className="input-with-button">
                        <input id="newImageUrl" type="url" placeholder="https://..." />
                        <button type="button" onClick={() => {
                          const input = document.getElementById('newImageUrl') as HTMLInputElement | null;
                          if (!input || !input.value.trim()) return;
                          addImageFromUrl(input.value);
                          input.value = '';
                        }}>{t('products.add')}</button>
                      </div>
                    </div>
                    <div className="form-row">
                      <label>{t('products.uploadImages')} {uploadingImages && `⏳ ${t('products.uploading')}`}</label>
                      <input type="file" multiple accept="image/*" onChange={onDropFileInput} disabled={uploadingImages} />
                      <small style={{ color: '#6b7280' }}>{t('products.cloudinaryNote')}</small>
                    </div>
                  </div>
                  {uploadingImages && <div className="upload-progress">⏳ {t('products.uploadingCloudinary')}</div>}
                  <div className="images-grid">
                    {form.images.map((img, idx) => (
                      <div key={img.id} className="image-item">
                        <div className="image-wrap">
                          <img src={img.url} alt={`${t('products.image')} ${idx + 1}`} />
                          {img.is_primary && <span className="primary-badge">{t('products.primary')}</span>}
                        </div>
                        <div className="image-actions">
                          <button type="button" onClick={() => setPrimaryImage(idx)} className={img.is_primary ? 'active' : ''} title={t('products.setPrimary')}>⭐</button>
                          <button type="button" onClick={() => moveImage(idx, idx - 1)} disabled={idx === 0}>⬆️</button>
                          <button type="button" onClick={() => moveImage(idx, idx + 1)} disabled={idx === form.images.length - 1}>⬇️</button>
                          <button type="button" onClick={() => removeImage(idx)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                    {form.images.length === 0 && !uploadingImages && <p className="muted-box">{t('products.noImagesYet')}</p>}
                  </div>
                </div>
              )}

              {/* تبويب الأسعار */}
              {activeTab === 'pricing' && (
                <div className="form-section">
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>{t('products.basePrice')} *</label>
                      <input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: toNumber(e.target.value) })} />
                    </div>
                    <div className="form-row">
                      <label>{t('products.salePrice')}</label>
                      <input type="number" min="0" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: toNumber(e.target.value) })} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>{t('products.costPrice')}</label>
                      <input type="number" min="0" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: toNumber(e.target.value) })} />
                    </div>
                    <div className="form-row">
                      <label>{t('products.taxRate')} %</label>
                      <input type="number" min="0" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: toNumber(e.target.value) })} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>{t('products.saleStart')}</label>
                      <input type="datetime-local" value={form.sale_start} onChange={e => setForm({ ...form, sale_start: e.target.value })} />
                    </div>
                    <div className="form-row">
                      <label>{t('products.saleEnd')}</label>
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
                      <label>{t('products.currentStock')} *</label>
                      <input type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: toNumber(e.target.value) })} />
                    </div>
                    <div className="form-row">
                      <label>{t('products.minAlert')}</label>
                      <input type="number" min="0" value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: toNumber(e.target.value) })} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>{t('products.weightKg')}</label>
                      <input type="number" min="0" step="0.01" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: toNumber(e.target.value) })} />
                    </div>
                    <div className="form-row">
                      <label>{t('products.status')}</label>
                      <select value={String(form.is_active)} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                        <option value="true">{t('products.active')}</option>
                        <option value="false">{t('products.inactive')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* تبويب المتغيرات */}
              {activeTab === 'variants' && mode === 'advanced' && (
                <div className="form-section">
                  <div className="section-head">
                    <h4>{t('products.variants')}</h4>
                    <button type="button" onClick={addVariant}>+ {t('products.addVariant')}</button>
                  </div>
                  <div className="variants-list">
                    {form.variants.map((v, idx) => (
                      <div key={v.id} className="variant-item">
                        <div className="form-grid-2">
                          <div className="form-row">
                            <label>{t('products.variantName')}</label>
                            <input value={v.title} onChange={e => updateVariant(idx, 'title', e.target.value)} placeholder={t('products.variantPlaceholder')} />
                          </div>
                          <div className="form-row">
                            <label>{t('products.sku')}</label>
                            <input value={v.sku || ''} onChange={e => updateVariant(idx, 'sku', e.target.value)} />
                          </div>
                        </div>
                        <div className="form-grid-2">
                          <div className="form-row">
                            <label>{t('products.price')}</label>
                            <input type="number" min="0" value={v.price} onChange={e => updateVariant(idx, 'price', toNumber(e.target.value))} />
                          </div>
                          <div className="form-row">
                            <label>{t('products.quantity')}</label>
                            <input type="number" min="0" value={v.quantity} onChange={e => updateVariant(idx, 'quantity', toNumber(e.target.value))} />
                          </div>
                        </div>
                        <div className="attributes-box">
                          <div className="attributes-head">
                            <strong>{t('products.attributes')}</strong>
                            <button type="button" onClick={() => addVariantAttributeKey(idx)}>+ {t('products.addAttribute')}</button>
                          </div>
                          {Object.entries(v.attributes).map(([key, value]) => (
                            <div className="attribute-row" key={key}>
                              <input value={key} disabled className="attr-key" />
                              <input value={value} onChange={e => updateVariantAttribute(idx, key, e.target.value)} placeholder={t('products.value')} />
                            </div>
                          ))}
                          {Object.keys(v.attributes).length === 0 && <p className="muted-box" style={{ margin: 0, fontSize: '13px' }}>{t('products.addAttributeHint')}</p>}
                        </div>
                        <div className="variant-actions">
                          <button type="button" onClick={() => removeVariant(idx)}>{t('common.delete')}</button>
                        </div>
                      </div>
                    ))}
                    {form.variants.length === 0 && <p className="muted-box">{t('products.noVariantsYet')}</p>}
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn-save" disabled={saving || uploadingImages}>
                  {uploadingImages ? `⏳ ${t('products.uploadingImages')}` : saving ? t('common.saving') : editingId ? t('common.saveChanges') : t('products.addProduct')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
