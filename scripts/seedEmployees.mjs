// One-off script: adds a batch of employee accounts to Firebase.
// Run once from the project root with:
//   node scripts/seedEmployees.mjs
//
// It reads Firebase credentials from your existing .env file (no extra
// setup needed) and skips any email that already exists in the database.

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load .env manually (no dotenv dependency required) ─────────────────────
function loadEnv(file) {
  const content = readFileSync(file, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv(path.join(__dirname, "..", ".env"));

// ── Init Firebase Admin (same logic as app/lib/db.ts) ───────────────────────
if (!getApps().length) {
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? "")
    .replace(/\\n/g, "\n")
    .replace(/^["']|["']$/g, "")
    .trim();

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = getDatabase();

// ── Employees to add ─────────────────────────────────────────────────────
const EMPLOYEES = [
  { email: "anass.hassouni@ebanah.com", firstName: "Anass", lastName: "Hassouni" },
  { email: "shaban.elmansy@ebanah.com", firstName: "Shaban", lastName: "Elmansy" },
  { email: "duaa.alshibli@ebanah.com", firstName: "Duaa", lastName: "Alshibli" },
  { email: "mohammed.aljabri@ebanah.com", firstName: "Mohammed", lastName: "Aljabri" },
  { email: "masiud.alshamakhi@ebanah.com", firstName: "Masiud", lastName: "Alshamakhi" },
  { email: "rayyan.albadri@ebanah.com", firstName: "Rayyan", lastName: "Albadri" },
];

const PASSWORD = "123456";

async function run() {
  const hashed = await bcrypt.hash(PASSWORD, 10);
  let added = 0;
  let skipped = 0;

  for (const emp of EMPLOYEES) {
    const normalizedEmail = emp.email.trim().toLowerCase();
    const existing = await db.ref("users").orderByChild("email").equalTo(normalizedEmail).once("value");
    if (existing.exists()) {
      console.log(`⏭  Skipped (already exists): ${normalizedEmail}`);
      skipped++;
      continue;
    }

    await db.ref("users").push({
      firstName: emp.firstName,
      lastName: emp.lastName,
      phone: "",
      email: normalizedEmail,
      password: hashed,
      role: "employee",
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date().toISOString(),
    });
    console.log(`✅ Added: ${normalizedEmail}`);
    added++;
  }

  console.log(`\nDone. Added ${added}, skipped ${skipped}.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
