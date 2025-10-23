// server.js - النسخة المطورة (أكثر أماناً واستقراراً)

// --- استيراد الوحدات الأساسية ---
require('dotenv').config(); // تحميل متغيرات البيئة أولاً
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// --- استيراد وحدات الأمان والتحسين ---
const helmet = require('helmet'); // [تحسين 1] للأمان
const morgan = require('morgan'); // [تحسين 3] لتسجيل الطلبات
const rateLimit = require('express-rate-limit'); // [تحسين 2] لمنع إغراق السيرفر

// --- استيراد وحدات المشروع ---
const connectDB = require('./config/db.js');
const productRoutes = require('./routes/productRoutes.js');
const orderRoutes = require('./routes/orderRoutes.js');
const contactRoutes = require('./routes/contactRoutes.js');
const newsletterRoutes = require('./routes/newsletterRoutes.js');
const reviewRoutes = require('./routes/reviewRoutes.js');
const customOrderRoutes = require('./routes/customOrderRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');

// --- إعدادات أولية ---
connectDB(); // الاتصال بقاعدة البيانات
const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// --- Middleware (برامج وسيطة) ---

// [تحسين 1] إضافة 11 طبقة حماية HTTP أساسية
app.use(helmet());

// [تحسين 5] إعدادات CORS آمنة للإنتاج
const allowedOrigins = [
  process.env.FRONTEND_URL, // رابط موقعك (مثال: https://my-store.com)
  'http://localhost:5500',  // رابط اللايف سيرفر للتطوير
  'http://127.0.0.1:5500' // رابط آخر للايف سيرفر
];

const corsOptions = {
  origin: (origin, callback) => {
    // اسمح بالطلبات التي لا تحتوي على origin (مثل Postman) أو الطلبات من النطاقات المسموحة
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};
// استخدم الإعدادات الآمنة في الإنتاج، والسماح للكل في التطوير
app.use(isProduction ? cors(corsOptions) : cors());

// [تحسين 3] تسجيل الطلبات (اختر 'dev' للتطوير، 'combined' للإنتاج)
app.use(isProduction ? morgan('combined') : morgan('dev'));

// Middlewares الأساسية
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- خدمة الملفات الثابتة (مثل الصور المرفوعة) ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR);
    console.log(`Created uploads directory at: ${UPLOAD_DIR}`);
  } catch (err) {
    console.error(`Error creating uploads directory: ${err}`);
  }
}
app.use('/uploads', express.static(UPLOAD_DIR));

// --- [تحسين 2] إعدادات تحديد سرعة الطلبات ---
// حد عام لكل API (150 طلب كل 15 دقيقة)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 150, // أقصى عدد طلبات
  message: 'طلبات كثيرة جداً من هذا الـ IP، يرجى المحاولة لاحقاً.',
  standardHeaders: true,
  legacyHeaders: false,
});

// حد صارم جداً لصفحة دخول المدير (10 محاولات كل 15 دقيقة)
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 10, // أقصى عدد محاولات
  message: 'محاولات تسجيل دخول كثيرة جداً، تم حظرك مؤقتاً.',
  standardHeaders: true,
  legacyHeaders: false,
});

// تطبيق المحددات
app.use('/api', apiLimiter); // تطبيق الحد العام على كل مسارات /api
app.use('/api/admin/login', adminLoginLimiter); // تطبيق الحد الصارم على مسار الدخول

// --- مسار افتراضي للتحقق ---
app.get('/', (req, res) => {
  res.send('🌹 Wardat Al-Sindiyan API is running (v2 Enhanced)...');
});

// --- استخدام المسارات (Routes) ---
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload-custom-order', customOrderRoutes);
app.use('/api/admin', adminRoutes);

// --- معالجة الأخطاء 404 ---
app.use((req, res, next) => {
    res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});

// --- معالجة الأخطاء العامة ---
// [تحسين 4] بفضل 'express-async-errors'، سيتم إرسال أي خطأ async إلى هنا تلقائياً
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack || err);
    const statusCode = res.statusCode === 200 ? 500 : (res.statusCode || 500);
    res.status(statusCode).json({
        message: err.message || 'Server Error',
        stack: isProduction ? '🥞' : err.stack,
    });
});

// --- تشغيل السيرفر ---
app.listen(port, () => {
  console.log(`\n----------------------------------------------------`);
  console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
  console.log(`🔗 Access API at: http://localhost:${port}`);
  console.log(`----------------------------------------------------\n`);
});