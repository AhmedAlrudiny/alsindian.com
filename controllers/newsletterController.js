// controllers/newsletterController.js
const NewsletterSubscriber = require('../models/NewsletterSubscriber.js');
const nodemailer = require('nodemailer');
require('dotenv').config();

// --- دالة إرسال الإيميل ---
async function sendNewsletterAlertEmail(emailAddr) {
   const SMTP_USER = process.env.SMTP_USER;
   const SMTP_PASS = process.env.SMTP_PASS;
   const STORE_EMAIL = process.env.STORE_EMAIL;

   if (!SMTP_USER || !SMTP_PASS || !STORE_EMAIL) {
       console.error('[EMAIL ERROR] SMTP credentials or STORE_EMAIL not configured');
       // لا توقف العملية فقط بسبب فشل إرسال الإشعار
       return;
   }

   const transporter = nodemailer.createTransport({
       service: 'gmail',
       auth: { user: SMTP_USER, pass: SMTP_PASS },
   });

   const mailOptions = {
       from: `Newsletter Alert <${SMTP_USER}>`,
       to: STORE_EMAIL,
       subject: `📣 مشترك جديد في النشرة البريدية!`,
       html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; border: 1px solid #17a2b8;">
            <h3 style="color: #17a2b8;">مشترك جديد!</h3>
            <p>تم تسجيل بريد إلكتروني جديد في النشرة البريدية:</p>
            <p style="font-size: 1.2em;"><strong>${emailAddr}</strong></p>
        </div>`
   };

   try {
       await transporter.sendMail(mailOptions);
       console.log(`[EMAIL] Newsletter alert sent for ${emailAddr} to ${STORE_EMAIL}`);
   } catch (error) {
       console.error("[EMAIL ERROR] Failed to send newsletter alert:", error.message);
   }
}

// --- وظيفة التحكم الرئيسية ---
// @desc    الاشتراك في النشرة البريدية
// @route   POST /api/newsletter
// @access  Public
const subscribeToNewsletter = async (req, res) => {
  const { email } = req.body;

  // التحقق من الإيميل
  if (!email || !email.includes('@')) { // يمكنك إضافة تحقق أكثر تفصيلاً
    return res.status(400).json({ success: false, message: 'الرجاء إدخال بريد إلكتروني صحيح.' });
  }

  try {
    // 1. محاولة إضافة الإيميل إلى قاعدة البيانات
    const newSubscriber = await NewsletterSubscriber.create({ email: email });

    // 2. إرسال تنبيه بالاشتراك الجديد للمتجر (لا توقف العملية إذا فشل الإيميل)
    sendNewsletterAlertEmail(email).catch(err => console.error("Non-critical error sending newsletter alert:", err)); // تشغيل في الخلفية

    console.log(`[NEWSLETTER] New subscriber saved: ${newSubscriber.email}`);

    res.status(201).json({ // استخدم 201 Created
      success: true,
      message: 'تم الاشتراك بنجاح! شكراً لك.'
    });

  } catch (error) {
    if (error.code === 11000) { // خطأ المفتاح المكرر في MongoDB
      return res.status(409).json({ // 409 Conflict للإيميل المكرر
        success: false,
        message: 'هذا البريد الإلكتروني مشترك بالفعل في النشرة البريدية.'
      });
    }
     if (error.name === 'ValidationError') {
         // استخراج رسائل الخطأ من التحقق من الصحة
         const messages = Object.values(error.errors).map(val => val.message);
         return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل الاشتراك. يرجى المحاولة لاحقاً.'
    });
  }
};

module.exports = { subscribeToNewsletter };