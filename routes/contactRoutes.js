// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer'); // ستحتاجه لإرسال الإيميل
require('dotenv').config(); // للوصول لبيانات الإيميل

// --- وظيفة تحكم مؤقتة (انقل المنطق من server.js إلى هنا لاحقاً) ---
const handleContactForm = async (req, res) => {
    const contactData = req.body;

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

    // --- (الصق دالة sendContactMessage الخاصة بك هنا) ---
    // تأكد من أن الدالة معرفة أو يمكن الوصول إليها
    // مثال: async function sendContactMessage(contactData) { ... }
    async function sendContactMessage(data) {
        const mailOptions = {
            from: `Contact Form <${SMTP_USER}>`,
            to: STORE_EMAIL,
            subject: `📧 رسالة جديدة من العميل: ${data.name}`,
            html: `
             <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; border: 1px solid #667eea; padding: 20px; border-radius: 8px;">
                 <h2 style="color: #667eea;">رسالة تواصل جديدة</h2>
                 <hr>
                 <h4 style="color: #333;">تفاصيل المرسل:</h4>
                 <p><strong>الاسم:</strong> ${data.name}</p>
                 <p><strong>البريد الإلكتروني:</strong> ${data.email}</p>
                 <p><strong>الهاتف:</strong> ${data.phone || 'لم يُدخل رقم هاتف'}</p>
                 <hr>
                 <h4 style="color: #E91E63;">نص الرسالة:</h4>
                 <div style="border: 1px dashed #E91E63; padding: 15px; background-color: #fffafa; margin-bottom: 20px;">
                    ${data.message.replace(/\n/g, '<br>')}
                 </div>
                 <p style="margin-top: 20px; font-size: 12px; color: #777;">
                     هذه رسالة آلية من نموذج التواصل.
                 </p>
             </div>
           `
        };
        // لا نستخدم throw new Error هنا داخل الدالة، فقط نسجل الخطأ
        try {
            await transporter.sendMail(mailOptions);
            console.log(`[EMAIL] Contact message from ${data.email} sent successfully to ${STORE_EMAIL}`);
            return true; // إرجاع true عند النجاح
        } catch (error) {
            console.error("[EMAIL ERROR] Failed to send contact message:", error.message);
            return false; // إرجاع false عند الفشل
        }
    }


    // --- التحقق من البيانات ---
    if (!contactData.name || !contactData.email || !contactData.message) {
        return res.status(400).json({
            success: false,
            message: 'الرجاء تعبئة جميع الحقول المطلوبة (الاسم، البريد، الرسالة).'
        });
    }

    try {
        // --- منطق إرسال الإيميل ---
        const emailSent = await sendContactMessage(contactData);

        if (emailSent) {
            res.status(200).json({
                success: true,
                message: 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.'
            });
        } else {
             // إذا فشلت دالة الإرسال في إرسال الإيميل
             throw new Error('فشل إرسال البريد الإلكتروني داخلياً.');
        }

    } catch (error) {
        console.error(`خطأ في معالجة نموذج الاتصال لـ ${contactData.email}:`, error);
        res.status(500).json({
            success: false,
            message: 'فشل إرسال الرسالة. يرجى المحاولة لاحقاً.'
        });
    }
};

// --- تعريف المسارات ---

// POST /api/contact - استقبال بيانات نموذج الاتصال
router.post('/', handleContactForm);

module.exports = router; // تصدير الراوتر