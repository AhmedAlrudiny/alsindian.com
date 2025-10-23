// controllers/customOrderController.js
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs'); // لحذف الملف المؤقت
require('dotenv').config();

// --- دوال إرسال الإيميلات ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// إرسال إشعار للمتجر بالطلب المخصص والصورة
async function sendCustomOrderNotificationEmail(data, file) {
  const STORE_EMAIL = process.env.STORE_EMAIL;
  if (!STORE_EMAIL) {
    console.error('[EMAIL ERROR] STORE_EMAIL not configured');
    return; // لا تلق خطأ هنا، فقط سجل المشكلة
  }

  const mailOptions = {
    from: `Custom Order <${process.env.SMTP_USER}>`,
    to: STORE_EMAIL,
    subject: `✨ طلب باقة مخصصة جديدة من ${data.name}`,
    html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; border: 1px solid #E91E63; padding: 20px; border-radius: 8px;">
            <h3 style="color: #667eea;">تفاصيل طلب تصميم مخصص:</h3>
            <p><strong>الاسم:</strong> ${data.name}</p>
            <p><strong>الهاتف:</strong> ${data.phone || 'لم يُدخل'}</p>
            <p><strong>البريد الإلكتروني:</strong> ${data.email}</p>
            <p><strong>الوصف/الميزانية:</strong> ${data.description.replace(/\n/g, '<br>')}</p>
            <hr>
            <p>تم إرفاق صورة التصميم (${file.originalname}) بهذا الإيميل.</p>
            </div>`,
    attachments: [
      {
        filename: file.originalname, // استخدم الاسم الأصلي
        path: file.path, // مسار الملف المؤقت
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Custom order notification sent for ${data.email} with attachment: ${file.filename}`);
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send custom order notification:', error.message);
    // لا تلق خطأ هنا، فقط سجل المشكلة
  }
}

// إرسال تأكيد للعميل باستلام طلبه المخصص
async function sendCustomOrderConfirmationEmail(data) {
   if (!data.email) {
      console.warn(`[EMAIL WARN] No customer email for custom order from ${data.name}. Cannot send confirmation.`);
      return;
   }
   const mailOptions = {
       from: `Wardat Al-Sindiyan <${process.env.SMTP_USER}>`,
       to: data.email,
       subject: `✅ تأكيد استلام طلبك المخصص - وردة السنديان`,
       html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; border: 1px solid #4CAF50; padding: 20px; border-radius: 8px;">
            <h2 style="color: #4CAF50;">تم استلام طلب تصميم باقة مخصصة بنجاح!</h2>
            <p>شكراً لثقتكم بنا، ${data.name}. سنقوم بمراجعة الصورة والوصف الذي أرسلته وسنتواصل معك خلال 24 ساعة لتقديم عرض السعر والتفاصيل.</p>
            <hr>
            <h4 style="color: #667eea;">ملخص الطلب:</h4>
            <p><strong>وصفك:</strong> ${data.description.substring(0, 100)}...</p>
            <p><strong>تاريخ الاستلام:</strong> ${new Date().toLocaleDateString('ar-SA')}</p>
            <p style="margin-top: 15px;">نحن متحمسون لتنفيذ رؤيتك!</p>
        </div>`
   };

   try {
       await transporter.sendMail(mailOptions);
       console.log(`[EMAIL] Custom order confirmation sent to ${data.email}`);
   } catch (error) {
       console.error("[EMAIL ERROR] Failed to send custom order confirmation:", error.message);
   }
}


// --- وظيفة التحكم الرئيسية ---
// @desc    معالجة رفع طلب مخصص مع صورة
// @route   POST /api/upload-custom-order
// @access  Public
const handleCustomOrderUpload = async (req, res) => {
  try {
    const data = req.body; // بيانات النموذج النصية
    const file = req.file; // الملف المرفوع بواسطة multer

    // التحقق من وجود البيانات الأساسية والملف
    if (!data.name || !data.email || !data.description || !file) {
      // إذا كان الملف موجودًا ولكن البيانات ناقصة، احذفه
      if (file) {
        fs.unlink(file.path, (err) => {
          if (err) console.error(`Error deleting temp file ${file.path}:`, err);
        });
      }
      return res.status(400).json({ success: false, message: 'الرجاء ملء جميع الحقول المطلوبة وإرفاق صورة التصميم.' });
    }

    console.log(`[UPLOAD] Received custom order from ${data.email}. File: ${file.filename}`);

    // 1. إرسال الإشعار للمتجر (مع الملف)
    await sendCustomOrderNotificationEmail(data, file);

    // 2. إرسال تأكيد للعميل
    await sendCustomOrderConfirmationEmail(data);

    // 3. (اختياري) يمكنك حذف الملف المؤقت بعد إرساله بالإيميل
     fs.unlink(file.path, (err) => {
       if (err) console.error(`Error deleting temp file ${file.path} after processing:`, err);
       else console.log(`[UPLOAD] Deleted temp file: ${file.filename}`);
     });

    res.status(200).json({
      success: true,
      message: 'تم استلام طلبك المخصص بنجاح وسنتواصل معك قريباً!'
    });

  } catch (error) {
    console.error('Custom Order Upload Controller Error:', error);
    // إذا حدث خطأ وكان هناك ملف، حاول حذفه
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error(`Error deleting temp file ${req.file.path} on error:`, err);
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'فشل رفع الملف أو معالجة الطلب.'
    });
  }
};

module.exports = { handleCustomOrderUpload };