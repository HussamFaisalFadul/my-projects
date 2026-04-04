import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import { authRoutes } from './auth/routes';
import { storeRoutes } from './stores/routes';

const app = Fastify({ logger: true });

// إعداد CORS للسماح لمتصفح المستخدم بالوصول للسيرفر من رابط Vercel
app.register(cors, {
  origin: "https://my-projects-bv31.vercel.app", // رابط مشروعك
  credentials: true, // ضروري جداً لتبادل الكوكيز والجلسة
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
});

app.register(cookie);

app.register(session, {
  secret: 'a-very-long-secret-key-1234567890123456',
  cookieName: 'sessionId',
  cookie: { 
    secure: true,      // لأن Vercel يستخدم HTTPS
    sameSite: 'none',  // للسماح بالكوكيز بين دومين Frontend ودومين Backend
    httpOnly: true,
    maxAge: 86400000 
  }
});

// تسجيل المسارات التي تم تعريفها في ملفات الـ Routes
app.register(authRoutes, { prefix: '/api/auth' });
app.register(storeRoutes, { prefix: '/api/stores' });

// تصدير التطبيق ليعمل كـ Serverless Function على Vercel
export default async (req: any, res: any) => {
  await app.ready();
  app.server.emit('request', req, res);
};
