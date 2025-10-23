// controllers/adminController.js
require('dotenv').config(); // للوصول لبيانات المدير والتوكن
const jwt = require('jsonwebtoken'); // سنستخدم JWT لإدارة التوكن بشكل أفضل (اختياري لكن أفضل)

// @desc    تسجيل دخول المدير وإرجاع توكن JWT
// @route   POST /api/admin/login
// @access  Public
const adminLogin = (req, res) => {
  const { email, password } = req.body;

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const JWT_SECRET = process.env.ADMIN_SECRET_TOKEN; // استخدم التوكن السري كـ JWT Secret

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET) {
    console.error('Error: Admin credentials or JWT secret not set in .env file');
    return res.status(500).json({ message: 'خطأ في إعدادات الخادم' });
  }

  // تحقق بسيط (في تطبيق حقيقي استخدم تشفير كلمات المرور)
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    // إنشاء توكن JWT صالح لمدة يوم واحد
    const token = jwt.sign({ isAdmin: true, email: ADMIN_EMAIL }, JWT_SECRET, {
      expiresIn: '1d', // صلاحية التوكن (يوم واحد)
    });

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token: token, // إرسال توكن JWT
    });
  } else {
    res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }
};

module.exports = { adminLogin }; // استخدم module.exports

// ملاحظة: ستحتاج لتثبيت مكتبة JWT: npm install jsonwebtoken