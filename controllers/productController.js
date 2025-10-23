// controllers/productController.js
const mongoose = require('mongoose'); // <-- *** أضف هذا السطر ***
const Product = require('../models/Product.js'); // افترض أن لديك هذا الملف

// @desc    جلب كل المنتجات
// @route   GET /api/products
// @access  Public (عام للعملاء)
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    console.error('Error in getProducts:', error);
    res.status(500).json({ message: 'خطأ في الخادم عند جلب المنتجات' });
  }
};

// @desc    جلب منتج واحد حسب الـ ID
// @route   GET /api/products/:id
// @access  Public (عام للعملاء)
const getProductById = async (req, res) => {
  try {
    // تحقق من صلاحية الـ ID قبل البحث
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'معرف المنتج غير صالح' });
    }
    const product = await Product.findById(req.params.id);

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'لم يتم العثور على المنتج' });
    }
  } catch (error) {
    console.error('Error in getProductById:', error);
    res.status(500).json({ message: 'خطأ في الخادم عند جلب المنتج' });
  }
};

// --- ( ADMIN FUNCTIONS ) ---

// @desc    إنشاء منتج جديد
// @route   POST /api/products
// @access  Private (للمدير فقط)
const createProduct = async (req, res) => {
  try {
    const {
      name, price, image, description, category, type, details, stock,
    } = req.body;

    // التحقق من الحقول الإلزامية الأساسية
    if (!name || !price || !category) {
        return res.status(400).json({ message: 'الرجاء إدخال الاسم والسعر والتصنيف على الأقل' });
    }

    const product = new Product({
      name,
      price: Number(price), // تأكد من أنه رقم
      image: image || '/images/placeholder.jpg', // صورة افتراضية
      description: description || '',
      category,
      type: type || 'طبيعي', // قيمة افتراضية
      details: details || {},
      stock: stock !== undefined ? Number(stock) : 0, // تأكد من أنه رقم
      rating: 0,
      reviews: 0,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Error in createProduct:', error);
    // تفصيل أكثر لخطأ التحقق من الصحة
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'خطأ في التحقق من بيانات المنتج', errors: error.errors });
    }
    res.status(500).json({ message: 'خطأ في الخادم أثناء إنشاء المنتج' });
  }
};

// @desc    تحديث منتج
// @route   PUT /api/products/:id
// @access  Private (للمدير فقط)
const updateProduct = async (req, res) => {
   try {
    // تحقق من صلاحية الـ ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'معرف المنتج غير صالح' });
    }

    const {
      name, price, image, description, category, type, details, stock,
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name || product.name;
      product.price = price !== undefined ? Number(price) : product.price;
      product.image = image || product.image;
      product.description = description || product.description;
      product.category = category || product.category;
      product.type = type || product.type;
      product.details = details || product.details;
      product.stock = stock !== undefined ? Number(stock) : product.stock;

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'لم يتم العثور على المنتج للتحديث' });
    }
  } catch (error) {
    console.error('Error in updateProduct:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'خطأ في التحقق من بيانات المنتج', errors: error.errors });
    }
    res.status(500).json({ message: 'خطأ في الخادم أثناء تحديث المنتج' });
  }
};

// @desc    حذف منتج
// @route   DELETE /api/products/:id
// @access  Private (للمدير فقط)
const deleteProduct = async (req, res) => {
  try {
    // تحقق من صلاحية الـ ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'معرف المنتج غير صالح' });
    }

    const product = await Product.findById(req.params.id);

    if (product) {
      await product.deleteOne(); // استخدم .deleteOne()
      res.json({ message: 'تم حذف المنتج بنجاح' });
    } else {
      res.status(404).json({ message: 'لم يتم العثور على المنتج للحذف' });
    }
  } catch (error) {
    console.error('Error in deleteProduct:', error);
    res.status(500).json({ message: 'خطأ في الخادم أثناء حذف المنتج' });
  }
};

// استخدم module.exports
module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};