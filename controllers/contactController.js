// controllers/contactController.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// --- دالة إرسال الإيميل ---
async function sendContactEmailInternal(contactData) {
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const STORE_EMAIL = process.env.STORE_EMAIL;

  if (!SMTP_USER || !SMTP_PASS || !STORE_EMAIL) {
    console.error('[EMAIL ERROR] SMTP credentials or STORE_EMAIL not configured');
    throw new Error('Server email configuration error.'); // ألقِ خطأ هنا
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const mailOptions = {
    from: `Contact Form <${SMTP_USER}>`,
    to: STORE_EMAIL,
    subject: `📧 رسالة جديدة من العميل: ${contactData.name}`,
    html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; border: 1px solid #667eea; padding: 20px; border-radius: 8px;">
            <h2 style="color: #667eea;">رسالة تواصل جديدة</h2><hr>
            <h4 style="color: #333;">تفاصيل المرسل:</h4>
            <p><strong>الاسم:</strong> ${contactData.name}</p>
            <p><strong>البريد الإلكتروني:</strong> ${contactData.email}</p>
            <p><strong>الهاتف:</strong> ${contactData.phone || 'لم يُدخل رقم هاتف'}</p><hr>
            <h4 style="color: #E91E63;">نص الرسالة:</h4>
            <div style="border: 1px dashed #E91E63; padding: 15px; background-color: #fffafa; margin-bottom: 20px;">
               ${contactData.message.replace(/\n/g, '<br>')}
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #777;">رسالة آلية.</p>
        </div>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Contact message from ${contactData.email} sent successfully to ${STORE_EMAIL}`);
  } catch (error) {
    console.error("[EMAIL ERROR] Failed to send contact message:", error.message);
    throw new Error('Failed to send email.'); // ألقِ خطأ ليتم التقاطه في الـ controller
  }
}


// --- وظيفة التحكم الرئيسية ---
// @desc    معالجة رسالة نموذج الاتصال
// @route   POST /api/contact
// @access  Public
const handleContactForm = async (req, res) => {
  const contactData = req.body;

  // التحقق من البيانات
  if (!contactData.name || !contactData.email || !contactData.message) {
    return res.status(400).json({
      success: false,
      message: 'الرجاء تعبئة جميع الحقول المطلوبة (الاسم، البريد، الرسالة).'
    });
  }

  try {
    // إرسال الإيميل باستخدام الدالة الداخلية
    await sendContactEmailInternal(contactData);

    res.status(200).json({
      success: true,
      message: 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.'
    });

  } catch (error) {
    console.error(`Error processing contact form for ${contactData.email}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'فشل إرسال الرسالة. يرجى المحاولة لاحقاً.' // إظهار رسالة الخطأ من دالة الإيميل
    });
  }
};

module.exports = { handleContactForm };