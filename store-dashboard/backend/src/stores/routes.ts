import { Router, Request, Response } from 'express';
import { authMiddleware } from '../auth/auth';
import {
  createStore, getStoreById, getUserStores, updateStore,
  getStoreMembers, getMemberRole, removeMember, updateMemberRole,
  createInvitation, getInvitationByToken, acceptInvitation, getStoreInvitations
} from './queries';

const router = Router();

// ===== مسار الدعوة — قبل authMiddleware لأنه يحتاج منطق خاص =====

// جلب تفاصيل الدعوة (بدون تسجيل دخول)
router.get('/join/:token', async (req: any, res: Response) => {
  try {
    const invitation = await getInvitationByToken(req.params.token);
    if (!invitation) {
      return res.status(404).json({ error: 'الدعوة غير موجودة أو منتهية الصلاحية' });
    }
    const store = await getStoreById(invitation.storeId);
    res.json({
      email: invitation.email,
      role: invitation.role,
      storeName: store?.name || 'متجر',
      storeId: invitation.storeId,
      expiresAt: invitation.expiresAt,
    });
  } catch { res.status(500).json({ error: 'خطأ في جلب الدعوة' }); }
});

// قبول دعوة بالتوكن — يحتاج تسجيل دخول + التحقق من الإيميل
router.post('/join/:token', authMiddleware, async (req: any, res: Response) => {
  try {
    const invitation = await getInvitationByToken(req.params.token);
    if (!invitation) {
      return res.status(404).json({ error: 'الدعوة غير موجودة أو منتهية الصلاحية' });
    }

    // التحقق أن إيميل المستخدم = إيميل الدعوة
    if (req.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({
        error: `هذه الدعوة لـ ${invitation.email} فقط`,
        invitedEmail: invitation.email,
        yourEmail: req.user.email,
      });
    }

    const result = await acceptInvitation(req.params.token, req.user.id);
    if (!result) return res.status(400).json({ error: 'فشل قبول الدعوة' });

    const store = await getStoreById(result.storeId);
    res.json({
      success: true,
      storeId: result.storeId,
      storeName: store?.name || 'متجر',
      role: result.role,
    });
  } catch { res.status(500).json({ error: 'خطأ في قبول الدعوة' }); }
});

// كل المسارات التالية تحتاج تسجيل دخول
router.use(authMiddleware);

// ميدلوير التحقق من عضوية المتجر
async function storeMiddleware(req: any, res: Response, next: any) {
  const storeId = req.params.storeId || req.body.storeId;
  if (!storeId) return res.status(400).json({ error: 'معرف المتجر مطلوب' });

  const role = await getMemberRole(storeId, req.user.id);
  if (!role) return res.status(403).json({ error: 'ليس لديك صلاحية للوصول لهذا المتجر' });

  req.storeId = storeId;
  req.memberRole = role;
  next();
}

function ownerOrAdmin(req: any, res: Response, next: any) {
  if (!['مالك', 'مدير'].includes(req.memberRole)) {
    return res.status(403).json({ error: 'هذه العملية تتطلب صلاحية مالك أو مدير' });
  }
  next();
}

// ===== المتاجر =====

router.get('/', async (req: any, res: Response) => {
  try {
    const stores = await getUserStores(req.user.id);
    res.json(stores);
  } catch { res.status(500).json({ error: 'خطأ في جلب المتاجر' }); }
});

router.post('/', async (req: any, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم المتجر مطلوب' });
    const store = await createStore(name, req.user.id, description);
    res.status(201).json(store);
  } catch { res.status(500).json({ error: 'خطأ في إنشاء المتجر' }); }
});

router.get('/:storeId', storeMiddleware, async (req: any, res: Response) => {
  try {
    const store = await getStoreById(req.storeId);
    res.json({ ...store, memberRole: req.memberRole });
  } catch { res.status(500).json({ error: 'خطأ في جلب المتجر' }); }
});

router.put('/:storeId', storeMiddleware, ownerOrAdmin, async (req: any, res: Response) => {
  try {
    const store = await updateStore(req.storeId, req.body);
    res.json(store);
  } catch { res.status(500).json({ error: 'خطأ في تحديث المتجر' }); }
});

// ===== الأعضاء =====

router.get('/:storeId/members', storeMiddleware, async (req: any, res: Response) => {
  try {
    const members = await getStoreMembers(req.storeId);
    res.json(members);
  } catch { res.status(500).json({ error: 'خطأ في جلب الأعضاء' }); }
});

router.put('/:storeId/members/:userId/role', storeMiddleware, ownerOrAdmin, async (req: any, res: Response) => {
  try {
    const { role } = req.body;
    const success = await updateMemberRole(req.storeId, req.params.userId, role);
    if (!success) return res.status(400).json({ error: 'لا يمكن تغيير دور المالك' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في تغيير الدور' }); }
});

router.delete('/:storeId/members/:userId', storeMiddleware, ownerOrAdmin, async (req: any, res: Response) => {
  try {
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: 'لا يمكنك إزالة نفسك' });
    }
    const success = await removeMember(req.storeId, req.params.userId);
    if (!success) return res.status(400).json({ error: 'لا يمكن إزالة المالك' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في إزالة العضو' }); }
});

// ===== الدعوات =====

router.post('/:storeId/invitations', storeMiddleware, ownerOrAdmin, async (req: any, res: Response) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'الإيميل مطلوب' });
    const invitation = await createInvitation(req.storeId, email, role || 'موظف', req.user.id);
    res.status(201).json(invitation);
  } catch { res.status(500).json({ error: 'خطأ في إرسال الدعوة' }); }
});

router.get('/:storeId/invitations', storeMiddleware, ownerOrAdmin, async (req: any, res: Response) => {
  try {
    const invitations = await getStoreInvitations(req.storeId);
    res.json(invitations);
  } catch { res.status(500).json({ error: 'خطأ في جلب الدعوات' }); }
});

export default router;
