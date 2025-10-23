// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم المنتج مطلوب'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'سعر المنتج مطلوب'],
      min: [0, 'السعر لا يمكن أن يكون سالباً'],
    },
    image: {
      type: String,
      required: false, // يمكن أن يكون اختيارياً أو له قيمة افتراضية
      default: '/images/default-product.jpg', // مسار صورة افتراضية
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'تصنيف المنتج مطلوب'],
      trim: true,
    },
    type: {
      type: String,
      required: false,
      enum: ['طبيعي', 'صناعي'], // حدد الأنواع المسموح بها
      default: 'طبيعي',
    },
    details: {
      // تفاصيل إضافية ككائن
      colors: [String], // مصفوفة من الألوان
      count: String,
      size: String,
      freshness: String,
      care: String,
    },
    stock: {
      // عدد القطع المتوفرة
      type: Number,
      required: false,
      default: 0,
      min: [0, 'المخزون لا يمكن أن يكون سالباً'],
    },
    rating: {
      // متوسط التقييم
      type: Number,
      required: false, // يتم حسابه لاحقاً أو له قيمة افتراضية
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: {
      // عدد المراجعات
      type: Number,
      required: false,
      default: 0,
    },
    // يمكن إضافة حقول أخرى مثل isFeatured, isOnSale...
  },
  {
    timestamps: true, // يضيف createdAt و updatedAt تلقائياً
  }
);

// إنشاء وفهرسة النص للبحث (اختياري لكن مفيد)
productSchema.index({ name: 'text', description: 'text', category: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product; // تصدير النموذج لاستخدامه في الـ Controllers