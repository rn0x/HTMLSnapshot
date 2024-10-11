# استخدم صورة رسمية لـ Node.js
FROM node:18-slim

# تثبيت التبعيات اللازمة لتشغيل Puppeteer داخل Docker
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvpx7 \
    libgbm1 \
    libpango-1.0-0 \
    libharfbuzz0b \
    libxshmfence1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# تحديد المتغير PUPPETEER_SKIP_CHROMIUM_DOWNLOAD لمنع تنزيل Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# تثبيت Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    sh -c 'echo "deb [arch=amd64] https://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' && \
    apt-get update && apt-get install -y google-chrome-stable

# إنشاء دليل العمل للتطبيق
WORKDIR /app

# نسخ package.json و package-lock.json لتثبيت التبعيات
COPY package*.json ./ 

# تثبيت التبعيات
RUN npm install --production

# نسخ الكود البرمجي إلى دليل العمل
COPY . .

# فتح المنفذ الذي يعمل عليه التطبيق
EXPOSE 3000

# تشغيل التطبيق
CMD ["npm", "start"]