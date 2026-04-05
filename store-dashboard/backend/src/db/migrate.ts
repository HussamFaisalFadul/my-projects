import pool from './connection';

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 جاري إنشاء الجداول...');

    // جدول المنتجات الأساسي (مع الحقول الجديدة)
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        category VARCHAR(100) NOT NULL,
        min_quantity INTEGER NOT NULL DEFAULT 5,
        image_url TEXT,
        sku VARCHAR(100),
        barcode VARCHAR(100),
        description TEXT,
        brand VARCHAR(100),
        cost_price DECIMAL(10,2),
        sale_price DECIMAL(10,2),
        sale_start TIMESTAMP,
        sale_end TIMESTAMP,
        weight_kg DECIMAL(10,2),
        tax_rate DECIMAL(5,2),
        unit VARCHAR(50) DEFAULT 'قطعة',
        is_active BOOLEAN DEFAULT true,
        tags TEXT[],
        status VARCHAR(50) DEFAULT 'published',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // جدول صور المنتج (متعدد)
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // جدول متغيرات المنتج (مقاسات/ألوان)
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        attributes JSONB DEFAULT '{}',
        price DECIMAL(10,2) NOT NULL,
        cost_price DECIMAL(10,2) DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        sku VARCHAR(100),
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // جدول حركات المخزون
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        store_id UUID,
        variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
        type VARCHAR(30) NOT NULL CHECK (type IN ('purchase', 'sale', 'return', 'adjustment', 'damage')),
        quantity_change INTEGER NOT NULL,
        quantity_before INTEGER NOT NULL,
        quantity_after INTEGER NOT NULL,
        unit_price DECIMAL(10,2) DEFAULT 0,
        note TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // جدول الطلبات
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        source VARCHAR(20) NOT NULL CHECK (source IN ('واتساب', 'انستغرام', 'مباشر')),
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'جديد'
          CHECK (status IN ('جديد', 'قيد التنفيذ', 'مكتمل', 'ملغي')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // جدول عناصر الطلب
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // جدول التنبيهات
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID,
        type VARCHAR(30) NOT NULL,
        message TEXT NOT NULL,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // دالة تحديث updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Triggers
    await client.query(`
      DROP TRIGGER IF EXISTS update_products_updated_at ON products;
      CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
      CREATE TRIGGER update_orders_updated_at
        BEFORE UPDATE ON orders
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);

    // بيانات تجريبية (إذا كانت المنتجات فارغة)
    const existing = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(existing.rows[0].count) === 0) {
      // إضافة منتجات تجريبية
      await client.query(`
        INSERT INTO products (name, price, quantity, category, min_quantity, sku, barcode, description, brand, cost_price, sale_price, weight_kg, tax_rate, unit, is_active, tags) VALUES
        ('عباية سوداء فاخرة', 250, 15, 'عبايات', 5, 'AB-001', '1234567890123', 'عباية كاجوال بقصة واسعة', 'دار الأزياء', 180, 250, 0.8, 15, 'قطعة', true, ARRAY['كاجوال', 'أسود']),
        ('شيلة بيضاء', 85, 3, 'شيلات', 5, 'SH-002', '9876543210987', 'شيلة ناعمة مخملية', 'شيلات الشرق', 50, 85, 0.2, 5, 'قطعة', true, ARRAY['ناعم', 'أبيض']),
        ('عطر ورد الطائف', 320, 8, 'عطور', 3, 'PR-003', '4561237890123', 'عطر زهري فاخر 100مل', 'عطور العرب', 200, 320, 0.3, 15, 'زجاجة', true, ARRAY['عطر', 'ورد']),
        ('كيس هدايا مطرز', 45, 2, 'إكسسوارات', 10, 'AC-004', '3216549870123', 'كيس هدايا يدوي بتطريز لؤلؤي', 'هدايا راقية', 25, 45, 0.1, 0, 'قطعة', true, ARRAY['هدايا', 'مطرز']);
      `);
      console.log('✅ تمت إضافة المنتجات التجريبية');

      // إضافة صور تجريبية للمنتج الأول
      const productRes = await client.query('SELECT id FROM products WHERE sku = $1', ['AB-001']);
      if (productRes.rows.length) {
        const productId = productRes.rows[0].id;
        await client.query(`
          INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES
          ($1, 'https://placehold.co/600x400/333/white?text=Abaya+1', true, 0),
          ($1, 'https://placehold.co/600x400/555/white?text=Abaya+2', false, 1);
        `, [productId]);
      }

      // إضافة متغيرات تجريبية للمنتج الأول
      if (productRes.rows.length) {
        const productId = productRes.rows[0].id;
        await client.query(`
          INSERT INTO product_variants (product_id, title, attributes, price, cost_price, quantity, sku, sort_order) VALUES
          ($1, 'مقاس M', '{"المقاس":"M"}'::jsonb, 250, 180, 5, 'AB-001-M', 0),
          ($1, 'مقاس L', '{"المقاس":"L"}'::jsonb, 250, 180, 5, 'AB-001-L', 1),
          ($1, 'مقاس XL', '{"المقاس":"XL"}'::jsonb, 260, 190, 3, 'AB-001-XL', 2);
        `, [productId]);
      }

      // إضافة صور للمنتج الثاني
      const productRes2 = await client.query('SELECT id FROM products WHERE sku = $1', ['SH-002']);
      if (productRes2.rows.length) {
        const productId = productRes2.rows[0].id;
        await client.query(`
          INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES
          ($1, 'https://placehold.co/600x400/FFF0F5/black?text=Sheila', true, 0);
        `, [productId]);
      }
    }

    console.log('✅ تم إنشاء جميع الجداول بنجاح!');
  } catch (err) {
    console.error('❌ خطأ في إنشاء الجداول:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
