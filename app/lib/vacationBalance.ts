// Shared vacation-balance logic.
//
// Policy:
//   - Every employee accrues 30 days per calendar year (Friday & Saturday
//     are not counted as vacation days when a request's day-count is
//     calculated, so the 30 days are all working days).
//   - Any days left unused at year-end carry over into the FIRST THREE
//     MONTHS ONLY of the following year (Jan 1 → Mar 31). Carried-over
//     days used within that window are charged against the carry pool,
//     never against the fresh annual 30. After March 31, whatever is left
//     of the carry pool simply expires — it is not added back or banked
//     further, and it never retroactively reduces the new year's annual
//     30 days.
//   - A request counts against the balance as soon as it is submitted
//     (status "pending"), not only once approved — this is what actually
//     stops an employee from booking more than the 30 (+ carry) days by
//     submitting several requests before any of them are approved. A
//     rejected request frees its days back up immediately.

// 🔢 كل موظف عنده 30 يوم إجازة بالسنة، هذا رقم ثابت ما يتغير
export const ANNUAL_VACATION_DAYS = 30;

// 🚫 هذي الحالات تعتبر "تحجز" من الرصيد — يعني الطلب المعلّق (pending) يحجز مثل الموافق عليه بالضبط
const RESERVING_STATUSES = new Set(["approved", "pending"]);

// 📄 شكل بيانات طلب الإجازة الواحد اللي جاي من قاعدة البيانات
export type VacationRecord = {
  startDate?: string | null; // تاريخ بداية الإجازة
  status?: string | null;    // حالة الطلب: pending / approved / rejected
  days?: number | null;      // عدد الأيام المطلوبة بهذا الطلب
};

// 📊 شكل النتيجة النهائية اللي ترجعها الدالة — ملخص رصيد السنة
export type YearBalance = {
  year: number;             // السنة الحالية
  annual: number;           // الرصيد السنوي الثابت (30)
  carriedIn: number;        // كم يوم انترحّل من السنة اللي فاتت (لو الشباك لسا مفتوح)
  carryWindowOpen: boolean; // هل احنا لسا داخل فترة الترحيل (يناير - مارس)؟
  carryExpired: boolean;    // هل انتهت صلاحية الرصيد المرحّل بدون ما يُستخدم بالكامل؟
  totalAvailable: number;   // إجمالي المتاح (30 + المرحّل)
  used: number;             // كم يوم استخدم فعليًا هالسنة
  remaining: number;        // كم باقي له فعليًا
};

// 🔍 دالة مساعدة: تفلتر الطلبات وتعطيك بس اللي تخص سنة معينة، وتكون فعليًا محسوبة (pending/approved) ولها تاريخ صحيح
function parsedRecords(records: VacationRecord[], year: number) {
  return records
    .filter((r) => RESERVING_STATUSES.has(r.status ?? "") && !!r.startDate) // خذ بس الطلبات المعلّقة أو الموافق عليها ولها تاريخ
    .map((r) => ({ date: new Date(r.startDate as string), days: r.days || 0 })) // حوّل التاريخ لكائن Date وخذ عدد الأيام
    .filter((r) => !isNaN(r.date.getTime()) && r.date.getFullYear() === year); // تأكد إن التاريخ صحيح وإنه فعلاً من نفس السنة المطلوبة
}

/**
 * Computes the current vacation balance for one employee, given every
 * vacation record (pending or approved) belonging to them.
 */
// 🧮 الدالة الرئيسية: تحسب رصيد الإجازة الحالي للموظف بناءً على كل طلباته
export function computeVacationBalance(
  records: VacationRecord[], // كل طلبات الإجازة الخاصة بهذا الموظف
  now: Date = new Date()     // "الوقت الحالي" (تقدر تمرر تاريخ مخصص للاختبار، وإلا يستخدم الوقت الفعلي)
): YearBalance {
  const year = now.getFullYear(); // السنة الحالية، مثلاً 2026

  // 1️⃣ نحسب كم يوم من الـ30 يوم تبع السنة اللي فاتت استخدمه الموظف فعليًا
  const usedLastYear = parsedRecords(records, year - 1).reduce((sum, r) => sum + r.days, 0);
  // وبالتالي كم بقى له غير مستخدم من السنة اللي فاتت (ما ينزل تحت صفر)
  const leftoverLastYear = Math.max(0, ANNUAL_VACATION_DAYS - usedLastYear);

  // 📅 نهاية "شباك الترحيل" هي 31 مارس من السنة الحالية، آخر لحظة باليوم
  const carryWindowEnd = new Date(year, 2, 31, 23, 59, 59, 999); // March 31
  // هل احنا لسا داخل هالفترة (يناير لغاية 31 مارس)؟
  const carryWindowOpen = now.getTime() <= carryWindowEnd.getTime();

  // 2️⃣ نجيب كل طلبات هالسنة، ونقسمها لقسمين: اللي صارت داخل شباك الترحيل، واللي صارت بعده
  const thisYearRecords = parsedRecords(records, year);
  // مجموع الأيام المستخدمة داخل الشباك (يناير - مارس) — هذي ممكن تتحسم من رصيد المرحّل
  const usedInWindow = thisYearRecords
    .filter((r) => r.date.getTime() <= carryWindowEnd.getTime())
    .reduce((sum, r) => sum + r.days, 0);
  // مجموع الأيام المستخدمة بعد ما سكر الشباك (أبريل وبعده) — هذي تتحسم من الـ30 الجديدة فقط
  const usedAfterWindow = thisYearRecords
    .filter((r) => r.date.getTime() > carryWindowEnd.getTime())
    .reduce((sum, r) => sum + r.days, 0);

  // 3️⃣ كم من رصيد المرحّل فعليًا انصرف (ما يتجاوز اللي كان متاح أصلاً منه)
  const carryConsumed = Math.min(leftoverLastYear, usedInWindow);
  // كم باقي من رصيد المرحّل — إذا الشباك سكر، يصير صفر تلقائيًا (يضيع)
  const carryRemaining = carryWindowOpen ? leftoverLastYear - carryConsumed : 0;
  // كم انصرف من الـ30 الجديدة: أي استخدام زاد عن رصيد المرحّل داخل الشباك + كل الاستخدام بعد الشباك
  const annualConsumed = Math.max(0, usedInWindow - carryConsumed) + usedAfterWindow;

  // 4️⃣ تجميع الأرقام النهائية عشان نرجعها بالنتيجة
  const carriedIn = carryWindowOpen ? leftoverLastYear : 0; // كم يوم فعليًا مرحّل حاليًا (صفر لو الشباك سكر)
  const usedThisYear = usedInWindow + usedAfterWindow; // إجمالي المستخدم هالسنة (من الرصيدين معًا)
  const totalAvailable = ANNUAL_VACATION_DAYS + carriedIn; // إجمالي المتاح: الجديد + المرحّل
  const remaining = Math.max(0, ANNUAL_VACATION_DAYS - annualConsumed) + carryRemaining; // الباقي الفعلي: من الجديد + من المرحّل

  // 5️⃣ نرجع ملخص كامل عن حالة رصيد الموظف
  return {
    year,
    annual: ANNUAL_VACATION_DAYS,
    carriedIn,
    carryWindowOpen,
    carryExpired: !carryWindowOpen && leftoverLastYear > usedInWindow, // انتهت صلاحية رصيد المرحّل ولم يُستخدم بالكامل
    totalAvailable,
    used: usedThisYear,
    remaining,
  };
}
