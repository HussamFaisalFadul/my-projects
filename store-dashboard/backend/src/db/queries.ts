import pool from './connection';
import { Product, Order, Notification } from '../types';

// ===== المنتجات =====

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
      ) AS images
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
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
      ) AS variants,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', sm.id,
          'productId', sm.product_id,
          'storeId', sm.store_id,
          'variantId', sm.variant_id,
          'type', sm.type,
          'quantityChange', sm.quantity_change,
          'quantityBefore', sm.quantity_before,
          'quantityAfter', sm.quantity_after,
          'unitPrice', sm.unit_price,
          'note', sm.note,
          'createdBy', sm.created_by,
          'createdAt', sm.created_at
        )) FILTER (WHERE sm.id IS NOT NULL),
        '[]'
      ) AS stock_movements
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN stock_movements sm ON sm.product_id = p.id
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
        (store_id, name, price, quantity, reserved_quantity, category, min_quantity, image_url,
         sku, barcode, description, brand, cost_price, sale_price, sale_start, sale_end,
         weight_kg, tax_rate, unit, is_active, tags, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [
        data.storeId,
        data.name,
        data.price,
        data.quantity ?? 0,
        0,
        data.category || '',
        data.minQuantity ?? 5,
        data.imageUrl || null,
        data.sku || null,
        data.barcode || null,
        data.description || null,
        data.brand || null,
        data.costPrice || null,
        data.salePrice || null,
        data.saleStart || null,
        data.saleEnd || null,
        data.weightKg || null,
        data.taxRate || null,
        data.unit || 'قطعة',
        data.isActive !== false,
        data.tags || null,
        data.status || 'published',
      ]
    );
    const product = result.rows[0];

    if (data.images && data.images.length > 0) {
      for (const img of data.images) {
        await client.query(
          `INSERT INTO product_images (product_id, url, is_primary, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [product.id, img.url, img.isPrimary ?? img.is_primary ?? false, img.sortOrder ?? img.sort_order ?? 0]
        );
      }
    }

    if (data.variants && data.variants.length > 0) {
      for (const v of data.variants) {
        await client.query(
          `INSERT INTO product_variants (product_id, title, attributes, price, cost_price, quantity, sku, image_url, is_active, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [product.id, v.title, JSON.stringify(v.attributes || {}), v.price, v.costPrice ?? 0, v.quantity ?? 0, v.sku || null, v.imageUrl || null, v.isActive !== false, v.sortOrder ?? 0]
        );
      }
    }

    if ((data.quantity ?? 0) > 0) {
      await client.query(
        `INSERT INTO stock_movements
          (product_id, store_id, type, quantity_change, quantity_before, quantity_after, unit_price, note, created_by)
         VALUES ($1,$2,'purchase',$3,0,$4,0,'مخزون أولي عند الإضافة',$5)`,
        [product.id, data.storeId, data.quantity, data.quantity, data.createdBy || null]
      );
    }

    await client.query('COMMIT');

    const imagesResult = await pool.query(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order',
      [product.id]
    );
    return mapProduct({ ...product, images: imagesResult.rows, variants: [], stock_movements: [] });
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

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      price: 'price',
      quantity: 'quantity',
      reservedQuantity: 'reserved_quantity',
      reserved_quantity: 'reserved_quantity',
      category: 'category',
      minQuantity: 'min_quantity',
      imageUrl: 'image_url',
      sku: 'sku',
      barcode: 'barcode',
      description: 'description',
      brand: 'brand',
      costPrice: 'cost_price',
      salePrice: 'sale_price',
      saleStart: 'sale_start',
      saleEnd: 'sale_end',
      weightKg: 'weight_kg',
      taxRate: 'tax_rate',
      unit: 'unit',
      isActive: 'is_active',
      tags: 'tags',
      status: 'status',
      discountType: 'discount_type',
      discountValue: 'discount_value',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(data[key]);
      }
    }

    let product: any;

    if (fields.length > 0) {
      fields.push(`updated_at = NOW()`);
      values.push(id);
      const result = await client.query(
        `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      product = result.rows[0];
    } else {
      const result = await client.query('SELECT * FROM products WHERE id = $1', [id]);
      product = result.rows[0];
    }

    if (!product) {
      await client.query('ROLLBACK');
      return null;
    }

    if (data.images !== undefined) {
      await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
      for (const img of data.images) {
        await client.query(
          `INSERT INTO product_images (product_id, url, is_primary, sort_order)
           VALUES ($1,$2,$3,$4)`,
          [id, img.url, img.isPrimary ?? img.is_primary ?? false, img.sortOrder ?? img.sort_order ?? 0]
        );
      }
    }

    if (data.variants !== undefined) {
      await client.query('DELETE FROM product_variants WHERE product_id = $1', [id]);
      for (const v of data.variants) {
        await client.query(
          `INSERT INTO product_variants (product_id, title, attributes, price, cost_price, quantity, sku, image_url, is_active, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [id, v.title, JSON.stringify(v.attributes || {}), v.price, v.costPrice ?? 0, v.quantity ?? 0, v.sku || null, v.imageUrl || null, v.isActive !== false, v.sortOrder ?? 0]
        );
      }
    }

    await client.query('COMMIT');

    const imagesResult = await pool.query(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order',
      [id]
    );
    const variantsResult = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort_order',
      [id]
    );
    return mapProduct({ ...product, images: imagesResult.rows, variants: variantsResult.rows, stock_movements: [] });
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

// ===== صور المنتج =====

export async function addProductImage(
  productId: string,
  url: string,
  isPrimary: boolean = false,
  sortOrder: number = 0
) {
  const result = await pool.query(
    `INSERT INTO product_images (product_id, url, is_primary, sort_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [productId, url, isPrimary, sortOrder]
  );
  return result.rows[0];
}

export async function getProductImages(productId: string) {
  const result = await pool.query(
    `SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC`,
    [productId]
  );
  return result.rows;
}

export async function deleteProductImage(imageId: string) {
  await pool.query('DELETE FROM product_images WHERE id = $1', [imageId]);
}

// ===== متغيرات المنتج =====

export async function addProductVariant(
  productId: string,
  title: string,
  attributes: Record<string, string> = {},
  price: number = 0,
  costPrice: number = 0,
  quantity: number = 0,
  sku?: string,
  imageUrl?: string,
  isActive: boolean = true,
  sortOrder: number = 0
) {
  const result = await pool.query(
    `INSERT INTO product_variants
      (product_id, title, attributes, price, cost_price, quantity, sku, image_url, is_active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [productId, title, JSON.stringify(attributes), price, costPrice, quantity, sku || null, imageUrl || null, isActive, sortOrder]
  );
  return result.rows[0];
}

export async function getProductVariants(productId: string) {
  const result = await pool.query(
    `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort_order ASC`,
    [productId]
  );
  return result.rows;
}

export async function deleteProductVariant(variantId: string) {
  await pool.query('DELETE FROM product_variants WHERE id = $1', [variantId]);
}

// ===== حركة المخزون =====

export async function addStockMovement(data: {
  productId: string;
  storeId: string;
  variantId?: string;
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

    await client.query(
      'UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2',
      [data.quantityAfter, data.productId]
    );

    const result = await client.query(
      `INSERT INTO stock_movements
        (product_id, store_id, variant_id, type, quantity_change, quantity_before, quantity_after, unit_price, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        data.productId,
        data.storeId,
        data.variantId || null,
        data.type,
        data.quantityChange,
        data.quantityBefore,
        data.quantityAfter,
        data.unitPrice ?? 0,
        data.note || null,
        data.createdBy || null,
      ]
    );

    await client.query('COMMIT');
    return mapStockMovement(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getStockMovements(productId: string): Promise<any[]> {
  const result = await pool.query(
    'SELECT * FROM stock_movements WHERE product_id = $1 ORDER BY created_at DESC LIMIT 100',
    [productId]
  );
  return result.rows.map(mapStockMovement);
}

// ===== الطلبات =====

export async function getOrders(storeId: string): Promise<Order[]> {
  const ordersResult = await pool.query(
    'SELECT * FROM orders WHERE store_id = $1 ORDER BY created_at DESC',
    [storeId]
  );
  const orders = ordersResult.rows;
  if (orders.length === 0) return [];

  const itemsResult = await pool.query(
    'SELECT * FROM order_items WHERE order_id = ANY($1)',
    [orders.map(o => o.id)]
  );

  return orders.map(order => ({
    ...mapOrder(order),
    items: itemsResult.rows
      .filter(item => item.order_id === order.id)
      .map(item => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        price: parseFloat(item.price),
        isReservation: item.is_reservation || false,
      })),
  }));
}

export async function addOrder(
  data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> & { items: any[] }
): Promise<Order> {
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
      const isReservation = item.isReservation === true;

      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, is_reservation, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, item.productId, item.productName, item.quantity, item.price, isReservation, isReservation ? 'حجز' : '']
      );

      if (isReservation) {
        await client.query(
          `UPDATE products SET reserved_quantity = reserved_quantity + $1, updated_at = NOW() WHERE id = $2`,
          [item.quantity, item.productId]
        );
      } else {
        const current = await client.query(
          'SELECT quantity FROM products WHERE id = $1 FOR UPDATE',
          [item.productId]
        );
        const before = current.rows[0]?.quantity ?? 0;
        const after = Math.max(0, before - item.quantity);
        await client.query(
          'UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2',
          [after, item.productId]
        );
        await client.query(
          `INSERT INTO stock_movements
            (product_id, store_id, type, quantity_change, quantity_before, quantity_after, unit_price, note)
           VALUES ($1,$2,'sale',$3,$4,$5,$6,$7)`,
          [item.productId, data.storeId, -item.quantity, before, after, item.price, `طلب #${order.id.slice(0, 8)}`]
        );
      }
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

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order | null> {
  const result = await pool.query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  if (!result.rows[0]) return null;

  const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
  return {
    ...mapOrder(result.rows[0]),
    items: items.rows.map(i => ({
      productId: i.product_id,
      productName: i.product_name,
      quantity: i.quantity,
      price: parseFloat(i.price),
      isReservation: i.is_reservation || false,
    })),
  };
}

// ===== الإحصائيات =====

export async function getStats(storeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [products, todayOrders, totalOrders, lowStock, topProducts] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM products WHERE store_id = $1 AND is_active = true', [storeId]),
    pool.query(
      'SELECT COUNT(*), COALESCE(SUM(total_price), 0) as revenue FROM orders WHERE store_id = $1 AND created_at >= $2',
      [storeId, today]
    ),
    pool.query('SELECT COUNT(*) FROM orders WHERE store_id = $1', [storeId]),
    pool.query(
      'SELECT * FROM products WHERE store_id = $1 AND quantity <= min_quantity ORDER BY quantity ASC LIMIT 10',
      [storeId]
    ),
    pool.query(
      `SELECT p.*, COALESCE(SUM(oi.quantity), 0) AS sold_count
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       WHERE p.store_id = $1
       GROUP BY p.id
       ORDER BY sold_count DESC
       LIMIT 5`,
      [storeId]
    ),
  ]);

  return {
    totalProducts: parseInt(products.rows[0].count),
    totalOrders: parseInt(totalOrders.rows[0].count),
    todayOrders: parseInt(todayOrders.rows[0].count),
    todayRevenue: parseFloat(todayOrders.rows[0].revenue),
    lowStockProducts: lowStock.rows.map(r => mapProduct({ ...r, images: [], variants: [], stock_movements: [] })),
    topProducts: topProducts.rows.map(p => ({
      product: mapProduct({ ...p, images: [], variants: [], stock_movements: [] }),
      soldCount: parseInt(p.sold_count),
    })),
  };
}

// ===== الإشعارات =====

export async function getNotifications(storeId: string): Promise<Notification[]> {
  const result = await pool.query(
    'SELECT * FROM notifications WHERE store_id = $1 ORDER BY created_at DESC LIMIT 50',
    [storeId]
  );
  return result.rows.map(mapNotification);
}

export async function addNotification(
  storeId: string,
  type: Notification['type'],
  message: string,
  extra?: { productId?: string; orderId?: string }
): Promise<Notification> {
  const result = await pool.query(
    `INSERT INTO notifications (store_id, type, message, product_id, order_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [storeId, type, message, extra?.productId || null, extra?.orderId || null]
  );
  return mapNotification(result.rows[0]);
}

// ===== Mappers =====

function mapProduct(row: any): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    price: parseFloat(row.price),
    quantity: row.quantity ?? 0,
    reservedQuantity: row.reserved_quantity ?? 0,
    category: row.category ?? '',
    minQuantity: row.min_quantity ?? 5,
    imageUrl: row.image_url ?? undefined,
    sku: row.sku ?? undefined,
    barcode: row.barcode ?? undefined,
    description: row.description ?? undefined,
    brand: row.brand ?? undefined,
    costPrice: row.cost_price ? parseFloat(row.cost_price) : undefined,
    salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
    saleStart: row.sale_start ?? undefined,
    saleEnd: row.sale_end ?? undefined,
    weightKg: row.weight_kg ? parseFloat(row.weight_kg) : undefined,
    taxRate: row.tax_rate ? parseFloat(row.tax_rate) : undefined,
    unit: row.unit ?? 'قطعة',
    isActive: row.is_active ?? true,
    tags: row.tags ?? undefined,
    status: row.status ?? 'published',
    discountType: row.discount_type ?? undefined,
    discountValue: row.discount_value ? parseFloat(row.discount_value) : undefined,
    images: Array.isArray(row.images) ? row.images : [],
    variants: Array.isArray(row.variants) ? row.variants.map(mapVariantRow) : [],
    stockMovements: Array.isArray(row.stock_movements)
      ? row.stock_movements.map(mapStockMovement)
      : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVariantRow(v: any): any {
  return {
    id: v.id,
    productId: v.productId ?? v.product_id,
    title: v.title,
    attributes: v.attributes ?? {},
    price: typeof v.price === 'number' ? v.price : parseFloat(v.price ?? 0),
    costPrice: typeof v.costPrice === 'number' ? v.costPrice : parseFloat(v.costPrice ?? v.cost_price ?? 0),
    quantity: v.quantity ?? 0,
    sku: v.sku ?? undefined,
    imageUrl: v.imageUrl ?? v.image_url ?? undefined,
    isActive: v.isActive ?? v.is_active ?? true,
    sortOrder: v.sortOrder ?? v.sort_order ?? 0,
    createdAt: v.createdAt ?? v.created_at,
  };
}

function mapStockMovement(row: any): any {
  return {
    id: row.id,
    productId: row.product_id ?? row.productId,
    storeId: row.store_id ?? row.storeId,
    variantId: row.variant_id ?? row.variantId ?? undefined,
    type: row.type,
    quantityChange: row.quantity_change ?? row.quantityChange ?? 0,
    quantityBefore: row.quantity_before ?? row.quantityBefore ?? 0,
    quantityAfter: row.quantity_after ?? row.quantityAfter ?? 0,
    unitPrice: row.unit_price ? parseFloat(row.unit_price) : 0,
    note: row.note ?? row.notes ?? undefined,
    createdBy: row.created_by ?? row.createdBy ?? undefined,
    createdAt: row.created_at ?? row.createdAt,
  };
}

function mapOrder(row: any): Omit<Order, 'items'> & { items: any[] } {
  return {
    id: row.id,
    storeId: row.store_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    source: row.source,
    totalPrice: parseFloat(row.total_price),
    status: row.status,
    notes: row.notes ?? undefined,
    items: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    storeId: row.store_id ?? undefined,
    type: row.type,
    message: row.message,
    productId: row.product_id ?? undefined,
    orderId: row.order_id ?? undefined,
    read: row.read,
    createdAt: row.created_at,
  };
}
