import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import {
  registerUser, loginUser,
  findOrCreateGoogleUser, authMiddleware
} from './auth';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://my-projects-bv31.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://store-dashboard-backend.onrender.com';

// إعداد جوجل OAuth
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `${BACKEND_URL}/auth/google/callback`,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || '';
      const avatar = profile.photos?.[0]?.value || '';
      const result = await findOrCreateGoogleUser(
        profile.id, email, profile.displayName, avatar
      );
      done(null, result);
    } catch (err) {
      done(err);
    }
  }));
}

// ===== مسارات الإيميل =====

// تسجيل حساب جديد
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'الاسم والإيميل وكلمة المرور مطلوبة' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const result = await registerUser(name, email, password);
    if (!result) {
      return res.status(409).json({ error: 'هذا الإيميل مسجّل مسبقاً' });
    }

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التسجيل' });
  }
});

// تسجيل الدخول
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'الإيميل وكلمة المرور مطلوبان' });
    }

    const result = await loginUser(email, password);
    if (!result) {
      return res.status(401).json({ error: 'الإيميل أو كلمة المرور غير صحيحة' });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
  }
});

// جلب بيانات المستخدم الحالي
router.get('/me', authMiddleware, (req: any, res: Response) => {
  res.json(req.user);
});

// ===== مسارات جوجل =====

// بدء تسجيل الدخول بجوجل
router.get('/google',
  (req: any, res: any, next: any) => {
    const prompt = req.query.prompt === 'select_account' ? 'select_account' : undefined;
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      ...(prompt ? { prompt } : {}),
    })(req, res, next);
  }
);

// استقبال رد جوجل
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=google` }),
  (req: any, res: Response) => {
    const { token, user } = req.user;
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&role=${user.role}`);
  }
);

export default router;
