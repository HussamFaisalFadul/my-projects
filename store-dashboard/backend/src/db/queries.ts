import pool from './connection';
import { Product, Order, Notification } from '../types';

// ===== المنتجات =====

export async function getProducts(): Promise<Product[]> {
  const result = await pool.query(
    'SELECT * FROM products ORDER BY created_at DESC'
  );
  return result.rows.map(mapProduct);
}

export async function addProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const result = await pool.query(
    `INSERT INTO products (name, price, quantity, category, min_quantity, image_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.name, data.price, data.quantity, data.category, data.minQuantity, data.imageUrl || null]
  );
  return mapProduct(result.rows[0]);
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
  if (data.price !== undefined) { fields.push(`price = $${idx++}`); values.push(data.price); }
  if (data.quantity !== undefined) { fields.push(`quantity = $${idx++}`); values.push(data.quantity); }
  if (data.category !== undefined) { fields.push(`category = $${idx++}`); values.push(data.category); }
  if (data.minQuantity !== undefined) { fields.push(`min_quantity = $${idx++}`); values.push(data.minQuantity); }

  if (fields.length === 0) return null;

  values.push(id);
  const result = await pool.query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] ? mapProduct(result.rows[0]) : null;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// ===== الطلبات =====

export async function getOrders(): Promise<Order[]> {
  const ordersResult = await pool.query(
    'SELECT * FROM orders ORDER BY created_at DESC'
  );
  const orders = ordersResult.rows;

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
      }))
  }));
}

export async function addOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `INSERT INTO orders (customer_name, customer_phone, source, total_price, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.customerName, data.customerPhone, data.source, data.totalPrice, data.status, data.notes || null]
    );
    const order = orderResult.rows[0];

    for (const item of data.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.productId, item.productName, item.quantity, item.price]
      );

      await client.query(
        `UPDATE products SET quantity = GREATEST(0, quantity - $1) WHERE id = $2`,
        [item.quantity, item.productId]
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

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order | null> {
  const result = await pool.query(
    `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
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
    }))
  };
}

// ===== الإحصائيات =====

export async function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [products, todayOrders, totalOrders, lowStock, topProducts] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM products'),
    pool.query('SELECT COUNT(*), COALESCE(SUM(total_price), 0) as revenue FROM orders WHERE created_at >= $1', [today]),
    pool.query('SELECT COUNT(*) FROM orders'),
    pool.query('SELECT * FROM products WHERE quantity <= min_quantity ORDER BY quantity ASC'),
    pool.query(`
      SELECT p.*, COALESCE(SUM(oi.quantity), 0) as sold_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY sold_count DESC
      LIMIT 5
    `)
  ]);

  return {
    totalProducts: parseInt(products.rows[0].count),
    totalOrders: parseInt(totalOrders.rows[0].count),
    todayOrders: parseInt(todayOrders.rows[0].count),
    todayRevenue: parseFloat(todayOrders.rows[0].revenue),
    lowStockProducts: lowStock.rows.map(mapProduct),
    topProducts: topProducts.rows.map(p => ({
      product: mapProduct(p),
      soldCount: parseInt(p.sold_count)
    }))
  };
}

// ===== التنبيهات =====

export async function getNotifications(): Promise<Notification[]> {
  const result = await pool.query(
    'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
  );
  return result.rows.map(mapNotification);
}

export async function addNotification(
  type: Notification['type'],
  message: string,
  extra?: { productId?: string; orderId?: string }
): Promise<Notification> {
  const result = await pool.query(
    `INSERT INTO notifications (type, message, product_id, order_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [type, message, extra?.productId || null, extra?.orderId || null]
  );
  return mapNotification(result.rows[0]);
}

// ===== تحويل البيانات =====

function mapProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    price: parseFloat(row.price),
    quantity: row.quantity,
    category: row.category,
    minQuantity: row.min_quantity,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrder(row: any): Omit<Order, 'items'> & { items: any[] } {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    source: row.source,
    totalPrice: parseFloat(row.total_price),
    status: row.status,
    notes: row.notes,
    items: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    productId: row.product_id,
    orderId: row.order_id,
    read: row.read,
    createdAt: row.created_at,
  };
}
