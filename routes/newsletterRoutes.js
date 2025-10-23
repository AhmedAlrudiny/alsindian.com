// routes/newsletterRoutes.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer'); // ستحتاجه لإرسال الإيميل
require('dotenv').config(); // للوصول لبيانات الإيميل

// استيراد نموذج NewsletterSubscriber (تأكد من وجود الملف والمسار الصحيح)
// افترض أن لديك ملف models/NewsletterSubscriber.js
const NewsletterSubscriber = require('../models/NewsletterSubscriber.js'); // <-- تأكد من هذا المسار

// --- وظيفة تحكم مؤقتة (انقل المنطق من server.js إلى هنا لاحقاً) ---
const subscribeToNewsletter = async (req, res) => {
    const { email } = req.body;

    // استرداد بيانات اعتماد SMTP بشكل آمن
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const STORE_EMAIL = process.env.STORE_EMAIL;

    if (!SMTP_USER || !SMTP_PASS || !STORE_EMAIL) {
        console.error("خطأ: بيانات اعتماد SMTP مفقودة في ملف .env");
        return res.status(500).json({ success: false, message: 'خطأ في إعدادات البريد الإلكتروني للخادم.' });
    }

    // تعريف transporter هنا إذا لم يكن معرفاً بشكل عام
     const transporter = nodemailer.createTransport({
         service: 'gmail',
         auth: {
             user: SMTP_USER,
             pass: SMTP_PASS,
         }
     });

    // --- (الصق دالة sendNewsletterAlert الخاصة بك هنا) ---
    // تأكد من أن الدالة معرفة أو يمكن الوصول إليها
    // مثال: async function sendNewsletterAlert(email) { ... }
    async function sendNewsletterAlert(emailAddr) {
        const mailOptions = {
            from: `Newsletter Alert <${SMTP_USER}>`,
            to: STORE_EMAIL,
            subject: `📣 مشترك جديد في النشرة البريدية!`,
            html: `
             <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; border: 1px solid #17a2b8;">
                 <h3 style="color: #17a2b8;">مشترك جديد!</h3>
                 <p>تم تسجيل بريد إلكتروني جديد في النشرة البريدية:</p>
                 <p style="font-size: 1.2em;"><strong>${emailAddr}</strong></p>
             </div>
           `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`[EMAIL] Newsletter alert sent for ${emailAddr}`);
            return true;
        } catch (error) {
            console.error("[EMAIL ERROR] Failed to send newsletter alert:", error.message);
            return false;
        }
    }


    // --- التحقق من الإيميل ---
    if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    try {
        // 1. محاولة إضافة الإيميل إلى قاعدة البيانات
        // تأكد من أن نموذج NewsletterSubscriber تم استيراده بشكل صحيح أعلاه
        if (!NewsletterSubscriber) {
             console.error('NewsletterSubscriber model is not imported correctly.');
             return res.status(500).json({ success: false, message: 'خطأ في إعدادات الخادم (النموذج مفقود).' });
        }
        await NewsletterSubscriber.create({ email: email });

        // 2. إرسال تنبيه بالاشتراك الجديد للمتجر
        await sendNewsletterAlert(email);

        console.log(`[NEWSLETTER] New subscriber: ${email}`);

        res.status(200).json({
            success: true,
            message: 'تم الاشتراك بنجاح! شكراً لك.'
        });
    } catch (error) {
        if (error.code === 11000) { // خطأ المفتاح المكرر في MongoDB
             return res.status(409).json({ // استخدم 409 Conflict للإيميل المكرر
                 success: false,
                 message: 'هذا البريد الإلكتروني مشترك بالفعل في النشرة البريدية.'
             });
        }

        console.error('Newsletter subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل الاشتراك. يرجى المحاولة لاحقاً.'
        });
    }
};

// --- تعريف المسارات ---

// POST /api/newsletter - إضافة مشترك جديد
router.post('/', subscribeToNewsletter);

module.exports = router; // تصدير الراوتر