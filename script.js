// script.js - الكود الكامل والنهائي للعمل مع الواجهة الخلفية (Backend API) - (تم تصحيحه)

// =================================================================
// 1. CONSTANTS & CONFIGURATION
// =================================================================
const CONFIG = {
    SHIPPING_RATE: 15.00, // قيمة الشحن (عدّلها إذا أردت)
    FREE_SHIPPING_THRESHOLD: 100,
    VAT_RATE: 0.14, // نسبة الضريبة (14%)
    STORAGE_KEY: 'wardat-alsindian-cart',
    ORDER_KEY: 'last-order',
    GIFT_MESSAGE_KEY: 'wardat-alsindian-gift-message',
    COUPON_KEY: 'applied-coupon',
    // --- API Endpoints ---
    API_BASE_URL: 'http://localhost:3000/api', // تأكد أن هذا هو الرابط الصحيح للسيرفر
    get PRODUCTS_API_URL() { return `${this.API_BASE_URL}/products`; },
    get ORDERS_API_URL() { return `${this.API_BASE_URL}/orders`; },
    get CONTACT_URL() { return `${this.API_BASE_URL}/contact`; },
    get REVIEWS_API_URL() { return `${this.API_BASE_URL}/reviews`; },
    get CUSTOM_ORDER_URL() { return `${this.API_BASE_URL}/upload-custom-order`; },
    get NEWSLETTER_URL() { return `${this.API_BASE_URL}/newsletter`; },
    // ---------------------
    ANIMATION_DURATION: 300 // مدة الأنيميشن بالمللي ثانية
};
// =================================================================
// 2. GLOBAL STATE
// =================================================================
let allProducts = []; // لتخزين المنتجات بعد جلبها من الـ API

// Coupons Database (مؤقتًا - الأفضل نقلها للباك اند لاحقاً)
const COUPONS = {
    'WELCOME10': { discount: 0.10, minPurchase: 50, description: 'خصم 10% للعملاء الجدد' },
    'FLOWER20': { discount: 0.20, minPurchase: 100, description: 'خصم 20% على الطلبات فوق 100 ر.س' },
    'VIP30': { discount: 0.30, minPurchase: 200, description: 'خصم 30% للعملاء المميزين' }
};

// =================================================================
// 3. UTILITY FUNCTIONS
// =================================================================
const Utils = {
    formatCurrency: (amount) => `ر.س ${parseFloat(amount).toFixed(2)}`,

    formatDate: (date) => {
        try {
            // إضافة خيارات الوقت إذا كان التاريخ يتضمن وقتاً
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const d = new Date(date);
            // التحقق من صلاحية التاريخ قبل التنسيق
            if (isNaN(d.getTime())) {
                return "تاريخ غير صالح";
            }
            // إظهار الوقت فقط إذا لم يكن منتصف الليل بالضبط
            if (d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0) {
                options.hour = 'numeric';
                options.minute = '2-digit';
            }
            return d.toLocaleDateString('ar-SA', options);
        } catch (e) { console.error("Error formatting date:", e); return "تاريخ غير صالح"; }
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout); timeout = setTimeout(later, wait);
        };
    },

    validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase()),

    validatePhone: (phone) => /^[\d+\s-]{10,}$/.test(String(phone)),

    scrollToTop: (smooth = true) => window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' }),

    // البحث في مصفوفة المنتجات المحملة allProducts باستخدام _id
    getProductById: (id) => allProducts.find(p => p._id === id),

    // دالة إنشاء نجوم التقييم
    generateStars: (rating) => {
        let starsHtml = '';
        const ratingNum = parseFloat(rating) || 0;
        const fullStars = Math.floor(ratingNum);
        const hasHalfStar = ratingNum % 1 !== 0 && ratingNum > 0; // تأكد أن التقييم أكبر من صفر لوجود نصف نجمة
        for (let i = 0; i < fullStars; i++) starsHtml += '<i class="fas fa-star"></i>';
        if (hasHalfStar) starsHtml += '<i class="fas fa-star-half-alt"></i>';
        const emptyStars = 5 - Math.ceil(ratingNum);
        for (let i = 0; i < emptyStars; i++) starsHtml += '<i class="far fa-star"></i>'; // نجمة فارغة
        return starsHtml;
    }
};

// =================================================================
// 4. STORAGE MANAGEMENT
// =================================================================
const Storage = {
    get: (key) => { try { const i = localStorage.getItem(key); return i ? JSON.parse(i) : null; } catch (e) { console.error(`Error get ${key}:`, e); return null; } },
    set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { console.error(`Error set ${key}:`, e); return false; } },
    remove: (key) => { try { localStorage.removeItem(key); return true; } catch (e) { console.error(`Error remove ${key}:`, e); return false; } }
};

// =================================================================
// 5. CART MANAGEMENT
// =================================================================
const Cart = {
    get: () => Storage.get(CONFIG.STORAGE_KEY) || [],
    save: (cart) => Storage.set(CONFIG.STORAGE_KEY, cart),
    add: (product) => { // يتوقع _id
        let cart = Cart.get(); const existing = cart.find(i => i._id === product._id);
        if (existing) { existing.quantity = (existing.quantity || 0) + (product.quantity || 1); } // التأكد من أن الكمية رقم
        else { cart.push({ _id: product._id, name: product.name, price: product.price, image: product.image, quantity: product.quantity || 1 }); } // قيمة افتراضية للكمية
        Cart.save(cart); Cart.updateCount(); return cart;
    },
    remove: (productId) => { let c = Cart.get().filter(i => i._id !== productId); Cart.save(c); Cart.updateCount(); return c; }, // يستخدم _id
    updateQuantity: (productId, quantity) => { // يستخدم _id
        let cart = Cart.get(); const item = cart.find(i => i._id === productId);
        if (item) { const nQty = parseInt(quantity); if (isNaN(nQty) || nQty <= 0) { return Cart.remove(productId); } item.quantity = nQty; Cart.save(cart); Cart.updateCount(); }
        return cart;
    },
    clear: () => { Storage.remove(CONFIG.STORAGE_KEY); Cart.updateCount(); },
    getCount: () => Cart.get().reduce((s, i) => s + (i.quantity || 0), 0), // التأكد من أن الكمية رقم
    updateCount: () => {
        const c = Cart.getCount(); document.querySelectorAll('#cart-count').forEach(el => { if (el) { el.textContent = c; const p = el.closest('.cart-outline'); if (p) p.classList.toggle('has-items', c > 0); } });
    },
    calculateTotals: (couponCode = null) => {
        const cart = Cart.get();
        const sub = cart.reduce((s, i) => s + ((i.price || 0) * (i.quantity || 0)), 0);

        // حساب الشحن الشرطي
        let ship = (sub > 0 && sub < CONFIG.FREE_SHIPPING_THRESHOLD) ? CONFIG.SHIPPING_RATE : 0;

        // حساب الخصم
        let disc = 0;
        let appliedC = null;
        if (couponCode && COUPONS[couponCode]) {
            const coup = COUPONS[couponCode];
            if (sub >= coup.minPurchase) {
                disc = sub * coup.discount;
                appliedC = coup;
            }
        }

        // حساب الإجمالي قبل الضريبة
        const baseTotal = sub + ship - disc;
        const safeBaseTotal = baseTotal < 0 ? 0 : baseTotal; // التأكد من أنه ليس سالبًا

        // حساب الضريبة (14%)
        // لا نحسب الضريبة إذا كان الإجمالي صفرًا
        const vat = safeBaseTotal > 0 ? safeBaseTotal * CONFIG.VAT_RATE : 0;

        // حساب الإجمالي النهائي
        const tot = safeBaseTotal + vat;
        const finalTot = tot < 0 ? 0 : tot; // التأكد مرة أخرى

        return {
            subtotal: sub,
            shippingCost: ship,
            discount: disc,
            vatAmount: vat, // <-- إضافة الضريبة للنتائج
            total: finalTot,
            appliedCoupon: appliedC
        };
    }
};

// =================================================================
// 6. UI NOTIFICATIONS (Toast)
// =================================================================
const Toast = {
    container: null,
    init: () => { if (!Toast.container) { Toast.container = document.createElement('div'); Toast.container.className = 'toast-container'; Toast.container.style.cssText = 'position: fixed; top: 90px; left: 20px; z-index: 9999; max-width: 350px;'; document.body.appendChild(Toast.container); } },
    show: (message, type = 'success', duration = 3000) => {
        Toast.init(); const t = document.createElement('div'); t.className = `toast-notification ${type}`; const icons = { success: 'fa-check-circle', danger: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        t.innerHTML = `<i class="fas ${icons[type] || icons.info} mr-2"></i><span>${message}</span>`; Toast.container.appendChild(t);
        // Animate in
        requestAnimationFrame(() => { t.style.transition = `transform ${CONFIG.ANIMATION_DURATION}ms ease, opacity ${CONFIG.ANIMATION_DURATION}ms ease`; t.style.opacity = '1'; t.style.transform = 'translateX(0)'; });
        // Animate out
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-100%)'; t.addEventListener('transitionend', () => t.remove(), { once: true }); }, duration);
    }
};

// =================================================================
// 7. SEARCH & FILTER
// =================================================================
const Search = {
    filterProducts: (searchTerm) => {
        const conts = document.querySelectorAll('#product-list-container .col-lg-4'); const grps = document.querySelectorAll('.product-group');
        const norm = searchTerm.trim().toLowerCase(); let found = 0;
        conts.forEach(c => { const card = c.querySelector('.product-card'); if (!card) return; const n = card.dataset.name?.toLowerCase() || ''; const cat = card.dataset.category?.toLowerCase() || ''; const desc = c.querySelector('.product-description')?.textContent.toLowerCase() || ''; if (!norm || n.includes(norm) || cat.includes(norm) || desc.includes(norm)) { c.style.display = ''; found++; } else { c.style.display = 'none'; } });
        grps.forEach(g => { const vis = g.querySelector('.col-lg-4:not([style*="display: none"])'); g.style.display = vis ? 'block' : 'none'; });
        const noRes = document.getElementById('no-results'); if (noRes) noRes.style.display = found === 0 && norm ? 'block' : 'none';
    },
    // Helper function for filters
    _applyFilter: (key, value) => {
        const conts = document.querySelectorAll('#product-list-container .col-lg-4'); const grps = document.querySelectorAll('.product-group'); let count = 0;
        conts.forEach(c => { const card = c.querySelector('.product-card'); if (!card) return; const dataVal = card.dataset[key]; if (value === 'all' || dataVal === value) { c.style.display = ''; count++; } else { c.style.display = 'none'; } });
        grps.forEach(g => { const vis = g.querySelector('.col-lg-4:not([style*="display: none"])'); g.style.display = vis ? 'block' : 'none'; });
        const noRes = document.getElementById('no-results'); if (noRes) noRes.style.display = value !== 'all' && count === 0 ? 'block' : 'none';
        const searchIn = document.getElementById('search-input'); if (searchIn) searchIn.value = ''; // Reset search
    },
    filterByCategory: (category) => Search._applyFilter('category', category),
    filterByProductType: (type) => Search._applyFilter('type', type)
};

// =================================================================
// 8. INDEX PAGE
// =================================================================
const IndexPage = {
    init: async () => {
        await IndexPage.loadAndRenderProducts();
        if (allProducts.length > 0) {
            IndexPage.setupSearch();
            IndexPage.setupFilters();
            IndexPage.setupContactForm();
            IndexPage.setupNewsletter();
            IndexPage.setupCustomOrderForm();
            // AddToCart and Animations setup inside loadAndRenderProducts
        }
    },
    loadAndRenderProducts: async () => {
        const listCont = document.getElementById('product-list-container');
        const catRows = document.querySelectorAll('.product-group .row');
        const noRes = document.getElementById('no-results');

        document.querySelectorAll('.product-group').forEach(group => { /* ... عرض التحميل ... */ });
        if (noRes) noRes.style.display = 'none';

        try {
            const res = await fetch(CONFIG.PRODUCTS_API_URL);
            if (!res.ok) { /* ... معالجة خطأ التحميل ... */ throw new Error(/* ... */); }
            allProducts = await res.json();
            if (!Array.isArray(allProducts)) throw new Error("تنسيق بيانات غير صحيح.");

            catRows.forEach(r => r.innerHTML = ''); // مسح التحميل

            if (allProducts.length === 0) { /* ... معالجة عدم وجود منتجات ... */ return; }

            IndexPage.renderProducts(allProducts);
            IndexPage.setupAddToCart();
            IndexPage.setupAnimations();

        } catch (e) { /* ... عرض خطأ التحميل للمستخدم ... */ }
    },

    renderProducts: (prods) => {
        const cats = {}; prods.forEach(p => { if (!cats[p.category]) cats[p.category] = []; cats[p.category].push(p); });
        const allCatContainersExist = Object.keys(cats).every(cName => document.getElementById(`category-${cName}-row`));
        if (!allCatContainersExist) console.warn("Missing category containers in HTML.");

        Object.keys(cats).forEach(catName => {
            const contId = `category-${catName}-row`; const cont = document.getElementById(contId); const grpCont = cont?.closest('.product-group');
            if (cont && grpCont) {
                grpCont.style.display = 'block'; const html = cats[catName].map(p => {
                    const stars = Utils.generateStars(p.rating || 0);
                    const revCount = p.reviews || 0;
                    const pId = p._id;
                    const badge = p.type === 'صناعي' ? 'صناعي' : 'طبيعي';
                    const badgeCls = p.type === 'صناعي' ? 'badge-secondary' : 'badge-new';
                    let imgP = p.image || '/images/default-product.jpg';
                    if (!imgP.startsWith('/') && !imgP.startsWith('http')) imgP = '/' + imgP;

                    // [إصلاح] التحقق من المخزون لزر الإضافة السريعة
                    const isOutOfStock = p.stock === 0;
                    const quickAddButtonHtml = `
                        <button
                            class="btn-quick-add add-to-cart-btn ${isOutOfStock ? 'disabled bg-secondary' : ''}"
                            data-id="${pId}"
                            aria-label="${isOutOfStock ? 'نفدت الكمية' : 'إضافة للسلة'}"
                            ${isOutOfStock ? 'disabled' : ''}
                            title="${isOutOfStock ? 'نفدت الكمية' : 'إضافة للسلة'}"
                        >
                            <i class="fas ${isOutOfStock ? 'fa-ban' : 'fa-plus'}"></i>
                        </button>
                    `;

                    return `
                    <div class="col-lg-4 col-md-6 mb-4">
                        <div class="product-card" data-id="${pId}" data-name="${p.name}" data-price="${p.price.toFixed(2)}" data-category="${p.category}" data-type="${p.type}">
                            <div class="product-badge ${badgeCls}">${badge}</div>
                            <a href="product-details.html?id=${pId}" class="product-link">
                                <div class="product-image-container">
                                    <img src="${imgP}" class="product-image" alt="${p.name}" onerror="this.onerror=null;this.src='/images/default-product.jpg';">
                                    <div class="product-overlay"><i class="fas fa-eye"></i></div>
                                </div>
                                <div class="product-body">
                                    <div class="product-rating">${stars}<span class="rating-count">(${revCount})</span></div>
                                    <h5 class="product-title">${p.name}</h5>
                                    <p class="product-description">${p.description || ''}</p>
                                    <div class="product-footer">
                                        <span class="product-price">${Utils.formatCurrency(p.price)}</span>
                                        ${quickAddButtonHtml}
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                    `;
                }).join(''); cont.innerHTML = html;
            } else { const grpEl = document.querySelector(`.product-group[data-category="${catName}"]`); if (grpEl) grpEl.style.display = 'none'; console.warn(`Container/group missing for category: ${catName}`);}
        });
        document.querySelectorAll('.product-group').forEach(g => { const r = g.querySelector('.row'); if (!r || r.children.length === 0) g.style.display = 'none'; });
    },
    setupAddToCart: () => {
        const cont = document.getElementById('product-list-container'); if (!cont) return;
        const newCont = cont.cloneNode(true); cont.parentNode.replaceChild(newCont, cont);
        newCont.addEventListener('click', IndexPage._handleProductClick);
    },
    _handleProductClick: (e) => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (btn && !btn.disabled) { // [إصلاح] التحقق من أن الزر ليس معطلاً
            e.preventDefault(); e.stopPropagation(); const pId = btn.dataset.id; const p = Utils.getProductById(pId);
            if (p) { Cart.add({ _id: p._id, name: p.name, price: p.price, image: p.image, quantity: 1 }); Toast.show(`✅ تمت إضافة "${p.name}"`); btn.innerHTML = '<i class="fas fa-check"></i>'; btn.classList.add('btn-success'); btn.disabled = true; setTimeout(() => { const currBtn = document.querySelector(`.add-to-cart-btn[data-id="${pId}"]`); if (currBtn) { currBtn.innerHTML = '<i class="fas fa-plus"></i>'; currBtn.classList.remove('btn-success'); currBtn.disabled = false; } }, 1500); }
            else if (!p) { Toast.show('❌ خطأ: المنتج غير موجود.', 'danger'); }
        }
    },
    setupSearch: () => {
        const form = document.getElementById('search-form'); const input = document.getElementById('search-input');
        if (form && input) { const debounced = Utils.debounce((t) => Search.filterProducts(t), 300); input.addEventListener('input', (e) => debounced(e.target.value)); form.addEventListener('submit', (e) => { e.preventDefault(); Search.filterProducts(input.value); }); input.addEventListener('input', () => { document.querySelectorAll('.btn-filter.active').forEach(b => b.classList.remove('active')); }, { once: false }); }
    },
    setupFilters: () => {
        document.querySelectorAll('.btn-filter').forEach(b => b.addEventListener('click', function () { document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active')); this.classList.add('active'); const f = this.dataset.filter; if (f === 'طبيعي' || f === 'صناعي') Search.filterByProductType(f); else Search.filterByCategory(f); }));
    },
    // Helper function for form submissions
    _setupFormSubmit: (formId, url, successMsg, errorMsgPrefix) => {
        const f = document.getElementById(formId); if (!f) return;
        // Use cloning to reset listeners on re-init if needed
        const newF = f.cloneNode(true); f.parentNode.replaceChild(newF, f);

        newF.addEventListener('submit', async (e) => {
            e.preventDefault(); const btn = newF.querySelector('button[type="submit"]'); if (!btn) return; const txt = btn.innerHTML;
            let isValid = true; newF.querySelectorAll('[required]').forEach(el => { if (!el.checkValidity()) isValid = false; });
            const emailEl = newF.elements.email || newF.elements['contact-email'] || newF.elements['custom-email'];
            if (emailEl && !Utils.validateEmail(emailEl.value)) isValid = false;
            const fileInput = newF.elements.designImage;
            if (formId === 'custom-order-form' && fileInput && fileInput.files.length === 0 && fileInput.required) isValid = false;

            if (!isValid) { newF.classList.add('was-validated'); Toast.show('يرجى ملء الحقول المطلوبة بشكل صحيح', 'warning'); return; } newF.classList.remove('was-validated');

            let body; let headers = {}; let isFormData = formId === 'custom-order-form';
            if (isFormData) { body = new FormData(newF); }
            else { headers['Content-Type'] = 'application/json'; body = JSON.stringify(Object.fromEntries(new FormData(newF))); }

            btn.innerHTML = `<span class="spinner-border spinner-border-sm mr-2"></span> ${isFormData ? 'جاري الرفع...' : 'جاري الإرسال...'}`; btn.disabled = true;
            try { const res = await fetch(url, { method: 'POST', headers: headers, body: body }); const result = await res.json(); if (res.ok && result.success) { Toast.show(`✅ ${result.message || successMsg}`, 'success'); newF.reset(); } else { throw new Error(result.message || 'خطأ غير معروف'); } } catch (err) { Toast.show(`❌ ${errorMsgPrefix}: ${err.message}`, 'danger', 7000); } finally { btn.innerHTML = txt; btn.disabled = false; }
        });
    },
    setupContactForm: () => IndexPage._setupFormSubmit('contact-form', CONFIG.CONTACT_URL, 'تم إرسال رسالتك!', 'فشل إرسال الرسالة'),
    setupNewsletter: () => IndexPage._setupFormSubmit('newsletter-form', CONFIG.NEWSLETTER_URL, 'تم الاشتراك بنجاح!', 'فشل الاشتراك'),
    setupCustomOrderForm: () => IndexPage._setupFormSubmit('custom-order-form', CONFIG.CUSTOM_ORDER_URL, 'تم استلام طلبك المخصص!', 'فشل إرسال الطلب'),
    setupAnimations: () => {
         if ('IntersectionObserver' in window) { const obs = new IntersectionObserver((e, o) => e.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('animate-in'); o.unobserve(entry.target); } }), { threshold: 0.1 }); document.querySelectorAll('.product-card, .feature-card, .testimonial-card').forEach(el => obs.observe(el)); } else { console.warn("IntersectionObserver animations disabled."); }
    }
};

// =================================================================
// 9. PRODUCT DETAILS PAGE
// =================================================================
const ProductDetailsPage = {
    currentProduct: null, // لتخزين المنتج الحالي
    init: () => {
        ProductDetailsPage.render(); // سيقوم بالجلب والعرض
        // setupQuantityControls سيتم استدعاؤه داخل render إذا نجح
    },
    render: async () => {
        const urlP = new URLSearchParams(window.location.search); const pId = urlP.get('id'); const cont = document.getElementById('product-details'); const load = document.getElementById('loading-state'); const crumb = document.getElementById('breadcrumb-product');
        // التحقق من وجود العناصر الأساسية
        if (!pId || !cont || !load || !crumb) { console.error('Missing required elements on product details page.'); if (cont) cont.innerHTML = '<p class="text-danger text-center">خطأ في تهيئة الصفحة.</p>'; if (load) load.style.display = 'none'; return; }

        load.style.display = 'block'; cont.style.display = 'none'; // عرض التحميل، إخفاء المحتوى

        try {
            const res = await fetch(`${CONFIG.PRODUCTS_API_URL}/${pId}`);
            if (!res.ok) {
                 let errorMsg = `HTTP ${res.status}`;
                 try { const errData = await res.json(); errorMsg = errData.message || errorMsg; } catch (_) {}
                 // التعامل مع خطأ ObjectId غير صالح من MongoDB
                 if (res.status === 400 && errorMsg.toLowerCase().includes('invalid objectid')) {
                    errorMsg = 'معرف المنتج غير صالح.';
                 }
                 throw new Error(res.status === 404 ? 'المنتج غير موجود.' : errorMsg);
            }
            const p = await res.json();
            load.style.display = 'none'; // إخفاء التحميل
            if (!p || typeof p !== 'object' || !p._id) throw new Error('لم يتم العثور على بيانات المنتج.'); // تحقق من وجود _id

            ProductDetailsPage.currentProduct = p; // حفظ المنتج الحالي
            crumb.textContent = p.name; // تحديث مسار التنقل
            const stars = Utils.generateStars(p.rating || 0); const revCount = p.reviews || 0;
            let imgP = p.image || '/images/default-product.jpg'; if (!imgP.startsWith('/') && !imgP.startsWith('http')) imgP = '/' + imgP; // تصحيح مسار الصورة

            // بناء HTML الديناميكي للمنتج
            cont.innerHTML = `
                <div class="col-md-6 mb-4">
                    <div class="product-image-wrapper">
                        <img src="${imgP}" class="img-fluid rounded shadow-lg product-detail-image" alt="${p.name}" onerror="this.onerror=null;this.src='/images/default-product.jpg';">
                        <div class="product-badge-detail">${p.category}</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="product-detail-info">
                        <h1 class="product-detail-title">${p.name}</h1>
                        <div class="product-rating mb-3">${stars}<span class="rating-text">(${revCount} تقييم)</span></div>
                        <p class="lead text-muted mb-4">${p.description || ''}</p>
                        <div class="product-price-section mb-4">
                            <h3 class="product-detail-price">${Utils.formatCurrency(p.price)}</h3>
                            ${p.price >= CONFIG.FREE_SHIPPING_THRESHOLD ? '<span class="text-success"><i class="fas fa-truck mr-1"></i> توصيل مجاني</span>' : ''}
                        </div>
                        ${p.details ? `<div class="product-details-box mb-4"><h5 class="mb-3"><i class="fas fa-info-circle mr-2"></i> تفاصيل</h5><ul class="list-unstyled">${p.details.colors && p.details.colors.length > 0 ? `<li><i class="fas fa-palette mr-2"></i> <strong>الألوان:</strong> ${p.details.colors.join('، ')}</li>` : ''}${p.details.count ? `<li><i class="fas fa-boxes mr-2"></i> <strong>المحتوى:</strong> ${p.details.count}</li>` : ''}${p.details.size ? `<li><i class="fas fa-ruler-vertical mr-2"></i> <strong>الحجم:</strong> ${p.details.size}</li>` : ''}${p.details.freshness ? `<li><i class="fas fa-certificate mr-2"></i> <strong>النضارة:</strong> ${p.details.freshness}</li>` : ''}</ul></div>` : ''}
                        ${p.details?.care ? `<div class="care-tips mb-4"><h5 class="mb-3"><i class="fas fa-leaf mr-2"></i> عناية</h5><p class="text-muted">${p.details.care}</p></div>` : ''}
                        <div class="quantity-section mb-4">
                            <label class="font-weight-bold mb-2">الكمية:</label>
                            <div class="quantity-controls">
                                <button class="btn btn-outline-secondary btn-qty-minus" aria-label="تقليل الكمية"><i class="fas fa-minus"></i></button>
                                <input type="number" class="form-control" value="1" min="1" max="${p.stock ?? 99}" id="product-qty" aria-label="كمية المنتج" ${p.stock === 0 ? 'disabled' : ''}>
                                <button class="btn btn-outline-secondary btn-qty-plus" aria-label="زيادة الكمية"><i class="fas fa-plus"></i></button>
                            </div>
                            ${p.stock !== undefined && p.stock <= 5 && p.stock > 0 ? `<small class="text-danger d-block mt-2">متبقي ${p.stock} فقط!</small>` : ''}
                            ${p.stock === 0 ? `<small class="text-danger d-block mt-2 font-weight-bold">نفدت الكمية</small>` : ''}
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-lg btn-block mb-3" id="add-to-cart-detail-btn" data-id="${p._id}" ${p.stock === 0 ? 'disabled' : ''}><i class="fas fa-shopping-cart mr-2"></i> ${p.stock === 0 ? 'نفدت الكمية' : 'أضف للسلة'}</button>
                            <button class="btn btn-outline-primary btn-lg btn-block" id="buy-now-btn" data-id="${p._id}" ${p.stock === 0 ? 'disabled' : ''}><i class="fas fa-bolt mr-2"></i> ${p.stock === 0 ? 'نفدت الكمية' : 'اشتر الآن'}</button>
                        </div>
                        <div class="trust-badges mt-4"><div class="row text-center"><div class="col-4"><i class="fas fa-shield-alt fa-2x text-success mb-2"></i><p class="small">دفع آمن</p></div><div class="col-4"><i class="fas fa-truck fa-2x text-success mb-2"></i><p class="small">توصيل سريع</p></div><div class="col-4"><i class="fas fa-undo fa-2x text-success mb-2"></i><p class="small">إرجاع مجاني</p></div></div></div>
                        <div class="social-share mt-4"><h6 class="mb-2">شارك:</h6><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="btn btn-sm btn-outline-primary mr-2" aria-label="شارك في فيسبوك"><i class="fab fa-facebook-f"></i></a><a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(p.name)}" target="_blank" class="btn btn-sm btn-outline-info mr-2" aria-label="شارك في تويتر"><i class="fab fa-twitter"></i></a><a href="https://wa.me/?text=${encodeURIComponent(p.name + ' - ' + window.location.href)}" target="_blank" class="btn btn-sm btn-outline-success" aria-label="شارك عبر واتساب"><i class="fab fa-whatsapp"></i></a></div>
                    </div>
                </div>`;

            cont.style.display = 'flex'; // إظهار المحتوى

            // ربط الأحداث بعد عرض المحتوى
            ProductDetailsPage.setupQuantityControls(); // إعداد أزرار الكمية
            document.getElementById('add-to-cart-detail-btn')?.addEventListener('click', ProductDetailsPage.handleAddToCart);
            document.getElementById('buy-now-btn')?.addEventListener('click', ProductDetailsPage.handleBuyNow);

            // جلب وعرض المراجعات + إعداد النموذج + المنتجات ذات الصلة
            ProductDetailsPage.fetchAndRenderReviews(p._id);
            ProductDetailsPage.setupReviewForm(p._id);
            ProductDetailsPage.loadRelatedProducts(p.category, p._id);

        } catch (e) {
            console.error("Render product details error:", e); load.style.display = 'none'; cont.style.display = 'block';
            cont.innerHTML = `<div class="col-12 text-center py-5"><i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i><h4 class="text-danger">فشل تحميل المنتج</h4><p class="text-muted">${e.message === 'المنتج غير موجود.' ? 'المنتج غير متوفر.' : 'خطأ بالاتصال.'}</p><a href="index.html" class="btn btn-primary mt-3">العودة للمتجر</a></div>`;
            Toast.show(`❌ ${e.message || 'فشل تحميل المنتج'}`, 'danger', 7000);
        }
    },
    fetchAndRenderReviews: async (pId) => {
        const revCont = document.getElementById('reviews-container'); if (!revCont) return; revCont.innerHTML = '<p class="text-muted text-center">تحميل التقييمات...</p>';
        try { const res = await fetch(`${CONFIG.REVIEWS_API_URL}/${pId}`); if (!res.ok) throw new Error('فشل جلب التقييمات'); const data = await res.json(); if (data.success && Array.isArray(data.reviews)) ProductDetailsPage.renderReviews(data.reviews); else throw new Error(data.message || 'Error fetching reviews.'); } catch (e) { console.error('Fetch reviews error:', e); ProductDetailsPage.renderReviews([]); /* لا تظهر Toast هنا */ }
    },
    renderReviews: (revs) => {
        const cont = document.getElementById('reviews-container'); const countSp = document.getElementById('reviews-count'); if (!cont || !countSp) return; countSp.textContent = revs.length;
        if (revs.length === 0) { cont.innerHTML = '<p class="text-muted text-center">لا توجد تقييمات لهذا المنتج بعد.</p>'; return; }
        // استخدام Intl.DateTimeFormat لتنسيق أكثر دقة
        const dateFormatter = new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
        const html = revs.map(r => { const stars = Utils.generateStars(r.rating); const date = r.createdAt ? dateFormatter.format(new Date(r.createdAt)) : (r.date ? Utils.formatDate(r.date) : ''); return `<div class="review-card"><div class="review-header"><div class="reviewer-info"><i class="fas fa-user-circle reviewer-icon"></i><span class="reviewer-name">${r.name}</span></div><span class="review-date">${date}</span></div><div class="review-stars">${stars}</div><p class="review-text">${r.comment}</p></div>`; }).join(''); cont.innerHTML = html;
    },

    setupReviewForm: (pId) => {
        const form = document.getElementById('review-form'); if (!form) return;
        // استخدام cloneNode لإزالة المستمعين القدامى وتجنب الإرسال المتكرر
        const newForm = form.cloneNode(true);
        // استبدال النموذج القديم بالجديد في DOM
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const btn = newForm.querySelector('button[type="submit"]'); const rateEl = newForm.querySelector('input[name="rating"]:checked'); const rate = rateEl?.value;
            // التحقق من الصحة قبل الإرسال
            let isValid = true;
            newForm.querySelectorAll('[required]').forEach(el => { if (!el.checkValidity()) isValid = false; });
            if (!rate) isValid = false; // التأكد من اختيار تقييم

            if (!isValid) { newForm.classList.add('was-validated'); Toast.show('يرجى ملء الحقول وتقييم المنتج.', 'warning'); return; }
            newForm.classList.remove('was-validated'); // إزالة علامات التحقق إذا كان صحيحاً

            const name = newForm.elements['reviewer-name'].value; const comment = newForm.elements['review-comment'].value;
            if (!btn) return; // تأكد من وجود الزر
            const originalBtnHTML = btn.innerHTML; // حفظ النص الأصلي
            btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; const data = { productId: pId, name, comment, rating: parseInt(rate) };
            try { const res = await fetch(CONFIG.REVIEWS_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                  const result = await res.json();
                  if (res.ok && result.success) {
                      Toast.show('✅ ' + result.message, 'success');
                      newForm.reset(); // إعادة تعيين النموذج
                      ProductDetailsPage.fetchAndRenderReviews(pId); // تحديث قائمة المراجعات
                      // تحديث عدد التقييمات المعروض بجانب النجوم
                      const rt = document.querySelector('.product-rating .rating-text');
                      if (rt) {
                          const c = parseInt(rt.textContent.match(/\d+/)?.[0] || '0');
                          rt.textContent = `(${c + 1} تقييم)`;
                          // يمكن أيضاً محاولة تحديث متوسط النجوم إذا أردت (يتطلب إعادة حساب)
                      }
                  } else { throw new Error(result.message || 'خطأ غير معروف'); }
            } catch (err) { Toast.show(`❌ فشل الإرسال: ${err.message}`, 'danger');
            } finally { btn.disabled = false; btn.innerHTML = originalBtnHTML; } // إعادة الزر لنصه الأصلي
        });
    },
    changeQuantity: (c) => {
        const i = document.getElementById('product-qty'); if (!i || i.disabled) return;
        let v = parseInt(i.value) || 1; v += c; const max = parseInt(i.max) || 99; const min = parseInt(i.min) || 1;
        if (v < min) v = min; if (v > max) v = max; i.value = v;
    },
    setupQuantityControls: () => {
        const qtyInput = document.getElementById('product-qty'); const plusBtn = document.querySelector('.btn-qty-plus'); const minusBtn = document.querySelector('.btn-qty-minus'); if (!qtyInput || !plusBtn || !minusBtn) return;
        // استخدام cloneNode لإزالة المستمعين القدامى
        const newQtyInput = qtyInput.cloneNode(true); qtyInput.parentNode.replaceChild(newQtyInput, qtyInput);
        const newPlusBtn = plusBtn.cloneNode(true); plusBtn.parentNode.replaceChild(newPlusBtn, plusBtn);
        const newMinusBtn = minusBtn.cloneNode(true); minusBtn.parentNode.replaceChild(newMinusBtn, minusBtn);

        newQtyInput.addEventListener('change', () => ProductDetailsPage.changeQuantity(0)); // للتحقق عند التغيير اليدوي
        newPlusBtn.addEventListener('click', () => ProductDetailsPage.changeQuantity(1));
        newMinusBtn.addEventListener('click', () => ProductDetailsPage.changeQuantity(-1));
    },
    handleAddToCart: (e) => {
        const pId = e.currentTarget.dataset.id; const qtyIn = document.getElementById('product-qty'); const qty = parseInt(qtyIn?.value || 1); const p = ProductDetailsPage.currentProduct;
        if (p?._id === pId && qty > 0) { Cart.add({ _id: p._id, name: p.name, price: p.price, image: p.image, quantity: qty }); Toast.show(`✅ تمت إضافة ${p.name} (x${qty})`); e.currentTarget.innerHTML = '<i class="fas fa-check"></i> تم'; e.currentTarget.disabled = true; 
            // [تم التصحيح] إزالة الشرط الخاطئ "&& !btn.disabled"
            setTimeout(() => { 
                const btn = document.getElementById('add-to-cart-detail-btn'); 
                if(btn) { 
                    btn.innerHTML = '<i class="fas fa-shopping-cart mr-2"></i> أضف للسلة'; 
                    btn.disabled = false;
                } 
            }, 1500); 
        }
        else { Toast.show('❌ خطأ إضافة للسلة.', 'danger'); console.error("Add to cart failed. Product ID or Qty mismatch/invalid.", {pId, qty, currentP: p}); }
    },
    handleBuyNow: (e) => {
        const pId = e.currentTarget.dataset.id; const qtyIn = document.getElementById('product-qty'); const qty = parseInt(qtyIn?.value || 1); const p = ProductDetailsPage.currentProduct;
        if (p?._id === pId && qty > 0) { Cart.add({ _id: p._id, name: p.name, price: p.price, image: p.image, quantity: qty }); Toast.show(`جاري التوجيه للدفع...`, 'info'); setTimeout(() => { window.location.href = 'checkout.html'; }, 300); }
        else { Toast.show('❌ خطأ شراء.', 'danger'); console.error("Buy now failed. Product ID or Qty mismatch/invalid.", {pId, qty, currentP: p}); }
    },
    loadRelatedProducts: async (cat, currId) => {
        const cont = document.getElementById('related-products'); const sect = document.getElementById('related-section'); if (!cont || !sect) return; sect.style.display = 'none'; cont.innerHTML = '<p class="text-muted text-center col-12">تحميل المنتجات ذات الصلة...</p>';
        try {
            // جلب المنتجات فقط إذا لم تكن محملة بالفعل
            if (allProducts.length === 0) {
                 console.log("Fetching all products for related section...");
                 const r = await fetch(CONFIG.PRODUCTS_API_URL); if (!r.ok) throw new Error('Failed fetch related'); allProducts = await r.json();
                 if (!Array.isArray(allProducts)) throw new Error("Invalid product data for related");
            }
            const rel = allProducts.filter(p => p.category === cat && p._id !== currId).sort(() => .5 - Math.random()).slice(0, 3);
            if (rel.length > 0) {
                sect.style.display = 'block'; cont.innerHTML = rel.map(p => { let imgP = p.image || '/images/default-product.jpg'; if (!imgP.startsWith('/') && !imgP.startsWith('http')) imgP = '/' + imgP; return `<div class="col-md-4 mb-4"><div class="product-card hover-lift"><a href="product-details.html?id=${p._id}" class="product-link"><div class="product-image-container"><img src="${imgP}" class="product-image" alt="${p.name}" onerror="this.onerror=null;this.src='/images/default-product.jpg';"></div><div class="product-body"><h5 class="product-title">${p.name}</h5><p class="product-description">${p.description?.substring(0, 50) || ''}...</p><div class="product-footer"><span class="product-price">${Utils.formatCurrency(p.price)}</span></div></div></a></div></div>`; }).join('');
            } else { cont.innerHTML = ''; sect.style.display = 'none'; console.log("No related products found for category:", cat); }
        } catch (e) { console.error('Error loading related products:', e); cont.innerHTML = '<p class="text-danger text-center col-12">فشل تحميل المنتجات ذات الصلة.</p>'; sect.style.display = 'block'; }
    }
};

// =================================================================
// 10. CART PAGE
// =================================================================
const CartPage = {
    init: () => {
        CartPage.render(); // يعرض العناصر الحالية من localStorage
        CartPage.setupGiftMessage();
        CartPage.setupCoupon();
        CartPage.setupClearCart();
        CartPage.loadRecommendedProducts(); // يجلب المنتجات إذا لزم الأمر
    },
    render: () => {
        const cart = Cart.get(); const cont = document.getElementById('cart-items-container'); const empty = document.getElementById('empty-cart-section'); const items = document.getElementById('cart-items-section');
        if (!cont || !empty || !items) { console.error("Cart page elements not found."); return; } // Check for elements

        if (cart.length === 0) {
            empty.style.display = 'block'; items.style.display = 'none';
            CartPage.updateTotals(Cart.calculateTotals()); // Update totals even if empty
            return;
        }
        empty.style.display = 'none'; items.style.display = 'block';

        // استخدام _id في data-id و onclick
        cont.innerHTML = cart.map(item => {
            let imgP = item.image || '/images/default-product.jpg'; if (!imgP.startsWith('/') && !imgP.startsWith('http')) imgP = '/' + imgP;
            // التحقق من وجود السعر والكمية
            const price = item.price ?? 0;
            const quantity = item.quantity ?? 0;
            const total = price * quantity;

            return `
            <div class="cart-item" data-id="${item._id}">
                <div class="cart-item-content">
                    <div class="cart-item-image">
                        <img src="${imgP}" alt="${item.name || 'منتج'}" onerror="this.onerror=null;this.src='/images/default-product.jpg';">
                    </div>
                    <div class="cart-item-details">
                        <h5 class="cart-item-name">${item.name || 'منتج غير معروف'}</h5>
                        <p class="cart-item-price-unit">سعر الوحدة: ${Utils.formatCurrency(price)}</p>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="btn btn-sm btn-outline-secondary" aria-label="تقليل الكمية" onclick="CartPage.updateQuantity('${item._id}', ${quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="form-control form-control-sm" value="${quantity}" min="1" max="99" aria-label="كمية ${item.name || ''}" onchange="CartPage.updateQuantity('${item._id}', this.value)">
                        <button class="btn btn-sm btn-outline-secondary" aria-label="زيادة الكمية" onclick="CartPage.updateQuantity('${item._id}', ${quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="cart-item-total">
                        <strong>${Utils.formatCurrency(total)}</strong>
                    </div>
                    <div class="cart-item-remove">
                        <button class="btn btn-sm btn-outline-danger" aria-label="حذف ${item.name || ''}" onclick="CartPage.removeItem('${item._id}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

        const coupCode = Storage.get(CONFIG.COUPON_KEY);
        CartPage.updateTotals(Cart.calculateTotals(coupCode));
    },
    updateQuantity: (pId, nQty) => {
        // التحقق الإضافي من nQty
        const qty = parseInt(nQty);
        if (isNaN(qty) || qty < 1) {
            CartPage.removeItem(pId); // الحذف إذا كانت القيمة غير صالحة أو أقل من 1
            return;
        }
        Cart.updateQuantity(pId, qty); // تحديث القيمة الصحيحة
        CartPage.render(); // إعادة العرض بالتغييرات
        // Toast.show('تم تحديث الكمية', 'info'); // يمكن إلغاء التعليق إذا أردت إظهار رسالة
    },
    removeItem: (pId) => {
        const item = Cart.get().find(i => i._id === pId); // البحث عن العنصر قبل الحذف للحصول على الاسم
        Cart.remove(pId); // الحذف من السلة
        CartPage.render(); // إعادة العرض
        Toast.show(`تم حذف ${item?.name || 'المنتج'}`, 'danger'); // إظهار رسالة الحذف
    },
    updateTotals: (totals) => {
        // [مُعدل] ليشمل الضريبة ورسالة الشحن المحدثة
        const els = {
            'cart-subtotal': Utils.formatCurrency(totals.subtotal),
            'cart-shipping': Utils.formatCurrency(totals.shippingCost),
            'cart-discount': Utils.formatCurrency(totals.discount),
            'cart-vat': Utils.formatCurrency(totals.vatAmount), // <-- الضريبة
            'cart-total': Utils.formatCurrency(totals.total)
        };
        Object.entries(els).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        });

        const discRow = document.getElementById('discount-row');
        if (discRow) discRow.style.display = totals.discount > 0 ? 'flex' : 'none';

        const vatRow = document.getElementById('vat-row'); // <-- ID لصف الضريبة
        if (vatRow) vatRow.style.display = totals.vatAmount > 0 ? 'flex' : 'none';

        const checkBtn = document.getElementById('checkout-btn');
        if (checkBtn) {
            checkBtn.classList.toggle('disabled', totals.subtotal === 0);
            checkBtn.href = totals.subtotal > 0 ? "checkout.html" : "#";
        }

        const shipMsg = document.getElementById('shipping-message');
        if (shipMsg) {
            if (totals.subtotal === 0) {
                 shipMsg.innerHTML = `<i class="fas fa-truck mr-2"></i> شحن مجاني للطلبات فوق ${Utils.formatCurrency(CONFIG.FREE_SHIPPING_THRESHOLD)}`;
            } else if (totals.shippingCost === 0 && totals.subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD) {
                shipMsg.innerHTML = '<i class="fas fa-check-circle text-success mr-2"></i> تهانينا! شحن مجاني.';
            } else if (totals.shippingCost > 0) {
                 const rem = CONFIG.FREE_SHIPPING_THRESHOLD - totals.subtotal;
                 shipMsg.innerHTML = `<i class="fas fa-truck mr-2"></i> أضف ${Utils.formatCurrency(rem)} للحصول على شحن مجاني.`;
            } else {
                 shipMsg.innerHTML = `<i class="fas fa-truck mr-2"></i> رسوم الشحن ${Utils.formatCurrency(totals.shippingCost)}.`;
            }
        }
    },
    setupGiftMessage: () => {
        const i = document.getElementById('gift-message'); const c = document.getElementById('char-count'); if (!i || !c) return; const saved = Storage.get(CONFIG.GIFT_MESSAGE_KEY) || ''; i.value = saved; c.textContent = saved.length;
        // استخدام debounce لتجنب الحفظ مع كل ضغطة مفتاح
        i.addEventListener('input', Utils.debounce(function () { Storage.set(CONFIG.GIFT_MESSAGE_KEY, this.value); c.textContent = this.value.length; }, 250));
    },
    setupCoupon: () => {
        const btn = document.getElementById('apply-coupon-btn'); const input = document.getElementById('coupon-input'); if (!btn || !input) return;
        // استخدام cloneNode لإزالة المستمعين القدامى
        const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn);
        const newInput = input.cloneNode(true); input.parentNode.replaceChild(newInput, input);

        const saved = Storage.get(CONFIG.COUPON_KEY); if (saved) { newInput.value = saved; CartPage.applyCoupon(saved, false); } // لا تظهر Toast عند التحميل
        newBtn.addEventListener('click', () => CartPage.applyCoupon(newInput.value));
        newInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); CartPage.applyCoupon(newInput.value); } });
    },
    applyCoupon: (code, showToast = true) => {
        const msgEl = document.getElementById('coupon-message'); const codeUpper = code.trim().toUpperCase(); const totals = Cart.calculateTotals(); // حساب الإجماليات بدون الكوبون الحالي
        if (!codeUpper) { Storage.remove(CONFIG.COUPON_KEY); CartPage.render(); if (msgEl) msgEl.innerHTML = ''; return; } // مسح الكوبون إذا كان فارغاً
        if (!COUPONS[codeUpper]) { Storage.remove(CONFIG.COUPON_KEY); CartPage.render(); if (msgEl) msgEl.innerHTML = '<small class="text-danger">كود غير صحيح</small>'; if (showToast) Toast.show('❌ كود خصم غير صحيح', 'danger'); return; }
        const coupon = COUPONS[codeUpper];
        if (totals.subtotal < coupon.minPurchase) { Storage.remove(CONFIG.COUPON_KEY); CartPage.render(); if (msgEl) msgEl.innerHTML = `<small class="text-warning">الحد الأدنى ${Utils.formatCurrency(coupon.minPurchase)}</small>`; if (showToast) Toast.show(`⚠️ الحد الأدنى ${Utils.formatCurrency(coupon.minPurchase)}`, 'warning'); return; }
        Storage.set(CONFIG.COUPON_KEY, codeUpper); CartPage.render(); if (msgEl) msgEl.innerHTML = `<small class="text-success"><i class="fas fa-check-circle mr-1"></i> ${coupon.description}</small>`; if (showToast) Toast.show(`✅ تم تطبيق الخصم: ${codeUpper}`, 'success');
    },
    setupClearCart: () => {
        const btn = document.getElementById('clear-cart-btn'); if (!btn) return;
        const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn); // إزالة المستمع القديم
        newBtn.addEventListener('click', () => { if (confirm('هل أنت متأكد من إفراغ السلة؟')) { Cart.clear(); Storage.remove(CONFIG.COUPON_KEY); Storage.remove(CONFIG.GIFT_MESSAGE_KEY); CartPage.render(); Toast.show('تم إفراغ السلة', 'info'); } });
    },
    loadRecommendedProducts: async () => {
        const cont = document.getElementById('recommended-products'); if (!cont) return; cont.innerHTML = '<p class="text-muted text-center col-12">جاري تحميل الاقتراحات...</p>';
        try {
            // جلب المنتجات فقط إذا لم تكن محملة
            if (allProducts.length === 0) {
                 console.log("Fetching products for recommendations...");
                 const r = await fetch(CONFIG.PRODUCTS_API_URL); if (!r.ok) throw new Error('Failed to fetch products'); allProducts = await r.json();
                 if (!Array.isArray(allProducts)) throw new Error("Invalid product data");
            }
            const cart = Cart.get(); const cartIds = cart.map(i => i._id);
            const recs = allProducts.filter(p => !cartIds.includes(p._id)).sort(() => .5 - Math.random()).slice(0, 3);
            if (recs.length > 0) {
                cont.innerHTML = recs.map(p => { let imgP = p.image || '/images/default-product.jpg'; if (!imgP.startsWith('/') && !imgP.startsWith('http')) imgP = '/' + imgP; return `<div class="col-md-4 mb-4"><div class="product-card hover-lift"><a href="product-details.html?id=${p._id}" class="product-link"><div class="product-image-container"><img src="${imgP}" class="product-image" alt="${p.name}" onerror="this.onerror=null;this.src='/images/default-product.jpg';"></div><div class="product-body"><h5 class="product-title">${p.name}</h5><div class="product-footer"><span class="product-price">${Utils.formatCurrency(p.price)}</span></div></div></a></div></div>`; }).join('');
            } else { cont.innerHTML = '<p class="text-muted text-center col-12">لا توجد اقتراحات إضافية.</p>'; }
        } catch(e) { console.error('Error loading recommended products:', e); cont.innerHTML = '<p class="text-danger text-center col-12">فشل تحميل المنتجات المقترحة.</p>'; }
    }
};

// =================================================================
// 11. CHECKOUT PAGE
// =================================================================
const CheckoutPage = {
    init: () => {
        // التحقق من وجود عناصر السلة قبل المتابعة
        const cart = Cart.get();
        if (cart.length === 0 && !window.location.pathname.includes('order-confirmation.html')) { // تجنب إعادة التوجيه من صفحة التأكيد
            console.log("Cart is empty, redirecting to cart page.");
            window.location.href = 'cart.html';
            return; // إيقاف التنفيذ إذا تم إعادة التوجيه
        }
        CheckoutPage.updateTotals();
        CheckoutPage.renderOrderPreview();
        CheckoutPage.setupForm();
        CheckoutPage.setupDeliveryDate();
    },
    updateTotals: () => {
        const coup = Storage.get(CONFIG.COUPON_KEY); const totals = Cart.calculateTotals(coup);
        // [مُعدل] ليشمل الضريبة
        const els = { 
            'checkout-subtotal': Utils.formatCurrency(totals.subtotal), 
            'checkout-shipping': Utils.formatCurrency(totals.shippingCost), 
            'checkout-discount': Utils.formatCurrency(totals.discount), 
            'checkout-vat': Utils.formatCurrency(totals.vatAmount), // <-- إضافة الضريبة
            'checkout-total': Utils.formatCurrency(totals.total) 
        };
        Object.entries(els).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
        
        const discRow = document.getElementById('checkout-discount-row'); 
        if (discRow) discRow.style.display = totals.discount > 0 ? 'flex' : 'none';
        
        const vatRow = document.getElementById('checkout-vat-row'); // <-- ID لصف الضريبة
        if (vatRow) vatRow.style.display = totals.vatAmount > 0 ? 'flex' : 'none';
    },
    renderOrderPreview: () => {
        const cart = Cart.get(); const cont = document.getElementById('order-items-preview'); if (!cont) return;
        cont.innerHTML = `<div class="order-preview">${cart.map(item => { let imgP = item.image || '/images/default-product.jpg'; if (!imgP.startsWith('/') && !imgP.startsWith('http')) imgP = '/' + imgP; const price = item.price ?? 0; const quantity = item.quantity ?? 0; const total = price * quantity; return `<div class="order-preview-item"><img src="${imgP}" alt="${item.name || ''}" onerror="this.onerror=null;this.src='/images/default-product.jpg';"><div class="order-preview-details"><h6>${item.name || ''}</h6><small>الكمية: ${quantity}</small></div><strong>${Utils.formatCurrency(total)}</strong></div>`; }).join('')}</div>`;
    },
    setupForm: () => {
        const form = document.getElementById('checkout-form'); if (!form) return;
        // استخدام cloneNode لإزالة المستمعين القدامى
        const newForm = form.cloneNode(true); form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', CheckoutPage.handleSubmit);
    },
    setupDeliveryDate: () => {
        const dInput = document.getElementById('delivery-date'); if (!dInput) return;
        const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        // تنسيق التاريخ لـ YYYY-MM-DD
        const offset = tomorrow.getTimezoneOffset();
        const localTomorrow = new Date(tomorrow.getTime() - (offset*60*1000));
        const minD = localTomorrow.toISOString().split('T')[0];
        dInput.min = minD;
        // تعيين القيمة الافتراضية فقط إذا لم يكن للمستخدم قيمة سابقة (نادراً ما يحدث هنا)
        if (!dInput.value || dInput.value < minD) {
            dInput.value = minD;
        }
    },
    handleSubmit: async (e) => {
        e.preventDefault(); const form = e.target; const emailIn = form.elements.email; const phoneIn = form.elements.phone; let isValid = true;
        // إزالة علامات الخطأ السابقة وتطبيق التحقق من الصحة
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        form.querySelectorAll('[required]').forEach(el => { if (!el.checkValidity()) { el.classList.add('is-invalid'); isValid = false; } });
        if (!Utils.validateEmail(emailIn.value)) { emailIn.classList.add('is-invalid'); isValid = false; }
        if (!Utils.validatePhone(phoneIn.value)) { phoneIn.classList.add('is-invalid'); isValid = false; }
        const terms = form.elements.terms; const termsLabel = terms?.closest('.form-check')?.querySelector('.form-check-label');
        if(terms && !terms.checked && terms.required) { terms.classList.add('is-invalid'); if(termsLabel) termsLabel.classList.add('text-danger'); isValid = false; }
        else if (termsLabel) { termsLabel.classList.remove('text-danger'); }

        if (!isValid) {
            form.classList.add('was-validated'); // Bootstrap needs this class *after* adding is-invalid
            Toast.show('يرجى ملء الحقول المطلوبة بشكل صحيح والموافقة على الشروط', 'warning');
            const firstInv = form.querySelector('.is-invalid, :invalid'); // البحث عن أول حقل خاطئ
            firstInv?.focus(); // نقل التركيز إليه
            firstInv?.scrollIntoView({ behavior: 'smooth', block: 'center' }); // التمرير إليه
            return;
        }
        form.classList.remove('was-validated'); // إزالة إذا كان صحيحاً

        const btn = document.getElementById('complete-order-btn'); if(!btn) return; const txt = btn.innerHTML; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> جارٍ الإتمام...'; btn.disabled = true;
        const cart = Cart.get(); const coup = Storage.get(CONFIG.COUPON_KEY); const totals = Cart.calculateTotals(coup); const gift = Storage.get(CONFIG.GIFT_MESSAGE_KEY) || '';
        // جمع البيانات مع التأكد من وجود العناصر
        const orderData = {
            customer: {
                name: form.elements.name?.value || '', phone: phoneIn?.value || '', email: emailIn?.value || '',
                address: form.elements.address?.value || '', city: form.elements.city?.value || '',
                postalCode: form.elements['postal-code']?.value, notes: form.elements.notes?.value
            },
            delivery: { date: form.elements['delivery-date']?.value || '', time: form.elements['delivery-time']?.value || '' },
            items: cart.map(i => ({ productId: i._id, name: i.name, quantity: i.quantity, price: i.price, total: (i.price||0) * (i.quantity||0), image: i.image })),
            // [تم التصحيح] تقريب جميع القيم المالية وإضافة الضريبة
            payment: { 
                method: form.elements.paymentMethod?.value || 'cod', 
                subtotal: parseFloat(totals.subtotal.toFixed(2)), 
                shipping: parseFloat(totals.shippingCost.toFixed(2)), 
                discount: parseFloat(totals.discount.toFixed(2)), 
                vat: parseFloat(totals.vatAmount.toFixed(2)), // <-- إضافة الضريبة
                total: parseFloat(totals.total.toFixed(2)) 
            },
            giftMessage: gift, couponCode: coup || null
        };
        // التحقق مرة أخرى من وجود بيانات أساسية قبل الإرسال
        if (!orderData.customer.name || !orderData.customer.phone || !orderData.customer.email || !orderData.customer.address || !orderData.customer.city || !orderData.delivery.date || !orderData.delivery.time || orderData.items.length === 0) {
             Toast.show('بيانات الطلب غير مكتملة.', 'danger'); btn.innerHTML = txt; btn.disabled = false; return;
        }

        try {
            const res = await fetch(CONFIG.ORDERS_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
            const result = await res.json();
             if (!res.ok) { throw new Error(result.message || `خطأ ${res.status}`); }
             if (!result.success || !result.orderId || !result.order) { throw new Error(result.message || 'رد غير صالح من الخادم.'); }
            const orderDate = result.order.createdAt ? Utils.formatDate(result.order.createdAt) : Utils.formatDate(new Date());
            Storage.set(CONFIG.ORDER_KEY, { id: result.orderId, date: orderDate, total: result.order.payment.total.toFixed(2), itemsCount: result.order.items.reduce((s, it) => s + (it.quantity || 0), 0) });
            Cart.clear(); Storage.remove(CONFIG.GIFT_MESSAGE_KEY); Storage.remove(CONFIG.COUPON_KEY);
            window.location.href = 'order-confirmation.html'; // الانتقال لصفحة التأكيد
        } catch (err) { console.error('Submit order error:', err); Toast.show(`فشل إتمام الطلب: ${err.message}`, 'danger', 7000); btn.innerHTML = txt; btn.disabled = false; }
    }
};

// =================================================================
// 12. ORDER CONFIRMATION PAGE (No specific JS needed for now)
// =================================================================
// The logic to display order details relies on localStorage and is
// embedded directly in the order-confirmation.html file for simplicity.

// =================================================================
// 13. GLOBAL FEATURES
// =================================================================
const GlobalFeatures = {
    /**
     * Initializes all global features like back-to-top button,
     * smooth scrolling, navbar hiding, and hiding the initial page loader.
     */
    init: () => {
        GlobalFeatures.setupBackToTop();
        GlobalFeatures.setupSmoothScroll();
        GlobalFeatures.setupNavbarScroll();
        GlobalFeatures.hidePageLoader(); // Hide loader after other initializations
    },

    /**
     * Sets up the "Back to Top" button, making it appear on scroll
     * and scroll the page to the top when clicked.
     * Creates the button if it doesn't exist in the HTML.
     */
    setupBackToTop: () => {
        let backToTopBtn = document.getElementById('back-to-top');
        // Create the button dynamically if it's missing
        if (!backToTopBtn) {
            console.warn("Back-to-top button not found in HTML, creating dynamically.");
            backToTopBtn = document.createElement('button');
            backToTopBtn.id = 'back-to-top';
            backToTopBtn.className = 'back-to-top'; // Ensure CSS class is applied
            backToTopBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
            backToTopBtn.setAttribute('aria-label', 'Back to top');
            document.body.appendChild(backToTopBtn);
        }

        // Debounced scroll listener for performance
        const handleScroll = Utils.debounce(() => {
             if(backToTopBtn) { // Check again if button exists
                 backToTopBtn.classList.toggle('show', window.pageYOffset > 300);
             }
        }, 100); // Check scroll position every 100ms

        window.addEventListener('scroll', handleScroll, { passive: true });

        // Click listener for scrolling to top
        if(backToTopBtn) {
            backToTopBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent potential form submission if button is inside a form
                Utils.scrollToTop();
            });
        }
    },

    /**
     * Adds smooth scrolling behavior to all anchor links starting with '#'.
     */
    setupSmoothScroll: () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                // Ensure it's a valid internal link and not just '#'
                if (href && href.length > 1 && href.startsWith('#')) {
                    try {
                         // Find the target element using the href
                         const targetElement = document.querySelector(href);
                         if (targetElement) {
                             e.preventDefault(); // Prevent default jump
                             // Scroll smoothly to the target
                             targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                         } else {
                              console.warn(`Smooth scroll target not found: ${href}`);
                         }
                    } catch (err) {
                        // Catch potential errors with invalid selectors
                        console.warn(`Smooth scroll selector invalid: ${href}`, err);
                    }
                } else if (href === '#') {
                    e.preventDefault(); // Prevent jump for '#' links
                }
            });
        });
    },

    /**
     * Hides the fixed navbar when scrolling down and shows it when scrolling up.
     */
    setupNavbarScroll: () => {
        let lastScrollY = window.pageYOffset;
        const navbar = document.querySelector('header.fixed-top'); // Target the header element
        const scrollThreshold = 100; // Pixels to scroll before hiding starts
        let isTicking = false; // Flag for requestAnimationFrame optimization

        if (!navbar) {
            console.warn("Fixed top header not found for navbar scroll effect.");
            return; // Exit if navbar element not found
        }

        const handleNavbarScroll = () => {
            const currentScrollY = window.pageYOffset;

            // Only act if scrolled past the threshold
            if (currentScrollY > scrollThreshold) {
                 // Scrolling down - Hide navbar
                 if (currentScrollY > lastScrollY) {
                     navbar.style.transform = 'translateY(-100%)';
                 }
                 // Scrolling up - Show navbar
                 else {
                     navbar.style.transform = 'translateY(0)';
                 }
            } else {
                 // Always show navbar if near the top
                 navbar.style.transform = 'translateY(0)';
            }
            // Update last scroll position, ensuring it's not negative
            lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
            isTicking = false; // Reset flag
        };

        window.addEventListener('scroll', () => {
             // Use requestAnimationFrame to optimize scroll event handling
             if (!isTicking) {
                 window.requestAnimationFrame(handleNavbarScroll);
                 isTicking = true;
             }
        }, { passive: true }); // Improve scroll performance
    },

    /**
     * Fades out and hides the initial page loader element.
     */
    hidePageLoader: () => {
        const loader = document.getElementById('page-loader');
        if (loader) {
            // Add a slight delay to ensure content starts rendering
            setTimeout(() => {
                loader.style.opacity = '0';
                // Listen for the fade-out transition to end before setting display: none
                loader.addEventListener('transitionend', () => {
                     // Check opacity again in case of multiple transitions
                     if (loader.style.opacity === '0') {
                        loader.style.display = 'none';
                     }
                }, { once: true }); // Listener fires only once
            }, 300); // Adjust delay if needed
        } else {
             console.warn("Page loader element ('page-loader') not found.");
        }
    }
};

// =================================================================
// 14. INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    // تشغيل الوظائف الأساسية أولاً مع try-catch لكل منها
    try {
        if (typeof Cart !== 'undefined') {
            Cart.updateCount();
        } else {
            console.error("Cart object is not defined!");
        }
    } catch(e) { console.error("Error updating cart count:", e); }

    try {
        if (typeof GlobalFeatures !== 'undefined' && typeof GlobalFeatures.init === 'function') {
            GlobalFeatures.init();
        } else {
            console.error("GlobalFeatures or GlobalFeatures.init is not defined! Attempting manual loader hide.");
            // حاول إخفاء محمل الصفحة يدوياً كحل احتياطي إذا فشل GlobalFeatures
            const loaderFallback = document.getElementById('page-loader');
            if(loaderFallback){ loaderFallback.style.opacity = '0'; loaderFallback.style.display = 'none'; }
        }
    } catch(e) {
        console.error("Error initializing GlobalFeatures:", e);
        // حاول إخفاء محمل الصفحة يدوياً كحل احتياطي
        const loaderFallbackOnError = document.getElementById('page-loader');
        if(loaderFallbackOnError){ loaderFallbackOnError.style.opacity = '0'; loaderFallbackOnError.style.display = 'none'; }
    }

    // تحديد الصفحة الحالية وتشغيل المعالج الخاص بها
    const path = window.location.pathname;
    // معالجة أفضل للصفحة الرئيسية (قد تكون / أو /index.html)
    let page = path.substring(path.lastIndexOf('/') + 1);
    if (page === '' || page === 'index.html') {
        page = 'index.html'; // توحيد اسم الصفحة الرئيسية
    }

    // تعريف المعالجات والتأكد من وجود الكائنات
    const handlers = {
        'index.html': typeof IndexPage !== 'undefined' ? IndexPage.init : null,
        'product-details.html': typeof ProductDetailsPage !== 'undefined' ? ProductDetailsPage.init : null,
        'cart.html': typeof CartPage !== 'undefined' ? CartPage.init : null,
        'checkout.html': typeof CheckoutPage !== 'undefined' ? CheckoutPage.init : null,
        'order-confirmation.html': null // No specific JS init needed currently
    };

    const handler = handlers[page];

    if (handler && typeof handler === 'function') {
        // استخدام Promise.resolve للتعامل مع الدوال العادية و async بشكل موحد
        Promise.resolve(handler()).catch(e => {
             console.error(`Initialization error on page ${page}:`, e);
             // عرض رسالة خطأ واضحة للمستخدم بدلاً من الصفحة البيضاء أو التوقف المفاجئ
             const body = document.querySelector('body');
             // عرض رسالة خطأ فقط إذا كانت الصفحة نفسها فشلت في التحميل الأساسي
             // تجنب استبدال المحتوى إذا كان الخطأ بسيطاً وتم تحميل جزء من الصفحة
             if (page === 'index.html' || page === 'product-details.html') { // التركيز على الصفحات الرئيسية
                 if(body && !document.querySelector('.product-card')) { // تحقق إذا لم يتم عرض أي منتجات
                     body.innerHTML = `<div class="container text-center py-5" style="margin-top: 60px;"><i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i><h4 class="text-danger">حدث خطأ أثناء تحميل الصفحة</h4><p class="text-muted">(${e.message})</p><button class="btn btn-primary mt-3" onclick="window.location.reload()">إعادة تحميل</button></div>`;
                 } else {
                     Toast.show('حدث خطأ أثناء تحميل بعض بيانات الصفحة.', 'danger');
                 }
             } else {
                Toast.show('حدث خطأ أثناء تحميل بيانات الصفحة.', 'danger'); // رسالة أبسط للصفحات الأخرى
             }
        });
    } else if(handlers[page] === undefined && page && !page.includes('.')) { // Avoid warning for potential file requests like favicon or map files
         console.warn(`No handler defined for page/route: ${page}`);
    }

    console.log('%c🌹 وردة السنديان (Frontend Loaded)', 'color: #e64d99; font-size: 16px; font-weight: bold;');
});

// =================================================================
// Expose necessary functions to global scope (if needed by inline HTML `onclick`)
// تحسين: يفضل استخدام addEventListener بدلاً من onclick لتجنب تلويث النطاق العام
// =================================================================
window.ProductDetailsPage = typeof ProductDetailsPage !== 'undefined' ? ProductDetailsPage : {};
window.CartPage = typeof CartPage !== 'undefined' ? CartPage : {};
window.IndexPage = typeof IndexPage !== 'undefined' ? IndexPage : {}; // For retry button


// =================================================================
// Helper Function Example (Can be placed within Utils or globally if needed elsewhere)
// =================================================================
/**
 * Simple utility to safely get nested properties.
 * Example: getSafe(myObject, 'prop1.prop2.prop3', 'default value')
 */
/*
function getSafe(obj, path, defaultValue = undefined) {
    if (!path) return defaultValue;
    const properties = path.split('.');
    let current = obj;
    for (let i = 0; i < properties.length; i++) {
        if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(current, properties[i])) {
            return defaultValue;
        }
        current = current[properties[i]];
    }
    return current !== undefined ? current : defaultValue;
}
*/

// =================================================================
// Event listener cleanup (Optional but good practice for SPAs or complex scenarios)
// =================================================================
/*
window.addEventListener('beforeunload', () => {
    // Example: remove specific listeners if needed to prevent memory leaks
    // const productListContainer = document.getElementById('product-list-container');
    // if (productListContainer) {
    //     productListContainer.removeEventListener('click', IndexPage._handleProductClick);
    // }
    console.log("Cleaning up event listeners before page unload.");
});
*/

// --- نهاية الكود الكامل ---