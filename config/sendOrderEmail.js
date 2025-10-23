const nodemailer = require('nodemailer');

// 1. إعداد الناقل (Transporter)
// يستخدم المتغيرات مباشرة من ملف .env الخاص بك
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.SMTP_USER, // ahmedalaanm552@gmail.com 
        pass: process.env.SMTP_PASS, // كلمة مرور التطبيقات من جوجل 
    },
});

// 2. دالة تنسيق العملة
const formatCurrency = (amount) => {
    return `ر.س ${parseFloat(amount).toFixed(2)}`;
};

// 3. القالب الرئيسي للإيميل (HTML)
const createEmailTemplate = (order) => {
    
    // [تطوير] يقرأ رابط الموقع من .env أو يستخدم رابط افتراضي للتطوير
    // بما أن ملف .env  لا يحتوي على FRONTEND_URL، سيستخدم الرابط الافتراضي
    const BASE_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5500'; 
    
    // [تطوير] يقرأ ايميل التواصل من .env 
    const CONTACT_INFO = process.env.STORE_EMAIL; // ahmedalaanm552@gmail.com 

    // إنشاء قائمة المنتجات كـ HTML
    const itemsHtml = order.items.map(item => {
        // التأكد من أن الصور لها رابط كامل
        const imageUrl = item.image 
            ? (item.image.startsWith('http') ? item.image : `${BASE_URL}/${item.image}`)
            : `${BASE_URL}/images/default-product.jpg`; // صورة افتراضية

        return `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 15px; vertical-align: top;">
                <img src="${imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover; margin-left: 10px;">
            </td>
            <td style="padding: 15px; vertical-align: top;">
                <strong style="font-size: 16px; color: #333;">${item.name}</strong>
                <br>
                <span style="font-size: 14px; color: #777;">الكمية: ${item.quantity}</span>
            </td>
            <td style="padding: 15px; vertical-align: top; text-align: left; font-weight: bold; color: #333;">
                ${formatCurrency(item.total)}
            </td>
        </tr>
    `;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تأكيد طلبك</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            body {
                font-family: 'Cairo', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f4f6f9;
            }
            .container {
                width: 90%;
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 12px;
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #ffffff;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
            }
            .body-content {
                padding: 35px;
                line-height: 1.7;
                color: #555;
            }
            .body-content h2 {
                color: #333;
                font-size: 22px;
            }
            .order-details {
                width: 100%;
                border-collapse: collapse;
                margin: 25px 0;
            }
            .order-details th, .order-details td {
                padding: 12px;
                text-align: right;
            }
            .total-row {
                font-size: 18px;
                font-weight: bold;
                color: #333;
            }
            .total-row td {
                padding-top: 15px;
                border-top: 2px solid #ddd;
            }
            .footer {
                padding: 30px;
                text-align: center;
                background-color: #f9f9f9;
                border-top: 1px solid #e0e0e0;
                color: #888;
                font-size: 13px;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #e64d99 0%, #d81b60 100%);
                color: #ffffff;
                padding: 12px 25px;
                border-radius: 50px;
                text-decoration: none;
                font-weight: bold;
                font-size: 16px;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌹 وردة السنديان</h1>
                <p style="font-size: 18px; margin: 10px 0 0;">شكراً لطلبك!</p>
            </div>
            <div class="body-content">
                <h2>مرحباً ${order.customer.name || 'عميلنا العزيز'}،</h2>
                <p>لقد استلمنا طلبك رقم <strong>#${order.orderId}</strong> بنجاح. فريقنا بدأ بتجهيزه الآن وسنقوم بإعلامك فور شحنه.</p>
                
                <h3 style="color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px;">ملخص الطلب</h3>
                
                <table class="order-details" style="width: 100%; border-collapse: collapse; margin: 25px 0;">
                    <thead>
                        <tr>
                            <th colspan="2" style="text-align: right; padding: 12px; border-bottom: 2px solid #ddd;">المنتج</th>
                            <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd;">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <table style="width: 100%; margin-top: 20px; border-top: 2px solid #eee; padding-top: 15px;">
                    <tbody>
                        <tr>
                            <td style="padding: 5px; color: #555;">المجموع الفرعي:</td>
                            <td style="padding: 5px; text-align: left; font-weight: bold; color: #333;">${formatCurrency(order.payment.subtotal)}</td>
                        </tr>
                        ${order.payment.discount > 0 ? `
                        <tr>
                            <td style="padding: 5px; color: #28a745;">الخصم (${order.couponCode || ''}):</td>
                            <td style="padding: 5px; text-align: left; font-weight: bold; color: #28a745;">- ${formatCurrency(order.payment.discount)}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td style="padding: 5px; color: #555;">الشحن:</td>
                            <td style="padding: 5px; text-align: left; font-weight: bold; color: #333;">${order.payment.shipping > 0 ? formatCurrency(order.payment.shipping) : 'مجاني'}</td>
                        </tr>
                        <tr class="total-row" style="font-size: 18px; font-weight: bold; color: #333;">
                            <td style="padding: 15px 5px 5px; border-top: 2px solid #ddd;">الإجمالي الكلي:</td>
                            <td style="padding: 15px 5px 5px; text-align: left; border-top: 2px solid #ddd; color: #764ba2;">${formatCurrency(order.payment.total)}</td>
                        </tr>
                    </tbody>
                </table>
                
                <h3 style="color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px; margin-top: 30px;">تفاصيل التوصيل</h3>
                <p>
                    <strong>العنوان:</strong> ${order.customer.address}, ${order.customer.city}<br>
                    <strong>وقت التوصيل:</strong> ${order.delivery.date} (${order.delivery.time})
                </p>

                <div style="text-align: center;">
                    <a href="${BASE_URL}" class="button" style="display: inline-block; background: linear-gradient(135deg, #e64d99 0%, #d81b60 100%); color: #ffffff; padding: 12px 25px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 20px;">
                        متابعة التسوق
                    </a>
                </div>
            </div>
            <div class="footer">
                <p>&copy; 2025 وردة السنديان. جميع الحقوق محفوظة.</p>
                <p>إذا كان لديك أي استفسار، تواصل معنا عبر ${CONTACT_INFO}.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// 4. الدالة الرئيسية التي سنستدعيها
const sendOrderConfirmationEmail = async (order) => {
    try {
        const htmlContent = createEmailTemplate(order);

        await transporter.sendMail({
            from: `"وردة السنديان" <${process.env.SMTP_USER}>`, // 
            to: order.customer.email, // إيميل العميل
            bcc: process.env.STORE_EMAIL, // إرسال نسخة مخفية للمتجر 
            subject: `✅ تم تأكيد طلبك رقم #${order.orderId} - وردة السنديان`,
            html: htmlContent,
        });

        console.log(`Email sent successfully for order: ${order.orderId}`);
    } catch (error) {
        console.error(`Error sending email for order ${order.orderId}:`, error);
    }
};

module.exports = { sendOrderConfirmationEmail };