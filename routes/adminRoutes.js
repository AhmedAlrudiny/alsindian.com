const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// [هام جداً] استيراد المودلز التي سنحتاجها للإحصائيات
// (تأكد من أن المسارات لمجلد models صحيحة)
const Order = require('../models/Order'); 
const Product = require('../models/Product');

// --- (هذا الكود يُفترض أنه موجود لديك بالفعل) ---
// POST /api/admin/login - تسجيل دخول المدير
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // (هنا يجب أن يكون الكود الخاص بك للتحقق من الإيميل والباسورد)
    // كمثال:
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        // إنشاء توكن
        const token = jwt.sign(
            { email: email, role: 'admin' },
            process.env.ADMIN_SECRET_TOKEN, 
            { expiresIn: '1h' } 
        );
        res.json({ success: true, token: token });
    } else {
        res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
});


// ==========================================================
// ==== [هذا هو الكود الجديد الذي يحل مشكلة الإحصائيات] ====
// ==========================================================
// GET /api/admin/stats - جلب الإحصائيات للوحة التحكم
// (ملاحظة: يمكنك إضافة دالة (middleware) للتحقق من التوكن هنا لاحقاً)
router.get('/stats', async (req, res) => {
    try {
        // 1. حساب إجمالي عدد المنتجات
        const totalProducts = await Product.countDocuments();

        // 2. حساب إجمالي عدد الطلبات
        const totalOrders = await Order.countDocuments();

        // 3. حساب إجمالي المبيعات (فقط للطلبات المكتملة 'Delivered')
        const revenueResult = await Order.aggregate([
            {
                $match: { status: 'Delivered' } // فلترة الطلبات المكتملة
            },
            {
                $group: {
                    _id: null, 
                    totalRevenue: { $sum: "$payment.total" } // جمع حقل الإجمالي
                }
            }
        ]);
        
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        // إرسال الإحصائيات
        res.json({
            totalRevenue,
            totalOrders,
            totalProducts
        });

    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ message: "خطأ في السيرفر عند جلب الإحصائيات.", error: error.message });
    }
});
// ==========================================================
// ==== نهاية الكود المضاف ====
// ==========================================================


module.exports = router;