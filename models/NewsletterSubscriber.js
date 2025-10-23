// models/NewsletterSubscriber.js
const mongoose = require('mongoose');

const newsletterSubscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب للاشتراك'],
    unique: true, // يمنع تكرار نفس الإيميل
    lowercase: true, // يحول الإيميل إلى حروف صغيرة دائماً
    trim: true, // يزيل المسافات الزائدة من البداية والنهاية
    // يمكنك إضافة تحقق إضافي لصحة صيغة الإيميل
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'الرجاء إدخال بريد إلكتروني صحيح'],
  },
  subscribedAt: {
    type: Date,
    default: Date.now, // يسجل تاريخ الاشتراك تلقائياً
  },
});

const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);

module.exports = NewsletterSubscriber; // تصدير النموذج