import pool from './connection';

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🔄 جاري إنشاء/تحديث الجداول...');

    // ===== products =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        reserved_quantity INTEGER NOT NULL DEFAULT 0,
        category VARCHAR(100) NOT NULL DEFAULT '',
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
        discount_type VARCHAR(20),
        discount_value DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // إضافة الأعمدة المفقودة إن وجدت جداول قديمة
    const alterColumns = [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published'`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_start TIMESTAMP`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_end TIMESTAMP`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'قطعة'`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[]`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100)`,
    ];

    for (const sql of alterColumns) {
      try { await client.query(sql); } catch (_) {}
    }

    // ===== product_images =====
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

    // ===== product_variants =====
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

    // ===== orders =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20),
        source VARCHAR(30) NOT NULL DEFAULT 'مباشر',
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'جديد'
          CHECK (status IN ('جديد', 'قيد التنفيذ', 'مكتمل', 'ملغي')),
        notes TEXT,
        order_number VARCHAR(50),
        payment_method VARCHAR(30),
        payment_status VARCHAR(30) DEFAULT 'غير مدفوع',
        subtotal DECIMAL(10,2),
        discount DECIMAL(10,2) DEFAULT 0,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        customer_id UUID,
        address_id UUID,
        courier_id UUID,
        scheduled_at TIMESTAMP,
        delivered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // source بدون CHECK للتوافق مع 'متجر إلكتروني'
    try {
      await client.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check`);
    } catch (_) {}

    // ===== order_items =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        is_reservation BOOLEAN NOT NULL DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    try { await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_reservation BOOLEAN NOT NULL DEFAULT false`); } catch (_) {}
    try { await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes TEXT`); } catch (_) {}

    // ===== stock_movements =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        store_id UUID NOT NULL,
        variant_id UUID,
        supplier_id UUID,
        order_id UUID,
        type VARCHAR(30) NOT NULL CHECK (type IN ('purchase', 'sale', 'return', 'adjustment', 'damage')),
        quantity_change INTEGER NOT NULL DEFAULT 0,
        quantity_before INTEGER NOT NULL DEFAULT 0,
        quantity_after INTEGER NOT NULL DEFAULT 0,
        unit_price DECIMAL(10,2) DEFAULT 0,
        note TEXT,
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const alterMovements = [
      `ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS variant_id UUID`,
      `ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS quantity_change INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS quantity_before INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS quantity_after INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS note TEXT`,
    ];
    for (const sql of alterMovements) {
      try { await client.query(sql); } catch (_) {}
    }

    // ===== notifications =====
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

    // ===== stores =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        description TEXT,
        logo_url TEXT,
        owner_id UUID,
        owner_phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    try { await client.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(20)`); } catch (_) {}
    try { await client.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE`); } catch (_) {}

    // ===== store_members =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'موظف',
        invited_by UUID,
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(store_id, user_id)
      );
    `);

    // ===== invitations =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'موظف',
        token VARCHAR(255) NOT NULL UNIQUE DEFAULT (gen_random_uuid())::text,
        invited_by UUID NOT NULL,
        accepted_at TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ===== suppliers =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        tax_number VARCHAR(100),
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        balance DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ===== categories =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL,
        parent_id UUID,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(100),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ===== customers =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        notes TEXT,
        source VARCHAR(50),
        total_orders INTEGER DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0,
        last_order_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ===== delivery_zones =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        delivery_time_min INTEGER DEFAULT 60,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ===== couriers =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS couriers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        vehicle_type VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        total_deliveries INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ===== pos_invoices =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS pos_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID,
        invoice_number VARCHAR(50),
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount DECIMAL(10,2) DEFAULT 0,
        tax DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(30) DEFAULT 'نقدي',
        status VARCHAR(20) DEFAULT 'مكتملة',
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ===== pos_invoice_items =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS pos_invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES pos_invoices(id) ON DELETE CASCADE,
        product_id UUID,
        product_name VARCHAR(255) NOT NULL,
        barcode VARCHAR(100),
        unit_price DECIMAL(10,2) NOT NULL,
        quantity DECIMAL(10,3) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ===== Triggers =====
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    for (const tbl of ['products', 'orders', 'stores', 'suppliers']) {
      await client.query(`
        DROP TRIGGER IF EXISTS trg_${tbl}_updated_at ON ${tbl};
        CREATE TRIGGER trg_${tbl}_updated_at
          BEFORE UPDATE ON ${tbl}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      `);
    }

    // ===== Indexes =====
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id)`,
      `CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`,
      `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`,
      `CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON notifications(store_id)`,
      `CREATE INDEX IF NOT EXISTS idx_store_members_store_id ON store_members(store_id)`,
      `CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id)`,
    ];

    for (const idx of indexes) {
      try { await client.query(idx); } catch (_) {}
    }

    // ===== بيانات تجريبية =====
    const existing = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(existing.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO products (name, price, quantity, reserved_quantity, category, min_quantity, sku, barcode, description, brand, cost_price, sale_price, weight_kg, tax_rate, unit, is_active, tags, status)
        VALUES
        ('عباية سوداء فاخرة', 250, 15, 0, 'عبايات', 5, 'AB-001', '1234567890123', 'عباية كاجوال بقصة واسعة', 'دار الأزياء', 180, 250, 0.8, 15, 'قطعة', true, ARRAY['كاجوال', 'أسود'], 'published'),
        ('شيلة بيضاء', 85, 3, 0, 'شيلات', 5, 'SH-002', '9876543210987', 'شيلة ناعمة مخملية', 'شيلات الشرق', 50, 85, 0.2, 5, 'قطعة', true, ARRAY['ناعم', 'أبيض'], 'published'),
        ('عطر ورد الطائف', 320, 8, 0, 'عطور', 3, 'PR-003', '4561237890123', 'عطر زهري فاخر 100مل', 'عطور العرب', 200, 320, 0.3, 15, 'زجاجة', true, ARRAY['عطر', 'ورد'], 'published'),
        ('كيس هدايا مطرز', 45, 2, 0, 'إكسسوارات', 10, 'AC-004', '3216549870123', 'كيس هدايا يدوي بتطريز لؤلؤي', 'هدايا راقية', 25, 45, 0.1, 0, 'قطعة', true, ARRAY['هدايا', 'مطرز'], 'published');
      `);

      const p1 = await client.query(`SELECT id FROM products WHERE sku = 'AB-001'`);
      if (p1.rows.length) {
        const pid = p1.rows[0].id;
        await client.query(`
          INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES
          ($1, 'https://placehold.co/600x400/333/white?text=Abaya+1', true, 0),
          ($1, 'https://placehold.co/600x400/555/white?text=Abaya+2', false, 1);
        `, [pid]);
        await client.query(`
          INSERT INTO product_variants (product_id, title, attributes, price, cost_price, quantity, sku, sort_order) VALUES
          ($1, 'مقاس M', '{"المقاس":"M"}', 250, 180, 5, 'AB-001-M', 0),
          ($1, 'مقاس L', '{"المقاس":"L"}', 250, 180, 5, 'AB-001-L', 1),
          ($1, 'مقاس XL', '{"المقاس":"XL"}', 260, 190, 3, 'AB-001-XL', 2);
        `, [pid]);
      }

      const p2 = await client.query(`SELECT id FROM products WHERE sku = 'SH-002'`);
      if (p2.rows.length) {
        await client.query(`
          INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES
          ($1, 'https://placehold.co/600x400/FFF0F5/black?text=Sheila', true, 0);
        `, [p2.rows[0].id]);
      }

      console.log('✅ تمت إضافة البيانات التجريبية');
    }

    console.log('✅ تم إنشاء/تحديث جميع الجداول بنجاح!');
  } catch (err) {
    console.error('❌ خطأ في المايغريشن:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
