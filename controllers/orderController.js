// controllers/orderController.js
const Order = require('../models/Order.js');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose'); // استيراد mongoose
require('dotenv').config();

// --- إعداد Nodemailer (مرة واحدة) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // تأكد من استخدام App Password
    },
});

// --- دوال مساعدة للتحقق والتنسيق الآمن ---
function safeToFixed(value, decimals = 2) {
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(decimals); // إرجاع '0.00' إذا لم يكن رقماً صالحاً
}

function formatCurrencySafe(value) {
    return `ر.س ${safeToFixed(value)}`;
}

// --- دوال إرسال الإيميلات (مع التحقق المضاف) ---
async function sendOrderNotificationEmail(order) {
    const STORE_EMAIL = process.env.STORE_EMAIL;
    if (!STORE_EMAIL) { console.error('[EMAIL ERROR] STORE_EMAIL not configured'); return; }

    const formattedGiftMessage = order.giftMessage?.trim() ? order.giftMessage.trim().replace(/\n/g, '<br>') : 'لا توجد رسالة إهداء.';
    const paymentMethodText = order.payment.method === 'cod' ? 'الدفع عند الاستلام' : 'غير محدد'; // قيمة افتراضية
    // استخدام safeToFixed للقيم الرقمية
    const discountRow = order.payment.discount > 0 ? `<p style="color: #4CAF50;">الخصم: ${formatCurrencySafe(order.payment.discount)}</p>` : '';
    const shippingRow = order.payment.shipping > 0 ? `<p>الشحن: ${formatCurrencySafe(order.payment.shipping)}</p>` : '<p>الشحن: مجاني</p>';

    const mailOptions = {
        from: `Wardat Al-Sindiyan <${process.env.SMTP_USER}>`, to: STORE_EMAIL, subject: `🔔 طلب شراء جديد: #${order.orderId}`,
        html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h2 style="color: #4CAF50;">تم استلام طلب جديد!</h2>
            <p><strong>رقم الطلب:</strong> #${order.orderId}</p>
            <p><strong>التاريخ:</strong> ${new Date(order.createdAt || Date.now()).toLocaleString('ar-SA')}</p>
            <hr>
            <h4 style="color: #333;">تفاصيل العميل:</h4>
            <p><strong>الاسم:</strong> ${order.customer.name || 'غير متوفر'}</p>
            <p><strong>الهاتف:</strong> ${order.customer.phone || 'غير متوفر'}</p>
            <p><strong>البريد الإلكتروني:</strong> ${order.customer.email || 'غير متوفر'}</p>
            <p><strong>العنوان:</strong> ${order.customer.address || ''}, ${order.customer.city || ''} ${order.customer.postalCode || ''}</p>
            <p><strong>ملاحظات العميل:</strong> ${order.customer.notes || 'لا توجد'}</p>
            <p><strong>موعد التوصيل:</strong> ${order.delivery.date || ''} ${order.delivery.time || ''}</p>
            <hr>
            <h4 style="color: #E91E63;">📝 رسالة الإهداء:</h4>
            <div style="border: 1px dashed #E91E63; padding: 15px; background-color: #fffafa; margin-bottom: 20px;">${formattedGiftMessage}</div>
            <hr>
            <h4 style="color: #333;">ملخص المنتجات:</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                <thead><tr style="background-color: #f2f2f2;"><th style="padding: 8px; border: 1px solid #ddd; text-align: right;">المنتج</th><th style="padding: 8px; border: 1px solid #ddd; text-align: center;">الكمية</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">الإجمالي</th></tr></thead>
                <tbody>
                ${(order.items || []).map(item => // إضافة تحقق للتأكد من وجود items
            `<tr>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.name || 'منتج غير معروف'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity || 0}</td>
                        {/* *** التحقق هنا قبل toFixed *** */}
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: left;">${formatCurrencySafe(item.total)}</td>
                    </tr>`
        ).join('')}
                </tbody>
            </table>
            <h4 style="color: #333;">ملخص الدفع:</h4>
            <p>طريقة الدفع: <strong>${paymentMethodText}</strong></p>
            {/* *** التحقق هنا قبل toFixed *** */}
            <p>المجموع الفرعي: ${formatCurrencySafe(order.payment.subtotal)}</p>
            ${discountRow}
            ${shippingRow}
            <h3 style="color: #E91E63; border-top: 2px solid #E91E63; padding-top: 10px; margin-top: 10px;">المجموع الكلي: ${formatCurrencySafe(order.payment.total)}</h3>
            ${order.couponCode ? `<p style="color: #4CAF50;">تم تطبيق كود الخصم: <strong>${order.couponCode}</strong></p>` : ''}
            <p style="margin-top: 20px; font-size: 12px; color: #777;">رسالة آلية.</p>
        </div>`
    };
    try { await transporter.sendMail(mailOptions); console.log(`[EMAIL] Order Notification sent for #${order.orderId} to ${STORE_EMAIL}`); }
    catch (error) { console.error(`[EMAIL ERROR] Failed notification #${order.orderId}:`, error.message); }
}

async function sendOrderConfirmationEmail(order) {
    if (!order.customer.email) { console.warn(`[EMAIL WARN] No customer email for #${order.orderId}`); return; }

    const formattedGiftMessage = order.giftMessage?.trim() ? order.giftMessage.trim().replace(/\n/g, '<br>') : 'لا توجد رسالة إهداء.';
    const paymentMethodText = order.payment.method === 'cod' ? 'الدفع عند الاستلام' : 'غير محدد';
    // استخدام safeToFixed
    const discountRow = order.payment.discount > 0 ? `<tr style="color: #4CAF50; font-weight: bold;"><td colspan="2" style="padding: 5px 0; text-align: right;">الخصم:</td><td style="padding: 5px 0; text-align: left;">- ${formatCurrencySafe(order.payment.discount)}</td></tr>` : '';
    const shippingRow = order.payment.shipping > 0 ? `<tr><td colspan="2" style="padding: 5px 0; text-align: right;">رسوم الشحن:</td><td style="padding: 5px 0; text-align: left;">${formatCurrencySafe(order.payment.shipping)}</td></tr>` : '<tr><td colspan="2" style="padding: 5px 0; text-align: right; color: #4CAF50;">الشحن:</td><td style="padding: 5px 0; text-align: left; color: #4CAF50;">مجاني</td></tr>';

    const mailOptions = {
        from: `Wardat Al-Sindiyan <${process.env.SMTP_USER}>`, to: order.customer.email, subject: `✅ تم تأكيد طلبك من وردة السنديان: #${order.orderId}`,
        html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; background-color: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
           <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
               <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 25px; text-align: center;"><h1 style="margin: 0; font-size: 24px; font-weight: 700;">🌹 وردة السنديان</h1><p style="margin: 5px 0 0; font-size: 14px;">جمال الطبيعة بين يديك</p></div>
               <div style="padding: 30px;">
                   <h2 style="color: #4CAF50; font-size: 20px; margin-bottom: 15px;">تم استلام طلبك بنجاح! 🎉</h2>
                   <p style="color: #333; margin-bottom: 20px;">شكراً لثقتك بمتجرنا، <strong>${order.customer.name || ''}</strong>. نحن نعمل الآن على تجهيز طلبك. تفاصيل طلبك #${order.orderId}:</p>
                   <div style="background-color: #fff0f5; padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #e64d99;"><p style="margin: 0; font-weight: bold; color: #e64d99; font-size: 16px;">رقم الطلب: <span style="float: left; font-size: 18px; font-weight: 900; color: #667eea; direction: ltr;">#${order.orderId}</span></p></div>
                   <h4 style="color: #667eea; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 15px;"><span style="font-size: 16px;">🛒 تفاصيل المنتجات</span></h4>
                   <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                       <thead><tr style="background-color: #f8f9fa;"><th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">المنتج</th><th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">الكمية</th><th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">الإجمالي</th></tr></thead>
                       <tbody>
                       ${(order.items || []).map(item => // التحقق من items
            `<tr>
                               <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right;">${item.name || ''}</td>
                               <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: center; color: #764ba2;">${item.quantity || 0}</td>
                               {/* *** التحقق هنا قبل toFixed *** */}
                               <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: left; font-weight: bold;">${formatCurrencySafe(item.total)}</td>
                           </tr>`
        ).join('')}
                       </tbody>
                   </table>
                   <div style="margin-bottom: 25px; border-top: 1px solid #f0f0f0; padding-top: 15px;">
                       <h4 style="color: #667eea; margin-bottom: 10px; font-size: 16px;">🚚 معلومات التوصيل والدفع</h4>
                       <p style="color: #555; margin: 5px 0;"><strong>العنوان:</strong> ${order.customer.address || ''}, ${order.customer.city || ''}</p>
                       <p style="color: #555; margin: 5px 0;"><strong>موعد التوصيل المتوقع:</strong> ${order.delivery.date || ''} ${order.delivery.time || ''}</p>
                       <p style="color: #555; margin: 5px 0;"><strong>طريقة الدفع:</strong> <span style="font-weight: bold; color: #e64d99;">${paymentMethodText}</span></p>
                   </div>
                   <table style="width: 100%; border-collapse: collapse; font-size: 15px; margin-bottom: 20px;">
                       <tbody>
                           {/* *** التحقق هنا قبل toFixed *** */}
                           <tr><td colspan="2" style="padding: 5px 0; text-align: right;">المجموع الفرعي:</td><td style="padding: 5px 0; text-align: left;">${formatCurrencySafe(order.payment.subtotal)}</td></tr>
                           ${discountRow}
                           ${shippingRow}
                           <tr style="background-color: #f7f7f7; border-top: 2px solid #e64d99;">
                               <td colspan="2" style="padding: 10px 0; text-align: right; font-weight: bold; color: #333;">المجموع الكلي:</td>
                               <td style="padding: 10px 0; text-align: left; font-weight: 900; font-size: 18px; color: #e64d99;">${formatCurrencySafe(order.payment.total)}</td>
                           </tr>
                       </tbody>
                   </table>
                   <div style="margin-top: 20px; border: 1px dashed #667eea; padding: 15px; background-color: #f7f7ff; border-radius: 8px;">
                       <h4 style="color: #667eea; margin-top: 0; font-size: 16px;">🎁 رسالة الإهداء:</h4>
                       <p style="color: #555; margin: 0;">${formattedGiftMessage}</p>
                   </div>
                   <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">للمساعدة، يرجى التواصل عبر الواتساب.</p>
               </div>
           </div>
        </div>`
    };
    try { await transporter.sendMail(mailOptions); console.log(`[EMAIL] Order Confirmation sent for #${order.orderId} to ${order.customer.email}`); }
    catch (error) { console.error(`[EMAIL ERROR] Failed confirmation #${order.orderId}:`, error.message); }
}


// --- وظائف التحكم الرئيسية ---

// @desc    إنشاء طلب جديد
// @route   POST /api/orders
// @access  Public
const createOrder = async (req, res) => {
    const orderData = req.body;
    // --- التحقق الأساسي ---
    if (!orderData?.customer?.name || !orderData?.items?.length || !orderData.payment) {
        return res.status(400).json({ success: false, message: 'بيانات الطلب غير مكتملة.' });
    }
    // إنشاء رقم طلب فريد إذا لم يكن موجوداً (تحسين)
    const uniqueOrderId = orderData.orderId || `ORD-${Date.now()}-${Math.floor(Math.random() * 900) + 100}`;
    orderData.orderId = uniqueOrderId;
    orderData.status = 'Pending'; // الحالة الأولية

    // تحويل productId إلى ObjectId قبل الحفظ (مهم جداً!)
    if (orderData.items) {
      orderData.items = orderData.items.map(item => ({
          ...item,
          productId: mongoose.Types.ObjectId.isValid(item.productId) ? new mongoose.Types.ObjectId(item.productId) : null // تحويل النص إلى ObjectId
      }));
       // إزالة أي عناصر ليس لها productId صالح
      orderData.items = orderData.items.filter(item => item.productId !== null);
      if(orderData.items.length === 0){
          return res.status(400).json({ success: false, message: 'لا توجد منتجات صالحة في الطلب.' });
      }
    }

    try {
        const newOrder = new Order(orderData);
        const savedOrder = await newOrder.save(); // حفظ في قاعدة البيانات
        console.log(`\n=== NEW ORDER SAVED (DB ID: ${savedOrder._id}, Order ID: ${savedOrder.orderId}) ===`);

        // إرسال الإيميلات (لا توقف العملية إذا فشل الإيميل)
        sendOrderNotificationEmail(savedOrder).catch(err => console.error("Non-critical error sending notification email:", err));
        sendOrderConfirmationEmail(savedOrder).catch(err => console.error("Non-critical error sending confirmation email:", err));

        console.log(`=================================================\n`);
        res.status(201).json({ success: true, message: 'تم استلام الطلب وحفظه!', orderId: savedOrder.orderId, order: savedOrder });
    } catch (error) {
        console.error(`Error saving order ${uniqueOrderId}:`, error);
        if (error.name === 'ValidationError') { return res.status(400).json({ success: false, message: 'خطأ في بيانات الطلب', errors: error.errors }); }
        res.status(500).json({ success: false, message: 'فشل حفظ الطلب.' });
    }
};

// @desc    جلب كل الطلبات (للمدير)
// @route   GET /api/orders
// @access  Private (Admin)
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 }); // الأحدث أولاً
        res.json(orders);
    } catch (error) { console.error('Error fetching all orders:', error); res.status(500).json({ message: 'خطأ جلب الطلبات' }); }
};

// @desc    جلب طلب واحد (للمدير)
// @route   GET /api/orders/:id (_id من قاعدة البيانات)
// @access  Private (Admin)
const getOrderById = async (req, res) => {
     try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) { return res.status(400).json({ message: 'معرف الطلب غير صالح' }); }
        // جلب بيانات المنتج المرتبط (الاسم والصورة فقط)
        const order = await Order.findById(req.params.id).populate('items.productId', 'name image');
        if (order) { res.json(order); }
        else { res.status(404).json({ message: 'لم يتم العثور على الطلب' }); }
    } catch (error) { console.error('Error fetching order by ID:', error); res.status(500).json({ message: 'خطأ جلب الطلب' }); }
};

// @desc    تحديث حالة الطلب (للمدير)
// @route   PUT /api/orders/:id/status (_id من قاعدة البيانات)
// @access  Private (Admin)
const updateOrderStatus = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) { return res.status(400).json({ message: 'معرف الطلب غير صالح' }); }
        const { status } = req.body;
        const allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!status || !allowedStatuses.includes(status)) { return res.status(400).json({ message: 'حالة الطلب غير صالحة' }); }

        const order = await Order.findById(req.params.id);
        if (order) {
            order.status = status;
            const updatedOrder = await order.save();
            // يمكنك هنا إرسال إيميل للعميل بتحديث حالة طلبه (اختياري)
            // await sendOrderStatusUpdateEmail(updatedOrder);
            console.log(`[STATUS UPDATE] Order #${order.orderId} status updated to ${status}`);
            res.json(updatedOrder);
        } else { res.status(404).json({ message: 'لم يتم العثور على الطلب لتحديث حالته' }); }
    } catch (error) { console.error('Error updating order status:', error); res.status(500).json({ message: 'خطأ تحديث حالة الطلب' }); }
};

module.exports = { createOrder, getAllOrders, getOrderById, updateOrderStatus };