// admin.js - نسخة مطورة واحترافية (أكثر أماناً وهيكلية)

// =================================================================
// 1. CONFIGURATION
// =================================================================
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api',
    get PRODUCTS_API_URL() { return `${this.API_BASE_URL}/products`; },
    get ORDERS_API_URL() { return `${this.API_BASE_URL}/orders`; },
    get ADMIN_LOGIN_URL() { return `${this.API_BASE_URL}/admin/login`; },
    get ADMIN_STATS_URL() { return `${this.API_BASE_URL}/admin/stats`; } // Endpoint جديد مقترح للإحصائيات
};
const TOKEN_KEY = 'admin-auth-token';

// =================================================================
// 2. UTILITIES (Helpers, Security, Auth)
// =================================================================
const Utils = {
    saveToken: (token) => localStorage.setItem(TOKEN_KEY, token),
    getToken: () => localStorage.getItem(TOKEN_KEY),
    removeToken: () => localStorage.removeItem(TOKEN_KEY),

    /**
     * [هام للأمان] دالة لتنقية النص قبل عرضه كـ HTML لمنع هجمات XSS.
     */
    escapeHTML: (str) => {
        if (str === null || str === undefined) return '';
        return String(str)
             .replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#039;');
    },

    formatCurrencySafe: (value) => {
        const num = parseFloat(value);
        const fixedVal = isNaN(num) ? (0).toFixed(2) : num.toFixed(2);
        return `ر.س ${fixedVal}`;
    },

    getAuthHeaders: () => {
        const token = Utils.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};

const Api = {
    /**
     * [تطوير أمني] دالة fetch مطورة تتعامل مع أخطاء المصادقة (401/403) تلقائياً.
     */
    fetchWithAuth: async (url, options = {}) => {
        const headers = { ...Utils.getAuthHeaders(), ...options.headers };

        // تحديد Content-Type فقط إذا كان الجسم JSON
        if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, { ...options, headers });

        // [تطوير أمني] إذا انتهت الجلسة أو التوكن غير صالح
        if (response.status === 401 || response.status === 403) {
            Toast.show('❌ انتهت الجلسة. يرجى تسجيل الدخول مجدداً.', 'danger', 5000);
            Utils.removeToken();
            // انتظر قليلاً قبل إعادة التوجيه ليرى المستخدم الرسالة
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 2000);
            // إيقاف تنفيذ الكود التالي
            return Promise.reject(new Error('Unauthorized'));
        }

        return response;
    }
};

// =================================================================
// 3. UI NOTIFICATIONS (Toast)
// =================================================================
const Toast = {
    container: null,
    init: () => { if (!Toast.container) { Toast.container = document.createElement('div'); Toast.container.className = 'toast-container'; Toast.container.style.cssText = 'position: fixed; top: 20px; left: 20px; z-index: 1051; max-width: 350px;'; document.body.appendChild(Toast.container); } },
    show: (message, type = 'success', duration = 3000) => {
        Toast.init(); const t = document.createElement('div'); t.className = `alert alert-${type === 'danger' ? 'danger' : (type === 'warning' ? 'warning' : (type === 'info' ? 'info' : 'success'))} alert-dismissible fade show`; t.setAttribute('role', 'alert'); t.style.cssText = 'margin-bottom: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease; transform: translateX(-100%);'; const icons = { success: 'fa-check-circle', danger: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' }; t.innerHTML = `<i class="fas ${icons[type] || icons.info} mr-2"></i><span>${Utils.escapeHTML(message)}</span><button type="button" class="close" data-dismiss="alert" aria-label="Close" style="padding: 0.75rem 1rem; right: -0.5rem; top: -0.3rem;"><span aria-hidden="true">&times;</span></button>`; Toast.container.appendChild(t); requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(0)'; }); setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-100%)'; t.addEventListener('transitionend', () => t.remove(), { once: true }); setTimeout(() => t.remove(), 400); }, duration); }
};

// =================================================================
// 4. PAGE LOGIC: ADMIN LOGIN
// =================================================================
const AdminLogin = {
    init: () => {
        const $form = $('#login-form');
        if ($form.length) {
            $form.on('submit', AdminLogin.handleSubmit);
        }
    },
    handleSubmit: async (event) => {
        event.preventDefault();
        AdminLogin.hideError();

        const $form = $(event.target);
        const $submitButton = $form.find('button[type="submit"]');
        const $spinner = $submitButton.find('.spinner-border');

        const email = $('#email').val();
        const password = $('#password').val();

        $spinner.show();
        $submitButton.prop('disabled', true);

        try {
            const response = await fetch(CONFIG.ADMIN_LOGIN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const result = await response.json();
            if (response.ok && result.token) {
                Utils.saveToken(result.token);
                window.location.href = 'admin-dashboard.html';
            } else {
                throw new Error(result.message || `خطأ ${response.status}`);
            }
        } catch (error) {
            console.error('Login failed:', error);
            AdminLogin.showError(error.message || 'خطأ غير متوقع.');
        } finally {
            $spinner.hide();
            $submitButton.prop('disabled', false);
        }
    },
    showError: (message) => $('#error-message').text(message).show(),
    hideError: () => $('#error-message').hide()
};

// =================================================================
// 5. PAGE LOGIC: ADMIN DASHBOARD
// =================================================================
const AdminDashboard = {
    init: () => {
        AdminDashboard.loadStats();
    },
    loadStats: async () => {
        $('#dashboard-stats-loader').show();
        $('#dashboard-stats-cards').empty();
        try {
            const response = await Api.fetchWithAuth(CONFIG.ADMIN_STATS_URL);
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData.message || `خطأ ${response.status}`);
            }
            const stats = await response.json();
            AdminDashboard.renderStats(stats);
        } catch (error) {
            console.error('Failed to load stats:', error);
            // تجنب إضافة الرسالة إذا كانت بسبب Unauthorized (لأن Api.fetchWithAuth تعالجها)
            if (error.message !== 'Unauthorized') {
                 $('#dashboard-content').append(`<div class="alert alert-warning mt-3">فشل تحميل الإحصائيات: ${Utils.escapeHTML(error.message)}. تأكد من أن الواجهة الخلفية (Backend) تدعم هذا.</div>`);
            }
        } finally {
            $('#dashboard-stats-loader').hide();
        }
    },
    renderStats: (stats) => {
        const statsHtml = `
            <div class="col-md-4 mb-4">
                <div class="card text-white bg-primary shadow-lg">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="card-title mb-0">إجمالي المبيعات</h5>
                                <h3 class="font-weight-bold">${Utils.formatCurrencySafe(stats.totalRevenue)}</h3>
                            </div>
                            <i class="fas fa-dollar-sign fa-3x opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card text-white bg-success shadow-lg">
                    <div class="card-body">
                         <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="card-title mb-0">إجمالي الطلبات</h5>
                                <h3 class="font-weight-bold">${stats.totalOrders || 0}</h3>
                            </div>
                            <i class="fas fa-receipt fa-3x opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card text-white bg-info shadow-lg">
                    <div class="card-body">
                         <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="card-title mb-0">عدد المنتجات</h5>
                                <h3 class="font-weight-bold">${stats.totalProducts || 0}</h3>
                            </div>
                            <i class="fas fa-box-open fa-3x opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
        $('#dashboard-stats-cards').html(statsHtml);
    }
};

// =================================================================
// 6. PAGE LOGIC: ADMIN PRODUCTS
// =================================================================
const AdminProducts = {
    $modal: null,
    $form: null,

    init: () => {
        // تهيئة عناصر jQuery مرة واحدة
        AdminProducts.$modal = $('#productModal');
        AdminProducts.$form = $('#productForm');

        // تحميل المنتجات
        AdminProducts.loadProducts();

        // ربط الأحداث
        AdminProducts.$form.on('submit', AdminProducts.handleFormSubmit);
        AdminProducts.$modal.on('show.bs.modal', AdminProducts.handleModalOpen);

        // استخدام Event Delegation للجداول
        $('#product-table-container').on('click', '.edit-btn', AdminProducts.handleEditClick);
        $('#product-table-container').on('click', '.delete-btn', AdminProducts.handleDeleteClick);
    },

    loadProducts: async () => {
        $('#loading-indicator').show();
        $('#product-table-body').empty();
        $('#no-products-message').hide();

        try {
            // GET /api/products (لا يحتاج مصادقة حالياً، لكن الأفضل حمايته للمدير فقط)
            // بما أن الواجهة الأمامية تحتاجه، سنتركه عاماً مؤقتاً
            const response = await fetch(CONFIG.PRODUCTS_API_URL);
            if (!response.ok) throw new Error(`خطأ ${response.status}`);

            const products = await response.json();
            if (!Array.isArray(products)) throw new Error("تنسيق بيانات غير صحيح");

            if (products.length === 0) {
                $('#no-products-message').show();
            } else {
                AdminProducts.renderProductTable(products);
                // [تطوير UX] استخلاص التصنيفات لملء قائمة الاقتراحات
                const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
                AdminProducts.populateCategoryDatalist(categories);
            }
        } catch (error) {
            console.error('Failed load products:', error);
            $('#product-table-body').html(`<tr><td colspan="7" class="text-center text-danger">فشل تحميل: ${Utils.escapeHTML(error.message)}</td></tr>`);
            Toast.show(`❌ فشل تحميل المنتجات: ${error.message}`, 'danger');
        } finally {
            $('#loading-indicator').hide();
        }
    },

    renderProductTable: (products) => {
        const rows = products.map(p => {
            let imgP = p.image || 'images/default-product.jpg'; // مسار نسبي
            // لا نضيف / في البداية إذا كان المسار المخزن يبدأ بـ images/
            if (!imgP.startsWith('images/') && !imgP.startsWith('http')) {
                 imgP = 'images/' + imgP; // افتراض أنه في مجلد images
            }
            // إذا كان المسار يبدأ بـ /images/، نزيل الشرطة المائلة الأولى
             else if (imgP.startsWith('/images/')) {
                 imgP = imgP.substring(1); // يصبح images/filename.jpg
            }


            // [إصلاح أمني XSS]
            const name = Utils.escapeHTML(p.name);
            const category = Utils.escapeHTML(p.category || '-');
            const type = Utils.escapeHTML(p.type || '-');

            return `
                <tr>
                    <td><img src="../${imgP}" alt="${name}" onerror="this.onerror=null;this.src='../images/default-product.jpg';"></td>
                    <td>${name}</td>
                    <td>${Utils.formatCurrencySafe(p.price)}</td>
                    <td>${category}</td>
                    <td>${type}</td>
                    <td>${p.stock ?? 0}</td>
                    <td class="action-buttons">
                        <button class="btn btn-sm btn-info btn-action edit-btn" data-id="${p._id}" title="تعديل"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger btn-action delete-btn" data-id="${p._id}" title="حذف"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        $('#product-table-body').html(rows);
    },

    populateCategoryDatalist: (categories) => {
        const $datalist = $('#productCategoriesList');
        $datalist.empty();
        categories.forEach(cat => {
            $datalist.append(`<option value="${Utils.escapeHTML(cat)}">`);
        });
    },

    handleModalOpen: (event) => {
        AdminProducts.$form.trigger('reset');
        AdminProducts.$form.removeClass('was-validated');
        $('#modal-error-message').hide();
        $('#productId').val('');

        const button = $(event.relatedTarget);
        if (button.is('#addProductBtn')) {
            $('#productModalLabel').text('إضافة منتج جديد');
        }
        // حالة التعديل يتم التعامل معها في handleEditClick
    },

    handleEditClick: async (event) => {
        const productId = $(event.target).closest('.edit-btn').data('id');
        AdminProducts.$form.trigger('reset');
        AdminProducts.$form.removeClass('was-validated');
        $('#modal-error-message').hide();
        $('#productModalLabel').text('تعديل المنتج (جاري التحميل...)');

        // [تطوير UX] تعطيل الحقول وعرض سبينر صغير
        AdminProducts.$form.find('input, textarea, select').prop('disabled', true);
        const $saveBtn = $('#saveProductBtn');
        const $saveBtnSpinner = $saveBtn.find('.spinner-border');
        $saveBtn.prop('disabled', true);
        $saveBtnSpinner.show();

        AdminProducts.$modal.modal('show');

        try {
            // [هام] استخدم Api.fetchWithAuth لجلب المنتج للتعديل (يتطلب حماية المسار في الباك اند)
            const response = await Api.fetchWithAuth(`${CONFIG.PRODUCTS_API_URL}/${productId}`);
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData.message || `خطأ ${response.status}`);
            }

            const p = await response.json();
            if (p && p._id) {
                // ملء النموذج بالبيانات
                $('#productId').val(p._id);
                $('#productName').val(p.name || '');
                $('#productPrice').val(p.price || '');
                $('#productDescription').val(p.description || '');
                $('#productCategory').val(p.category || '');
                $('#productType').val(p.type || 'طبيعي');
                $('#productImage').val(p.image || ''); // المسار المخزن
                $('#productStock').val(p.stock ?? 0);
                $('#productDetailColors').val(p.details?.colors?.join(', ') || '');
                $('#productDetailCount').val(p.details?.count || '');
                $('#productDetailSize').val(p.details?.size || '');
                $('#productDetailFreshness').val(p.details?.freshness || '');
                $('#productDetailCare').val(p.details?.care || '');

                $('#productModalLabel').text('تعديل المنتج');
            } else {
                throw new Error("لم يتم العثور على بيانات المنتج.");
            }
        } catch (error) {
            console.error('Failed fetch product for editing:', error);
            // تجنب عرض الخطأ إذا كان بسبب Unauthorized
            if (error.message !== 'Unauthorized') {
                Toast.show(`❌ فشل جلب المنتج: ${error.message}`, 'danger');
                $('#modal-error-message').text(error.message).show();
            }
        } finally {
            // [تطوير UX] إعادة تفعيل الحقول وإخفاء السبينر
            AdminProducts.$form.find('input, textarea, select').prop('disabled', false);
            $saveBtn.prop('disabled', false);
            $saveBtnSpinner.hide();
        }
    },


    handleDeleteClick: async (event) => {
        const $button = $(event.target).closest('.delete-btn');
        const productId = $button.data('id');
        const productName = $button.closest('tr').find('td:nth-child(2)').text() || 'المنتج';

        if (confirm(`هل أنت متأكد من حذف المنتج "${productName}"؟`)) {
            $button.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>');

            try {
                const response = await Api.fetchWithAuth(`${CONFIG.PRODUCTS_API_URL}/${productId}`, { method: 'DELETE' });
                const result = await response.json();
                if (response.ok && result.message) {
                    Toast.show(`✅ ${result.message}`, 'success');
                    AdminProducts.loadProducts(); // أعد تحميل المنتجات
                } else {
                    throw new Error(result.message || `خطأ ${response.status}`);
                }
            } catch (error) {
                console.error('Failed delete product:', error);
                 if (error.message !== 'Unauthorized') {
                    Toast.show(`❌ فشل الحذف: ${error.message}`, 'danger');
                 }
                $button.prop('disabled', false).html('<i class="fas fa-trash-alt"></i>');
            }
        }
    },

    handleFormSubmit: async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!AdminProducts.$form[0].checkValidity()) {
            AdminProducts.$form.addClass('was-validated');
            return;
        }
        AdminProducts.$form.removeClass('was-validated');

        const $submitButton = $('#saveProductBtn');
        const $spinner = $submitButton.find('.spinner-border');
        const $errorDiv = $('#modal-error-message');

        $spinner.show();
        $submitButton.prop('disabled', true);
        $errorDiv.hide();

        const productId = $('#productId').val();
        const isEditing = !!productId;

        const productData = {
            name: $('#productName').val(),
            price: parseFloat($('#productPrice').val()),
            description: $('#productDescription').val(),
            category: $('#productCategory').val(),
            type: $('#productType').val(),
            image: $('#productImage').val() || undefined,
            stock: parseInt($('#productStock').val()) || 0,
            details: {
                colors: $('#productDetailColors').val().split(',').map(s => s.trim()).filter(Boolean),
                count: $('#productDetailCount').val() || undefined,
                size: $('#productDetailSize').val() || undefined,
                freshness: $('#productDetailFreshness').val() || undefined,
                care: $('#productDetailCare').val() || undefined,
            }
        };

        const url = isEditing ? `${CONFIG.PRODUCTS_API_URL}/${productId}` : CONFIG.PRODUCTS_API_URL;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await Api.fetchWithAuth(url, {
                method: method,
                body: JSON.stringify(productData)
            });
            const result = await response.json();

            if (response.ok) {
                Toast.show(`✅ تم ${isEditing ? 'تعديل' : 'إضافة'} المنتج!`, 'success');
                AdminProducts.$modal.modal('hide');
                AdminProducts.loadProducts();
            } else {
                 // التعامل مع أخطاء التحقق من الواجهة الخلفية (express-validator)
                 if (response.status === 400 && result.errors) {
                    const errorMessages = result.errors.map(e => `<li>${Utils.escapeHTML(Object.values(e)[0])}</li>`).join('');
                    $errorDiv.html(`<ul>${errorMessages}</ul>`).show();
                    throw new Error("بيانات غير صالحة.");
                }
                throw new Error(result.message || `خطأ ${response.status}`);
            }
        } catch (error) {
            console.error(`Failed ${method} product:`, error);
            if (error.message !== "بيانات غير صالحة." && error.message !== 'Unauthorized') {
                $errorDiv.text(`فشل الحفظ: ${error.message}`).show();
            }
        } finally {
            $spinner.hide();
            $submitButton.prop('disabled', false);
        }
    }
};

// =================================================================
// 7. PAGE LOGIC: ADMIN ORDERS
// =================================================================
const AdminOrders = {
    $modal: null,
    $modalBody: null,
    $modalLabel: null,
    $statusSelect: null,
    $updateStatusBtn: null,
    currentOrderId: null,

    init: () => {
        AdminOrders.$modal = $('#orderDetailsModal');
        AdminOrders.$modalBody = $('#orderDetailsModalBody');
        AdminOrders.$modalLabel = $('#orderDetailsModalLabel');
        AdminOrders.$statusSelect = $('#orderStatusSelect');
        AdminOrders.$updateStatusBtn = $('#updateStatusBtn');

        AdminOrders.loadOrders();

        // ربط الأحداث
        $('#orders-table-container').on('click', '.view-details-btn', AdminOrders.handleViewDetailsClick);
        AdminOrders.$updateStatusBtn.on('click', AdminOrders.handleUpdateStatus);
    },

    loadOrders: async () => {
        $('#loading-indicator-orders').show();
        $('#orders-table-body').empty();
        $('#no-orders-message').hide();

        try {
            const response = await Api.fetchWithAuth(CONFIG.ORDERS_API_URL); // محمي الآن
            if (!response.ok) {
                const eData = await response.json().catch(() => ({}));
                throw new Error(eData.message || `خطأ ${response.status}`);
            }
            const orders = await response.json();
            if (!Array.isArray(orders)) throw new Error("تنسيق بيانات الطلبات غير صحيح.");

            if (orders.length === 0) {
                $('#no-orders-message').show();
            } else {
                AdminOrders.renderOrdersTable(orders);
            }
        } catch (error) {
            console.error('Failed load orders:', error);
            if (error.message !== 'Unauthorized') {
                 $('#orders-table-body').html(`<tr><td colspan="6" class="text-center text-danger">فشل تحميل: ${Utils.escapeHTML(error.message)}</td></tr>`);
                 Toast.show(`❌ فشل تحميل الطلبات: ${error.message}`, 'danger');
            }
        } finally {
            $('#loading-indicator-orders').hide();
        }
    },

    renderOrdersTable: (orders) => {
        const dFmt = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
        const rows = orders.map(o => {
            const date = o.createdAt ? dFmt.format(new Date(o.createdAt)) : 'N/A';
            const name = Utils.escapeHTML(o.customer?.name || '-');
            const total = o.payment?.total ?? 0;
            const status = Utils.escapeHTML(o.status || 'Pending');
            const dbId = o._id;
            const orderNum = Utils.escapeHTML(o.orderId || dbId.slice(-6));

            return `
                <tr>
                    <td>#${orderNum}</td>
                    <td>${date}</td>
                    <td>${name}</td>
                    <td>${Utils.formatCurrencySafe(total)}</td>
                    <td><span class="badge badge-status badge-status-${status}">${status}</span></td>
                    <td class="action-buttons">
                        <button class="btn btn-sm btn-primary btn-action view-details-btn" data-id="${dbId}" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        $('#orders-table-body').html(rows);
    },

    handleViewDetailsClick: async (event) => {
        const orderId = $(event.target).closest('.view-details-btn').data('id');

        AdminOrders.$modalLabel.text(`تفاصيل الطلب (تحميل...)`);
        AdminOrders.$modalBody.html('<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>');
        AdminOrders.$updateStatusBtn.prop('disabled', true);
        AdminOrders.$modal.modal('show');

        try {
            const response = await Api.fetchWithAuth(`${CONFIG.ORDERS_API_URL}/${orderId}`); // محمي الآن
            if (!response.ok) {
                const eData = await response.json().catch(() => ({}));
                throw new Error(eData.message || `خطأ ${response.status}`);
            }
            const order = await response.json();
            if (!order?._id) throw new Error("Order data invalid");

            AdminOrders.$modalLabel.text(`تفاصيل الطلب #${Utils.escapeHTML(order.orderId || order._id.slice(-6))}`);
            AdminOrders.renderOrderDetailsModal(order);
            AdminOrders.$statusSelect.val(order.status || 'Pending');
            AdminOrders.$updateStatusBtn.prop('disabled', false);
            AdminOrders.currentOrderId = order._id;

        } catch (error) {
            console.error('Failed load order details:', error);
            if (error.message !== 'Unauthorized') {
                 AdminOrders.$modalBody.html(`<p class="text-danger tc mt-3">فشل تحميل: ${Utils.escapeHTML(error.message)}</p>`);
                 Toast.show(`❌ فشل تحميل التفاصيل: ${error.message}`, 'danger');
            }
        }
    },

    renderOrderDetailsModal: (order) => {
        const dFmt = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full', timeStyle: 'medium' });
        const crAt = order.createdAt ? dFmt.format(new Date(order.createdAt)) : 'N/A';
        const pMeth = order.payment?.method === 'cod' ? 'الدفع عند الاستلام' : 'غير محدد';

        const custName = Utils.escapeHTML(order.customer?.name || '-');
        const custPhone = Utils.escapeHTML(order.customer?.phone || '-');
        const custEmail = Utils.escapeHTML(order.customer?.email || '-');
        const custAddress = Utils.escapeHTML(order.customer?.address || '');
        const custCity = Utils.escapeHTML(order.customer?.city || '');
        const custPostal = Utils.escapeHTML(order.customer?.postalCode || '');
        const custNotes = Utils.escapeHTML(order.customer?.notes || 'لا توجد');
        const delDate = Utils.escapeHTML(order.delivery?.date || '-');
        const delTime = Utils.escapeHTML(order.delivery?.time || '-');
        const gift = order.giftMessage?.trim() ? Utils.escapeHTML(order.giftMessage).replace(/\n/g, '<br>') : 'لا توجد.';
        const coupon = Utils.escapeHTML(order.couponCode || '');

        const itemsHtml = (order.items || []).map(i => `
            <tr>
                <td>${Utils.escapeHTML(i.name || (i.productId?.name || 'منتج محذوف'))}</td>
                <td>${i.quantity || 0}</td>
                <td>${Utils.formatCurrencySafe(i.price || 0)}</td>
                <td>${Utils.formatCurrencySafe(i.total || 0)}</td>
            </tr>
        `).join('');

        const modalHtml = `
            <h5><i class="fas fa-user mr-2"></i> العميل</h5>
            <p><strong>الاسم:</strong> ${custName}</p>
            <p><strong>الهاتف:</strong> ${custPhone}</p>
            <p><strong>البريد:</strong> ${custEmail}</p>
            <p><strong>العنوان:</strong> ${custAddress}, ${custCity} ${custPostal}</p>
            <p><strong>ملاحظات:</strong> ${custNotes}</p>
            <hr>
            <h5><i class="fas fa-shipping-fast mr-2"></i> التوصيل</h5>
            <p><strong>التاريخ:</strong> ${delDate}</p>
            <p><strong>الوقت:</strong> ${delTime}</p>
            <hr>
            <h5><i class="fas fa-gift mr-2"></i> الإهداء</h5>
            <p>${gift}</p>
            <hr>
            <h5><i class="fas fa-boxes mr-2"></i> المنتجات</h5>
            <table class="table table-sm table-bordered">
                <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <hr>
            <h5><i class="fas fa-credit-card mr-2"></i> الدفع</h5>
            <p><strong>الطريقة:</strong> ${pMeth}</p>
            <p><strong>الفرعي:</strong> ${Utils.formatCurrencySafe(order.payment?.subtotal)}</p>
            ${order.payment?.discount > 0 ? `<p class="text-success"><strong>الخصم:</strong> - ${Utils.formatCurrencySafe(order.payment?.discount)} (${coupon})</p>` : ''}
            <p><strong>الشحن:</strong> ${order.payment?.shipping > 0 ? Utils.formatCurrencySafe(order.payment?.shipping) : 'مجاني'}</p>
            ${order.payment?.vat > 0 ? `<p><strong>الضريبة:</strong> ${Utils.formatCurrencySafe(order.payment?.vat)}</p>`: ''}
            <p><strong>الإجمالي:</strong> <strong class="text-primary">${Utils.formatCurrencySafe(order.payment?.total)}</strong></p>
            <hr>
            <p><small><strong>تاريخ الإنشاء:</strong> ${crAt}</small></p>
        `;
        AdminOrders.$modalBody.html(modalHtml);
    },

    handleUpdateStatus: async () => {
        if (!AdminOrders.currentOrderId) return;

        const newStatus = AdminOrders.$statusSelect.val();
        const $spinner = AdminOrders.$updateStatusBtn.find('.spinner-border');

        $spinner.show();
        AdminOrders.$updateStatusBtn.prop('disabled', true);

        try {
            const response = await Api.fetchWithAuth(`${CONFIG.ORDERS_API_URL}/${AdminOrders.currentOrderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `خطأ ${response.status}`);
            }
            Toast.show(`✅ تم تحديث الحالة إلى ${newStatus}`, 'success');
            AdminOrders.$modal.modal('hide');
            AdminOrders.loadOrders(); // أعد تحميل الطلبات
        } catch (error) {
            console.error('Failed update order status:', error);
            if (error.message !== 'Unauthorized') {
                 Toast.show(`❌ فشل التحديث: ${error.message}`, 'danger');
            }
        } finally {
            $spinner.hide();
            AdminOrders.$updateStatusBtn.prop('disabled', false); // أعد تفعيل الزر دائماً
            // لا تمسح currentOrderId هنا، قد يحتاج المستخدم لإعادة المحاولة
        }
    }
};

// =================================================================
// 8. GLOBAL ADMIN LOGIC
// =================================================================
const GlobalAdmin = {
    init: () => {
        $('#logout-button').on('click', GlobalAdmin.handleLogout);
    },
    handleLogout: () => {
        Utils.removeToken();
        Toast.show('تم تسجيل الخروج.', 'info');
        setTimeout(() => {
             window.location.href = 'admin-login.html';
        }, 1000);
    }
};

// =================================================================
// 9. INITIALIZATION (DOM Ready)
// =================================================================
$(document).ready(() => {
    const path = window.location.pathname;

    if (path.includes('admin-login.html')) {
        AdminLogin.init();
    } else {
        // التحقق من التوكن في كل الصفحات المحمية
        if (!Utils.getToken()) {
            console.log("No admin token found, redirecting to login.");
            window.location.href = 'admin-login.html';
            return; // توقف عن تنفيذ أي شيء آخر
        }

        // تشغيل الوظائف العامة (مثل تسجيل الخروج)
        GlobalAdmin.init();

        // تشغيل الكود الخاص بالصفحة الحالية
        if (path.includes('admin-dashboard.html')) {
            AdminDashboard.init();
        } else if (path.includes('admin-products.html')) {
            AdminProducts.init();
        } else if (path.includes('admin-orders.html')) {
            AdminOrders.init();
        }
    }

    console.log('%c🔧 لوحة التحكم جاهزة (نسخة مطورة)', 'color: #764ba2; font-size: 16px; font-weight: bold;');
});