// controllers/reviewController.js
const Review = require('../models/Review.js');
const Product = require('../models/Product.js'); // لاستخدامه في تحديث تقييم المنتج
const mongoose = require('mongoose');

// @desc    إضافة مراجعة جديدة
// @route   POST /api/reviews
// @access  Public (لكن يمكن حمايته للمستخدمين المسجلين لاحقاً)
const addReview = async (req, res) => {
  try {
    const { productId, name, comment, rating } = req.body;

    // التحقق من المدخلات
    if (!productId || !name || !comment || !rating) {
      return res.status(400).json({ success: false, message: 'الرجاء ملء جميع الحقول المطلوبة.' });
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
       return res.status(400).json({ success: false, message: 'معرف المنتج غير صالح.' });
    }

    // التحقق من وجود المنتج
    const productExists = await Product.findById(productId);
    if (!productExists) {
        return res.status(404).json({ success: false, message: 'المنتج المراد تقييمه غير موجود.' });
    }

    // لاحقاً: يمكنك إضافة تحقق لمنع نفس المستخدم من إضافة أكثر من مراجعة

    const newReview = new Review({
        productId, // الربط بالمنتج
        name,
        comment,
        rating: Number(rating) // التأكد من أنه رقم
    });

    await newReview.save();

    // --- تحديث تقييم المنتج الإجمالي (اختياري لكن جيد) ---
    try {
        const reviews = await Review.find({ productId });
        const totalRating = reviews.reduce((acc, item) => item.rating + acc, 0);
        productExists.rating = totalRating / reviews.length;
        productExists.reviews = reviews.length;
        await productExists.save();
    } catch (calcError) {
        console.error(`Error calculating average rating for product ${productId}:`, calcError);
        // لا توقف العملية إذا فشل الحساب فقط
    }
    // --- نهاية تحديث التقييم ---

    res.status(201).json({
      success: true,
      message: 'تم إضافة تقييمك بنجاح، شكراً لك.',
      review: newReview
    });

  } catch (error) {
    console.error('Error adding review:', error);
     if (error.name === 'ValidationError') {
         return res.status(400).json({ success: false, message: 'خطأ في التحقق من بيانات المراجعة', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'فشل حفظ المراجعة.' });
  }
};

// @desc    جلب المراجعات لمنتج معين
// @route   GET /api/reviews/:productId
// @access  Public
const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
       return res.status(400).json({ success: false, message: 'معرف المنتج غير صالح.' });
    }

    // جلب المراجعات المرتبطة بمعرف المنتج، الأحدث أولاً
    // يمكنك إضافة .where({ isApproved: true }) لاحقاً لجلب المراجعات المعتمدة فقط
    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'فشل جلب المراجعات.' });
  }
};

module.exports = {
  addReview,
  getReviewsByProduct,
};