import dotenv from 'dotenv';
dotenv.config();

import helmet from 'helmet';
import express from 'express';
import puppeteer from 'puppeteer-core';
import { logError, logInfo } from './logger.mjs';
import 'express-async-errors';
import rateLimit from 'express-rate-limit';
import cors from 'cors';


const app = express();

app.use(helmet());
app.use(cors()); // إضافة CORS للسماح لجميع المواقع
app.use(express.json({ limit: process.env.BODY_SIZE_LIMIT || '10mb' })); // حجم الجسم الأقصى

// إعداد معدل التحديد: 500 طلب لكل IP في الساعة
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000, // 1 ساعة كقيمة افتراضية
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 500, // الحد الأقصى للطلبات كقيمة افتراضية
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after an hour.'
    },
    keyGenerator: (req) => req.socket.remoteAddress,
    standardHeaders: true, // إرسال العناوين القياسية لتحديد المعدل (RateLimit-* headers)
    legacyHeaders: false, // تعطيل العناوين القديمة لـ تحديد المعدل (X-RateLimit-* headers)
});

app.use(limiter);

// معالجة خطأ حجم المدخلات الكبير
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Payload too large. Please reduce the size of your input.',
        });
    }
    next(err); // تابع معالجة الأخطاء الأخرى
});

// نقطة نهاية لعرض طريقة الاستخدام
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to the Image Generation API!',
        usage: {
            endpoint: '/generate-image',
            method: 'POST',
            description: 'Generate an image from HTML template.',
            parameters: {
                htmlTemplate: 'HTML template as a string (required)',
                data: 'An object containing dynamic data to replace in the template (optional)',
            },
            exampleRequest: {
                htmlTemplate: '<h1>{{title}}</h1>',
                data: { title: 'Hello World' },
            },
            exampleResponse: {
                success: true,
                message: 'Image generated successfully',
                image: '<base64-image>',
            },
        },
    });
});

// API لتوليد صورة من HTML باستخدام puppeteer-core
app.post('/generate-image', async (req, res) => {
    const { htmlTemplate, data = {} } = req.body;

    // تحقق من صحة المدخلات
    if (!htmlTemplate) {
        return res.status(400).json({
            success: false,
            message: 'htmlTemplate is required',
        });
    }

    try {
        // توليد الصورة باستخدام الوظيفة نفسها
        const base64Data = await generateImageFromHtml({ htmlTemplate, data });

        res.status(200).json({
            success: true,
            message: 'Image generated successfully',
            image: base64Data,
        });
    } catch (error) {
        // معالجة الأخطاء المتوقعة
        logError('Error generating image:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while generating the image',
            error: error.message,
        });
    }
});

// جلسة المتصفح لتجنب فتح وإغلاق المتصفح في كل مرة
let browser;

// دالة لتهيئة المتصفح مرة واحدة فقط
async function initBrowser() {
    try {
        // تحقق مما إذا كان المتصفح شغالًا
        if (!browser || !(await browser.isConnected())) {
            // إذا لم يكن متصلًا، قم بتهيئة المتصفح من جديد
            browser = await puppeteer.launch({
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-cache',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--disable-extensions',
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
                headless: process.env.PUPPETEER_HEADLESS === 'false' ? false : "new",
                ignoreDefaultArgs: ['--enable-automation'],
            });
            logInfo("Browser initialized successfully.");
        }
    } catch (error) {
        logError("Error initializing the browser:", error);
        throw new Error('Failed to initialize the browser: ' + error.message);
    }
}

// دالة لإغلاق المتصفح عند إيقاف السيرفر أو حدوث خطأ
async function closeBrowser() {
    if (browser) {
        try {
            await browser.close();
            logInfo("Browser closed successfully.");
        } catch (error) {
            logError("Error closing the browser:", error);
        } finally {
            browser = null; // إعادة تعيين المتصفح إلى null بعد الإغلاق
        }
    }
}

// وظيفة توليد الصورة من HTML باستخدام puppeteer-core
async function generateImageFromHtml({ htmlTemplate, data = {}, retryCount = 3 }) {
    let page;
    for (let attempt = 0; attempt < retryCount; attempt++) {
        try {
            await initBrowser(); // تأكد من أن المتصفح مفتوح

            // فتح صفحة جديدة
            page = await browser.newPage();

            // تعطيل الكاش للحصول على الأداء الأمثل
            await page.setCacheEnabled(false);

            // تفعيل اعتراض الطلبات
            await page.setRequestInterception(true);

            // التعامل مع الطلبات لاعتراض وإلغاء إعادة التوجيه
            page.on('request', (request) => {
                if (['redirect'].includes(request.redirectChain().length)) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            // دمج البيانات في القالب
            const html = Object.keys(data).reduce(
                (acc, key) => acc.replace(new RegExp(`{{${key}}}`, 'g'), data[key]),
                htmlTemplate
            );
            
            // Set Viewport for better output image
            await page.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 2  // This makes it 2x sharper
            });

            // ضبط محتوى الصفحة
            await page.setContent(html, { waitUntil: 'networkidle0' });
            await new Promise(r => setTimeout(r, 2000)); // تأخير لإعطاء الوقت لتحميل المحتوى

            // توليد الصورة
            const screenshotOptions = {
                type: process.env.IMAGE_TYPE === "png" ? 'png' : "jpeg",
                encoding: 'base64',
                fullPage: true
            };

            // Add quality only for JPEG
            if (process.env.IMAGE_TYPE !== "png" && process.env.IMAGE_QUALITY) {
            screenshotOptions.quality = parseInt(process.env.IMAGE_QUALITY, 10);
            }

            const base64Data = await page.screenshot(screenshotOptions);
            return base64Data;

        } catch (error) {
            logError(`Attempt ${attempt + 1} failed:`, error);
            if (attempt === retryCount - 1) {
                throw new Error('Error generating image: ' + error.message);
            }
            await closeBrowser(); // تأكد من إغلاق المتصفح في حالة الفشل
            await new Promise(r => setTimeout(r, 2000)); // انتظر قبل المحاولة مرة أخرى
        } finally {
            if (page) {
                await page.close(); // تأكد من إغلاق الصفحة بعد الاستخدام
            }
        }
    }
}

// استخدام middleware لمعالجة الأخطاء العامة
function errorHandler(err, req, res, next) {
    logError('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
}

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logInfo(`Server is running on port ${PORT}`);
});


// إضافة أحداث النظام لضمان إغلاق المتصفح عند إيقاف السيرفر
process.on('exit', closeBrowser);  // عند إنهاء العملية
process.on('SIGINT', closeBrowser); // عند استلام إشارة إيقاف (Ctrl + C)
process.on('SIGTERM', closeBrowser); // عند استلام إشارة إنهاء من النظام
process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception:', error);
    await closeBrowser(); // إغلاق المتصفح عند حدوث خطأ غير متوقع
    process.exit(1); // إنهاء العملية بعد إغلاق المتصفح
});