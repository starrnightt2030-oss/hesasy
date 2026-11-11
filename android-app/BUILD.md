# بناء نسخة أندرويد

بيتعمل تلقائي على GitHub Actions (`.github/workflows/apk.yml`) مع أي تحديث في ملفات التطبيق:

1. `npm install` — Capacitor 7 والإضافات (الملفات، المشاركة، الإشعارات، البصمة، المتصفح، شريط الحالة).
2. `prepare.py web` — نسخ ملفات التطبيق لـ `www` ورقم الإصدار.
3. `npx cap add android` + `prepare.py android` — الأيقونات، الاسم، الصلاحيات، رقم الإصدار.
4. `gradlew assembleRelease` ثم التوقيع بالمفتاح اللي في GitHub Secrets.
5. نشر `hesasy.apk` في Releases.
