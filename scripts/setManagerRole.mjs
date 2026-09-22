// One-off script: makes salim.almandhari@ebanah.com a "manager".
// Run once from the project root with:
//   node scripts/setManagerRole.mjs
//
// If the account already exists, its role is updated to "manager".
// If it does not exist yet, it is created with a default password
// (123456) that should be changed after first login.

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const MANAGER_EMAIL = "salim.almandhari@ebanah.com";
const DEFAULT_PASSWORD = "123456";

async function run() {
  const normalizedEmail = MANAGER_EMAIL.trim().toLowerCase();
  const existing = await db.ref("users").orderByChild("email").equalTo(normalizedEmail).once("value");

  if (existing.exists()) {
    let userId = "";
    existing.forEach((child) => { userId = child.key; });
    await db.ref(`users/${userId}`).update({ role: "manager" });
    console.log(`✅ Updated existing account to role "manager": ${normalizedEmail}`);
  } else {
    const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await db.ref("users").push({
      firstName: "Salim",
      lastName: "Al Mandhari",
      phone: "",
      email: normalizedEmail,
      password: hashed,
      role: "manager",
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date().toISOString(),
    });
    console.log(`✅ Created new manager account: ${normalizedEmail} (password: ${DEFAULT_PASSWORD})`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
