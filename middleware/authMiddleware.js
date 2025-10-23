// middleware/authMiddleware.js
require('dotenv').config();
const jwt = require('jsonwebtoken'); // استيراد مكتبة JWT

const protectAdmin = (req, res, next) => {
    let token;

    // البحث عن التوكن في هيدر Authorization (الشكل القياسي: Bearer TOKEN)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // استخلاص التوكن (إزالة كلمة 'Bearer ')
            token = req.headers.authorization.split(' ')[1];

            // التحقق من صحة التوكن باستخدام الـ Secret من .env
            const decoded = jwt.verify(token, process.env.ADMIN_SECRET_TOKEN);

            // يمكنك إضافة بيانات المستخدم/المدير إلى req إذا أردت
            // req.admin = decoded; // مثلاً: يحتوي على isAdmin و email

            // إذا كان التوكن صالحاً، اسمح بالمرور
            next();

        } catch (error) {
            console.error('Token verification failed:', error.message);
            res.status(401).json({ message: 'غير مصرح لك - التوكن غير صالح أو منتهي الصلاحية' });
        }
    }

    if (!token) {
        console.warn('[AUTH] Failed admin access attempt. No token provided.');
        res.status(401).json({ message: 'غير مصرح لك - لم يتم توفير التوكن' });
    }
};

module.exports = { protectAdmin };