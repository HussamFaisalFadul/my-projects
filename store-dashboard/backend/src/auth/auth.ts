import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/connection';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_change_in_production';
const JWT_EXPIRES = '7d';

export interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

// ===== التوكن =====
export function generateToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

// ===== الإيميل وكلمة المرور =====
export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ user: UserPayload; token: string } | null> {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) return null;

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, email, passwordHash]
  );

  const user = mapUser(result.rows[0]);
  return { user, token: generateToken(user) };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: UserPayload; token: string } | null> {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  if (!row.password_hash) return null;

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;

  const user = mapUser(row);
  return { user, token: generateToken(user) };
}

// ===== جوجل OAuth =====
export async function findOrCreateGoogleUser(
  googleId: string,
  email: string,
  name: string,
  avatarUrl?: string
): Promise<{ user: UserPayload; token: string }> {
  let result = await pool.query(
    'SELECT * FROM users WHERE google_id = $1 OR email = $2',
    [googleId, email]
  );

  let row;
  if (result.rows.length === 0) {
    const insert = await pool.query(
      `INSERT INTO users (name, email, google_id, avatar_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email, googleId, avatarUrl || null]
    );
    row = insert.rows[0];
  } else {
    row = result.rows[0];
    if (!row.google_id) {
      await pool.query(
        'UPDATE users SET google_id = $1, avatar_url = $2 WHERE id = $3',
        [googleId, avatarUrl, row.id]
      );
      row.google_id = googleId;
      row.avatar_url = avatarUrl;
    }
  }

  const user = mapUser(row);
  return { user, token: generateToken(user) };
}

// ===== الميدلوير =====
export function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول' });
  }

  const token = header.split(' ')[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'الجلسة منتهية، يرجى تسجيل الدخول مجدداً' });
  }

  req.user = user;
  next();
}

export function adminMiddleware(req: any, res: any, next: any) {
  if (req.user?.role !== 'مدير') {
    return res.status(403).json({ error: 'هذه العملية تتطلب صلاحية مدير' });
  }
  next();
}

function mapUser(row: any): UserPayload {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || 'مستخدم',
    avatarUrl: row.avatar_url,
  };
}
