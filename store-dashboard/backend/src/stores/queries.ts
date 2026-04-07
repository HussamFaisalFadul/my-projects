import pool from '../db/connection';
import { Store, StoreMember, Invitation, User } from '../types';

// ===== دالة مساعدة لتوليد slug فريد =====
async function generateUniqueSlug(baseName: string): Promise<string> {
  let slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) slug = 'store';
  let unique = slug;
  let counter = 1;
  while (true) {
    const exists = await pool.query('SELECT id FROM stores WHERE slug = $1', [unique]);
    if (exists.rows.length === 0) return unique;
    unique = `${slug}-${counter++}`;
  }
}

// ===== المتاجر =====

export async function createStore(
  name: string,
  ownerId: string,
  description?: string
): Promise<Store> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const slug = await generateUniqueSlug(name);

    const storeResult = await client.query(
      `INSERT INTO stores (name, slug, description, owner_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, slug, description || null, ownerId]
    );
    const store = storeResult.rows[0];

    await client.query(
      `INSERT INTO store_members (store_id, user_id, role)
       VALUES ($1, $2, 'مالك')`,
      [store.id, ownerId]
    );

    await client.query('COMMIT');
    return mapStore(store);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getStoreById(storeId: string): Promise<Store | null> {
  const result = await pool.query('SELECT * FROM stores WHERE id = $1', [storeId]);
  return result.rows[0] ? mapStore(result.rows[0]) : null;
}

export async function getUserStores(userId: string): Promise<(Store & { role: string })[]> {
  const result = await pool.query(
    `SELECT s.*, sm.role
     FROM stores s
     JOIN store_members sm ON s.id = sm.store_id
     WHERE sm.user_id = $1
     ORDER BY sm.joined_at ASC`,
    [userId]
  );
  return result.rows.map(r => ({ ...mapStore(r), role: r.role }));
}

export async function updateStore(
  storeId: string,
  data: { name?: string; description?: string; logoUrl?: string }
): Promise<Store | null> {
  const result = await pool.query(
    `UPDATE stores SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       logo_url = COALESCE($3, logo_url),
       updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [data.name || null, data.description || null, data.logoUrl || null, storeId]
  );
  return result.rows[0] ? mapStore(result.rows[0]) : null;
}

// ===== الأعضاء =====

export async function getStoreMembers(storeId: string): Promise<StoreMember[]> {
  const result = await pool.query(
    `SELECT sm.*, u.name as user_name, u.email as user_email, u.avatar_url
     FROM store_members sm
     JOIN users u ON sm.user_id = u.id
     WHERE sm.store_id = $1
     ORDER BY sm.joined_at ASC`,
    [storeId]
  );
  return result.rows.map(mapMember);
}

export async function getMemberRole(storeId: string, userId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT role FROM store_members WHERE store_id = $1 AND user_id = $2',
    [storeId, userId]
  );
  return result.rows[0]?.role || null;
}

export async function removeMember(storeId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM store_members WHERE store_id = $1 AND user_id = $2 AND role != $3',
    [storeId, userId, 'مالك']
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateMemberRole(storeId: string, userId: string, role: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE store_members SET role = $1
     WHERE store_id = $2 AND user_id = $3 AND role != 'مالك'`,
    [role, storeId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ===== الدعوات =====

export async function createInvitation(
  storeId: string,
  email: string,
  role: string,
  invitedBy: string
): Promise<Invitation> {
  const existing = await pool.query(
    `SELECT id FROM invitations
     WHERE store_id = $1 AND email = $2 AND accepted_at IS NULL AND expires_at > NOW()`,
    [storeId, email]
  );
  if (existing.rows.length > 0) {
    await pool.query(
      'DELETE FROM invitations WHERE store_id = $1 AND email = $2 AND accepted_at IS NULL',
      [storeId, email]
    );
  }

  const result = await pool.query(
    `INSERT INTO invitations (store_id, email, role, invited_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [storeId, email, role, invitedBy]
  );
  return mapInvitation(result.rows[0]);
}

export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  const result = await pool.query(
    `SELECT * FROM invitations
     WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
    [token]
  );
  return result.rows[0] ? mapInvitation(result.rows[0]) : null;
}

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ storeId: string; role: string } | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invResult = await client.query(
      `UPDATE invitations SET accepted_at = NOW()
       WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()
       RETURNING *`,
      [token]
    );
    if (invResult.rows.length === 0) return null;

    const inv = invResult.rows[0];

    const existing = await client.query(
      'SELECT id FROM store_members WHERE store_id = $1 AND user_id = $2',
      [inv.store_id, userId]
    );

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO store_members (store_id, user_id, role, invited_by)
         VALUES ($1, $2, $3, $4)`,
        [inv.store_id, userId, inv.role, inv.invited_by]
      );
    }

    await client.query('COMMIT');
    return { storeId: inv.store_id, role: inv.role };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getStoreInvitations(storeId: string): Promise<Invitation[]> {
  const result = await pool.query(
    `SELECT * FROM invitations WHERE store_id = $1 ORDER BY created_at DESC`,
    [storeId]
  );
  return result.rows.map(mapInvitation);
}

// ===== تحويل البيانات =====

function mapStore(row: any): Store {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug, // ⬅️ أضف هذا السطر
    description: row.description,
    logoUrl: row.logo_url,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: any): StoreMember {
  return {
    id: row.id,
    storeId: row.store_id,
    userId: row.user_id,
    role: row.role,
    invitedBy: row.invited_by,
    joinedAt: row.joined_at,
    user: row.user_name
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          role: row.role,
          avatarUrl: row.avatar_url,
        }
      : undefined,
  };
}

function mapInvitation(row: any): Invitation {
  return {
    id: row.id,
    storeId: row.store_id,
    email: row.email,
    role: row.role,
    token: row.token,
    invitedBy: row.invited_by,
    acceptedAt: row.accepted_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}
