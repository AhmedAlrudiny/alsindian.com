// routes/productRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator'); // <-- استيراد express-validator
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController.js');
const { protectAdmin } = require('../middleware/authMiddleware.js');
const mongoose = require('mongoose');

const router = express.Router();

// --- مسارات عامة ---
router.get('/', getProducts);
router.get('/:id', getProductById);

// --- مسارات المدير ---

// [تطوير] إضافة قواعد التحقق للمنتج
const productValidationRules = () => {
  return [
    body('name').trim().notEmpty().withMessage('اسم المنتج مطلوب'),
    body('price').isFloat({ gt: 0 }).withMessage('السعر يجب أن يكون رقمًا أكبر من صفر'),
    body('category').trim().notEmpty().withMessage('تصنيف المنتج مطلوب'),
    body('type').optional().isIn(['طبيعي', 'صناعي']).withMessage('النوع يجب أن يكون طبيعي أو صناعي'),
    body('stock').optional().isInt({ min: 0 }).withMessage('المخزون يجب أن يكون رقمًا صحيحًا غير سالب'),
    // --- السطر التالي تم تعديله ---
    body('image').optional().trim().isString().withMessage('مسار الصورة يجب أن يكون نصاً (إذا تم إدخاله)') // فقط نتأكد أنه نص
  ];
};

// [تطوير] Middleware لمعالجة أخطاء التحقق
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  // استخراج رسائل الخطأ
  const extractedErrors = []
  errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }))

  return res.status(400).json({
    success: false,
    message: 'خطأ في البيانات المدخلة',
    errors: extractedErrors,
  });
};

// تطبيق التحقق على مسارات الإنشاء والتحديث
router.post('/', protectAdmin, productValidationRules(), validate, createProduct);
router.put('/:id', protectAdmin, productValidationRules(), validate, updateProduct);
router.delete('/:id', protectAdmin, deleteProduct);

module.exports = router;