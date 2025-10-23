// routes/customOrderRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { handleCustomOrderUpload } = require('../controllers/customOrderController.js'); // استيراد الوظيفة

// --- إعداد Multer (لتخزين الملفات مؤقتاً) ---
const UPLOAD_DIR = path.join(__dirname, '../uploads'); // ../ للرجوع للمجلد الرئيسي ثم uploads
if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true }); // recursive لإنشاء المجلدات إذا لم تكن موجودة
    console.log(`Created uploads directory for custom orders at: ${UPLOAD_DIR}`);
  } catch (err) {
    console.error(`Error creating uploads directory for custom orders: ${err}`);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // اسم فريد للملف لتجنب التكرار
    cb(null, `custom-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('نوع الملف غير مدعوم. يُسمح فقط بـ JPEG, JPG, PNG, GIF.'), false);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB حد أقصى
  fileFilter: fileFilter,
});


// --- تعريف المسار ---
// POST /api/upload-custom-order
// استخدم upload.single('designImage') لاستقبال ملف واحد باسم 'designImage'
router.post('/', upload.single('designImage'), handleCustomOrderUpload);

module.exports = router;