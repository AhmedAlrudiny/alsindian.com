// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    // ربط المراجعة بالمنتج
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', // اسم النموذج الذي نشير إليه
    required: true,
  },
  name: {
    type: String,
    required: [true, 'اسم المراجع مطلوب'],
    trim: true,
  },
  comment: {
    type: String,
    required: [true, 'نص المراجعة مطلوب'],
    trim: true,
  },
  rating: {
    type: Number,
    required: [true, 'التقييم (عدد النجوم) مطلوب'],
    min: 1,
    max: 5,
  },
  // يمكن إضافة حقل للموافقة على المراجعة قبل ظهورها
  // isApproved: { type: Boolean, default: false },
}, {
  timestamps: true, // يضيف createdAt و updatedAt
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;