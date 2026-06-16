# دليل الانتقال إلى Firebase Firestore

## ما الذي تغيّر؟

| الملف | قبل | بعد |
|-------|-----|-----|
| `app/lib/db.ts` | MySQL pool (mysql2) | Firebase Admin SDK |
| `app/lib/db.js` | حُذف | — |
| كل API routes | `db.query("SELECT ...")` | Firestore queries |
| `.env.local` | DB_HOST, DB_USER... | FIREBASE_PROJECT_ID... |
| `docker-compose.yml` | Next.js + MySQL container | Next.js فقط |
| `*.sql` files | حُذفت | — |

## Collections في Firestore (بديل الجداول)

| MySQL Table | Firestore Collection |
|-------------|---------------------|
| `users` | `users` |
| `requests` | `requests` |
| `vacations` | `vacations` |

> **ملاحظة:** في Firestore كل document له ID تلقائي (string) بدل `AUTO_INCREMENT int`.
> الـ `id` الآن يصبح `doc.id` مثلاً: `"abc123xyz"` بدل `1, 2, 3`.

---

## خطوات الإعداد في Firebase Console

### 1. إنشاء مشروع Firebase
1. اذهب إلى [console.firebase.google.com](https://console.firebase.google.com)
2. اضغط **Add project** وأنشئ مشروع جديد

### 2. تفعيل Firestore
1. من القائمة الجانبية: **Firestore Database**
2. اضغط **Create database**
3. اختر **Start in test mode** (للتطوير)
4. اختر region قريبة (مثل `europe-west3`)

### 3. إنشاء Service Account (للـ Admin SDK)
1. اذهب إلى **Project Settings** (أيقونة الترس)
2. تبويب **Service accounts**
3. اضغط **Generate new private key**
4. سيتم تحميل ملف JSON — **احتفظ به بأمان ولا تشاركه**

### 4. ملء `.env.local`
افتح الملف JSON الذي حمّلته وأضف القيم:

```env
FIREBASE_PROJECT_ID=     # من حقل "project_id"
FIREBASE_CLIENT_EMAIL=   # من حقل "client_email"
FIREBASE_PRIVATE_KEY=    # من حقل "private_key" (بالكامل مع \n)
```

مثال:
```env
FIREBASE_PROJECT_ID=my-hr-app-12345
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc@my-hr-app-12345.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANB...\n-----END PRIVATE KEY-----\n"
```

> ⚠️ **مهم:** الـ `FIREBASE_PRIVATE_KEY` يجب أن يكون بين علامات `"..."` وكل줄 break تُكتب كـ `\n`

### 5. تثبيت الحزمة
```bash
npm install firebase-admin
npm uninstall mysql2  # اختياري
```

### 6. تشغيل المشروع
```bash
npm run dev
```

---

## Firestore Indexes المطلوبة

بعض الـ queries تحتاج composite index. Firebase سيعطيك رابطاً تلقائياً في الـ console error عند أول تشغيل.

الـ queries الموجودة في الكود تستخدم:
- `users` → query by `email` (single field، لا يحتاج index)
- `requests` → `orderBy("createdAt", "desc")` (لا يحتاج index)
- `vacations` → `orderBy("createdAt", "desc")` (لا يحتاج index)
- `users` → query by `resetToken` (single field، لا يحتاج index)

---

## نقل البيانات الموجودة (اختياري)

إذا عندك بيانات في MySQL وتريد نقلها:

```js
// migration-script.js (شغّله مرة واحدة)
const mysql = require("mysql2/promise");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const firestore = admin.firestore();

async function migrate() {
  const conn = await mysql.createConnection({ host:"localhost", user:"root", database:"ebana_stuffhub" });
  
  // Users
  const [users] = await conn.query("SELECT * FROM users");
  for (const user of users) {
    await firestore.collection("users").doc(String(user.id)).set({
      firstName: user.firstName,
      lastName: user.lastName || "",
      email: user.email,
      password: user.password,
      phone: user.phone || "",
      role: user.role,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
    });
  }
  console.log("✅ Users migrated:", users.length);

  // Requests
  const [requests] = await conn.query("SELECT * FROM requests");
  for (const r of requests) {
    await firestore.collection("requests").doc(String(r.id)).set({
      userId: String(r.userId) || null,
      name: r.name,
      email: r.email,
      type: r.type,
      message: r.message || "",
      status: r.status,
      createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
    });
  }
  console.log("✅ Requests migrated:", requests.length);

  // Vacations
  const [vacations] = await conn.query("SELECT * FROM vacations");
  for (const v of vacations) {
    await firestore.collection("vacations").doc(String(v.id)).set({
      userId: String(v.userId) || null,
      name: v.name,
      email: v.email,
      startDate: v.startDate,
      endDate: v.endDate,
      days: v.days,
      status: v.status,
      createdAt: v.createdAt?.toISOString() || new Date().toISOString(),
    });
  }
  console.log("✅ Vacations migrated:", vacations.length);

  await conn.end();
  console.log("🎉 Migration complete!");
}

migrate().catch(console.error);
```
