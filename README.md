# metriX — Step 1

النسخة الأولى من منصة metriX مبنية بـ Next.js + TypeScript + Tailwind CSS.

## التشغيل محليًا

```bash
npm install
npm run dev
```

ثم افتح:
http://localhost:3000

## الرفع إلى GitHub

1. أنشئ Repository جديد باسم `metrix-platform`.
2. ارفع **محتويات** هذا المجلد إلى جذر الـRepository.
3. تأكد أن `package.json` موجود مباشرة في جذر الـRepository.

## النشر على Vercel

1. افتح Vercel.
2. اختر Add New → Project.
3. اختر Repository `metrix-platform`.
4. Vercel سيكتشف Next.js تلقائيًا.
5. اضغط Deploy.

## الخطوة التالية

ربط Login / Signup الحقيقي باستخدام Supabase Auth ثم إنشاء أول Dashboard محمي.
