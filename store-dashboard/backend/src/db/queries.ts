import pool from './connection';
import { Product, Order, Notification } from '../types';

// ===== المنتجات (مع الصور والمتغيرات) =====

export async function getProducts(storeId: string): Promise<Product[]> {
  const result = await pool.query(
    `SELECT p.*,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', pi.id,
          'productId', pi.product_id,
          'url', pi.url,
          'isPrimary', pi.is_primary,
          'sortOrder', pi.sort_order,
          'createdAt', pi.created_at
        )) FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) AS images,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', pv.id,
          'productId', pv.product_id,
          'title', pv.title,
          'attributes', pv.attributes,
          'price', pv.price,
          'costPrice', pv.cost_price,
          'quantity', pv.quantity,
          'sku', pv.sku,
          'imageUrl', pv.image_url,
          'isActive', pv.is_active,
          'sortOrder', pv.sort_order,
          'createdAt', pv.created_at
        )) FILTER (WHERE pv.id IS NOT NULL),
        '[]'
      ) AS variants
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.store_id = $1
    GROUP BY p.id
    ORDER BY p.created_at DESC`,
    [storeId]
  );
  return result.rows.map(mapProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const result = await pool.query(
    `SELECT p.*,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', pi.id,
          'productId', pi.product_id,
          'url', pi.url,
          'isPrimary', pi.is_primary,
          'sortOrder', pi.sort_order,
          'createdAt', pi.created_at
        )) FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) AS images,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', pv.id,
          'productId', pv.product_id,
          'title', pv.title,
          'attributes', pv.attributes,
          'price', pv.price,
          'costPrice', pv.cost_price,
          'quantity', pv.quantity,
          'sku', pv.sku,
          'imageUrl', pv.image_url,
          'isActive', pv.is_active,
          'sortOrder', pv.sort_order,
          'createdAt', pv.created_at
        )) FILTER (WHERE pv.id IS NOT NULL),
        '[]'
      ) AS variants
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.id = $1
    GROUP BY p.id`,
    [id]
  );
  return result.rows[0] ? mapProduct(result.rows[0]) : null;
}

export async function addProduct(data: any): Promise<Product> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO products 
      (store_id, name, price, quantity, category, min_quantity, image_url,
       sku, barcode, description, brand, cost_price, sale_price, sale_start, sale_end,
       weight_kg, tax_rate, unit, is_active, tags, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING *`,
      [
        data.storeId, data.name, data.price, data.quantity ?? 0,
        data.category || '', data.minQuantity ?? 5, data.imageUrl || null,
        data.sku || null, data.barcode || null, data.description || null,
        data.brand || null, data.costPrice || null, data.salePrice || null,
        data.saleStart || null, data.saleEnd || null, data.weightKg || null,
        data.taxRate || null, data.unit || 'قطعة', data.isActive !== false,
        data.tags || null, data.status || 'published',
      ]
    );
    const product = result.rows[0];

    // حفظ الصور
    if (data.images && data.images.length > 0) {
      for (const img of data.images) {
        await client.query(
          `INSERT INTO product_images (product_id, url, is_primary, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [product.id, img.url, img.isPrimary || false, img.sortOrder || 0]
        );
      }
    }

    // حفظ المتغيرات
    if (data.variants && data.variants.length > 0) {
      for (const v of data.variants) {
        await client.query(
          `INSERT INTO product_variants 
           (product_id, title, attributes, price, cost_price, quantity, sku, image_url, is_active, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [product.id, v.title, JSON.stringify(v.attributes || {}), v.price,
           v.costPrice || 0, v.quantity || 0, v.sku || null, v.imageUrl || null,
           v.isActive !== false, v.sortOrder || 0]
        );
      }
    }

    // تسجيل حركة مخزون أولية
    if ((data.quantity ?? 0) > 0) {
      await client.query(
        `INSERT INTO stock_movements 
         (product_id, store_id, type, quantity_change, quantity_before, quantity_after, note, created_by)
         VALUES ($1,$2,'purchase',$3,0,$4,'مخزون أولي عند الإضافة',$5)`,
        [product.id, data.storeId, data.quantity, data.quantity, data.createdBy || null]
      );
    }

    await client.query('COMMIT');
    return mapProduct(product);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateProduct(id: string, data: any): Promise<Product | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // تحديث الحقول الأساسية
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    const fieldMap: Record<string, string> = {
      name: 'name', price: 'price', quantity: 'quantity',
      category: 'category', minQuantity: 'min_quantity', imageUrl: 'image_url',
      sku: 'sku', barcode: 'barcode', description: 'description', brand: 'brand',
      costPrice: 'cost_price', salePrice: 'sale_price', saleStart: 'sale_start',
      saleEnd: 'sale_end', weightKg: 'weight_kg', taxRate: 'tax_rate',
      unit: 'unit', isActive: 'is_active', tags: 'tags', status: 'status',
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(data[key]);
      }
    }
    if (fields.length > 0) {
      fields.push(`updated_at = NOW()`);
      values.push(id);
      await client.query(`UPDATE products SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }

    // تحديث الصور
    if (data.images !== undefined) {
      await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
      for (const img of data.images) {
        await client.query(
          `INSERT INTO product_images (product_id, url, is_primary, sort_order)
           VALUES ($1,$2,$3,$4)`,
          [id, img.url, img.isPrimary || false, img.sortOrder || 0]
        );
      }
    }

    // تحديث المتغيرات
    if (data.variants !== undefined) {
      await client.query('DELETE FROM product_variants WHERE product_id = $1', [id]);
      for (const v of data.variants) {
        await client.query(
          `INSERT INTO product_variants 
           (product_id, title, attributes, price, cost_price, quantity, sku, image_url, is_active, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [id, v.title, JSON.stringify(v.attributes || {}), v.price,
           v.costPrice || 0, v.quantity || 0, v.sku || null, v.imageUrl || null,
           v.isActive !== false, v.sortOrder || 0]
        );
      }
    }

    await client.query('COMMIT');
    return getProductById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// ===== حركات المخزون =====

export async function getStockMovements(productId: string): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM stock_movements WHERE product_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [productId]
  );
  return result.rows;
}

export async function addStockMovement(data: {
  productId: string;
  storeId: string;
  type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage';
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  unitPrice?: number;
  note?: string;
  createdBy?: string;
}): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // تحديث المنتج
    await client.query(
      `UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2`,
      [data.quantityAfter, data.productId]
    );
    // إدراج الحركة
    const result = await client.query(
      `INSERT INTO stock_movements 
       (product_id, store_id, type, quantity_change, quantity_before, quantity_after, unit_price, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [data.productId, data.storeId, data.type, data.quantityChange,
       data.quantityBefore, data.quantityAfter, data.unitPrice || 0,
       data.note || null, data.createdBy || null]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ===== الطلبات (مع تسجيل حركة البيع) =====

export async function addOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `INSERT INTO orders (store_id, customer_name, customer_phone, source, total_price, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.storeId, data.customerName, data.customerPhone, data.source, data.totalPrice, data.status, data.notes || null]
    );
    const order = orderResult.rows[0];

    for (const item of data.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, item.productId, item.productName, item.quantity, item.price]
      );

      // تحديث المخزون وتسجيل الحركة
      const current = await client.query(
        'SELECT quantity FROM products WHERE id = $1 FOR UPDATE',
        [item.productId]
      );
      const before = current.rows[0]?.quantity ?? 0;
      const after = Math.max(0, before - item.quantity);
      await client.query(
        'UPDATE products SET quantity = $1 WHERE id = $2',
        [after, item.productId]
      );
      await client.query(
        `INSERT INTO stock_movements 
         (product_id, store_id, type, quantity_change, quantity_before, quantity_after, unit_price, note)
         VALUES ($1,$2,'sale',$3,$4,$5,$6,$7)`,
        [item.productId, data.storeId, -item.quantity, before, after, item.price, `طلب #${order.id.slice(0,8)}`]
      );
    }

    await client.query('COMMIT');
    return { ...mapOrder(order), items: data.items };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ===== باقي الدوال (getStats, getNotifications, mapProduct, etc) كما هي في ملفك الأصلي =====
// ... أضف هنا دوال getStats, getNotifications, mapProduct, mapOrder, mapNotification
// لأنها طويلة لكنها موجودة مسبقاً في ملفك.
// فقط تأكد من أن mapProduct تعيد images و variants كما في الجدول أعلاه.

// ===== دوال الصور والمتغيرات (للـ API) =====
export async function addProductImage(...) { /* كما في السابق */ }
export async function getProductImages(...) { /* كما في السابق */ }
export async function deleteProductImage(...) { /* كما في السابق */ }
export async function addProductVariant(...) { /* كما في السابق */ }
export async function getProductVariants(...) { /* كما في السابق */ }
export async function deleteProductVariant(...) { /* كما في السابق */ }
