// models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true }, // سعر الوحدة عند الشراء
  image: { type: String, required: false }, // اختياري
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true }, // رقم الطلب الفريد
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: false },
      notes: { type: String, required: false },
    },
    items: [orderItemSchema], // مصفوفة المنتجات المطلوبة
    payment: {
      method: { type: String, required: true, enum: ['cod', 'card', 'bank'] }, // طرق الدفع
      subtotal: { type: Number, required: true },
      shipping: { type: Number, required: true },
      discount: { type: Number, required: true, default: 0 },
      total: { type: Number, required: true },
      // يمكن إضافة تفاصيل أخرى للدفع الإلكتروني لاحقاً (status, transactionId...)
    },
    delivery: {
      date: { type: String, required: true }, // قد يكون String أسهل من Date للتعامل مع المدخلات
      time: { type: String, required: true }, // الفترة الزمنية
    },
    giftMessage: { type: String, required: false },
    couponCode: { type: String, required: false },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending', // الحالة الافتراضية
    },
  },
  {
    timestamps: true, // يضيف createdAt و updatedAt
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;