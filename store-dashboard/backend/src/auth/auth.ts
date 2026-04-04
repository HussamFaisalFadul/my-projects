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

// --- وظائف التوكن ---
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

// --- دالة النجاح المعدلة لـ Vercel (حل مشكلة الصفحة الفارغة) ---
export const handleLoginSuccess = async (reply: any, user: UserPayload) => {
  const token = generateToken(user);

  // تخزين في الجلسة (للسيرفر)
  if (reply.request.session) {
    reply.request.session.user = user;
  }

  // إرسال الكوكيز بإعدادات تسمح بمروره للمتصفح (للفورنت أند)
  reply.setCookie('auth_token', token, {
    path: '/',
    secure: true,      // ضروري لـ Vercel (HTTPS)
    sameSite: 'none',  // ضروري لأن الدومين مختلف
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7 // أسبوع
  });

  return reply.send({ 
    success: true, 
    user, 
    token // نرسل التوكن أيضاً في الجسم لضمان وصوله للـ Flutter
  });
};

// --- عمليات مستخدم الإيميل ---
export async function registerUser(name: string, email: string, password: string) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) return null;

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'مستخدم') RETURNING *`,
    [name, email, passwordHash]
  );

  return mapUser(result.rows[0]);
}

export async function loginUser(email: string, password: string) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  if (!row.password_hash) return null;

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;

  return mapUser(row);
}

// --- الميدلوير (Middlewares) ---
export function authMiddleware(req: any, res: any, next: any) {
  // نتحقق أولاً من الهيدر (Bearer) ثم من الكوكيز كخيار احتياطي
  const header = req.headers.authorization;
  let token = (header && header.startsWith('Bearer ')) ? header.split(' ')[1] : req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول' });
  }

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

// محول البيانات
function mapUser(row: any): UserPayload {
  return {
    id: row.id.toString(),
    name: row.name,
    email: row.email,
    role: row.role || 'مستخدم',
    avatarUrl: row.avatar_url,
  };
}
