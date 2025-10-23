// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const { addReview, getReviewsByProduct } = require('../controllers/reviewController.js'); // استيراد الوظائف

// POST /api/reviews - إضافة مراجعة جديدة
router.post('/', addReview);

// GET /api/reviews/:productId - جلب المراجعات لمنتج معين
// لاحظ استخدام :productId الخاص بالمنتج وليس _id الخاص بالمراجعة
router.get('/:productId', getReviewsByProduct);

// يمكنك إضافة مسارات أخرى لاحقاً (مثل حذف مراجعة للمدير)
// router.delete('/:id', protectAdmin, deleteReview);

module.exports = router;