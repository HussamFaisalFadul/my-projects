import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie'; // تأكد من تنصيب @fastify/cookie
import session from '@fastify/session';
import { authRoutes } from './auth/routes';
import { storeRoutes } from './stores/routes';

const app = Fastify({ logger: true });

// 1. إعداد الـ CORS للسماح بالرابط الخاص بك
app.register(cors, {
  origin: "https://my-projects-bv31.vercel.app",
  credentials: true, // ضروري جداً للسماح بالكوكيز
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
});

// 2. إعداد الكوكيز
app.register(cookie);

// 3. إعداد الجلسة (Session) لتتوافق مع Vercel و HTTPS
app.register(session, {
  secret: 'a-very-long-secret-key-1234567890123456', // غير هذا المفتاح في الإنتاج
  cookieName: 'sessionId',
  cookie: { 
    secure: true, // لأن Vercel يستخدم https
    sameSite: 'none', // للسماح بالكوكيز عبر النطاقات المختلفة
    httpOnly: true,
    maxAge: 86400000 // يوم واحد
  }
});

app.register(authRoutes, { prefix: '/api/auth' });
app.register(storeRoutes, { prefix: '/api/stores' });

const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
