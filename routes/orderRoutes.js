const express = require('express');
const router = express.Router();

// [هام] تأكد من أن المسار لمجلد models صحيح
const Order = require('../models/Order'); 

// [الخطوة 1: استيراد دالة الإيميل الجديدة]
// تأكد من أن هذا المسار صحيح
const { sendOrderConfirmationEmail } = require('../config/sendOrderEmail');

// --- المسارات التي قد تكون لديك للوحة التحكم ---

// GET /api/orders (لجلب كل الطلبات للوحة التحكم)
router.get('/', async (req, res) => {
    try {
        // (يفضل إضافة حماية للمدير هنا لاحقاً)
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching orders', error: error.message });
    }
});

// GET /api/orders/:id (لجلب تفاصيل طلب واحد للوحة التحكم)
router.get('/:id', async (req, res) => {
    try {
        // (يفضل إضافة حماية للمدير هنا لاحقاً)
        const order = await Order.findById(req.params.id);
        if (order) {
            res.json(order);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching order details', error: error.message });
    }
});

// PUT /api/orders/:id/status (لتحديث حالة الطلب من لوحة التحكم)
router.put('/:id/status', async (req, res) => {
    try {
        // (يفضل إضافة حماية للمدير هنا لاحقاً)
        const { status } = req.body;
        const order = await Order.findById(req.params.id);
        if (order) {
            order.status = status;
            await order.save();
            res.json({ success: true, message: 'Order status updated', order: order });
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error updating status', error: error.message });
    }
});


// --- المسار الأهم: إنشاء الطلب ---

// --- (باقي الكود في الأعلى كما هو) ---

// POST /api/orders (لإنشاء طلب جديد من العميل)
router.post('/', async (req, res) => {
    try {
        const orderData = req.body;

        // --- [تطوير] إنشاء رقم طلب فريد وموثوق ---
        let newOrderId = '1001'; // قيمة افتراضية للطلب الأول
        const lastOrder = await Order.findOne().sort({ createdAt: -1 }); // جلب آخر طلب تم إنشاؤه

        if (lastOrder && lastOrder.orderId) {
            // محاولة تحويل رقم الطلب الأخير إلى رقم صحيح
            const lastIdNumber = parseInt(lastOrder.orderId);

            // التحقق إذا كان التحويل ناجحاً (ليس NaN)
            if (!isNaN(lastIdNumber)) {
                newOrderId = (lastIdNumber + 1).toString(); // زيادة الرقم وتحويله لنص
            } else {
                // إذا كان رقم الطلب الأخير غير صالح، سنستخدم القيمة الافتراضية
                console.warn(`Invalid last orderId found: "${lastOrder.orderId}". Defaulting to ${newOrderId}.`);
                // يمكنك هنا إضافة منطق أكثر تعقيداً إذا أردت البحث عن آخر رقم صالح
            }
        }
        // --- نهاية التطوير ---

        const newOrder = new Order({
            ...orderData,
            orderId: newOrderId, // استخدام الرقم الجديد الموثوق
            status: 'Pending' // تحديد الحالة الافتراضية
        });

        // حفظ الطلب في قاعدة البيانات
        const savedOrder = await newOrder.save();

        // إرسال الإيميل المطور
        sendOrderConfirmationEmail(savedOrder);

        // إرسال الرد للعميل (الواجهة الأمامية)
        res.status(201).json({
            success: true,
            message: 'تم استلام طلبك بنجاح!',
            orderId: savedOrder.orderId, // إرسال الرقم الصحيح
            order: savedOrder
        });

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء معالجة الطلب.', error: error.message });
    }
});

// --- (باقي الكود في الأسفل كما هو) ---
module.exports = router;