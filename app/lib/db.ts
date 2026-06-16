import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

if (!getApps().length) {
  const isEmulator = process.env.FIREBASE_DATABASE_EMULATOR_HOST !== undefined;

  if (isEmulator) {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "demo-project",
      databaseURL: process.env.FIREBASE_DATABASE_URL || "http://127.0.0.1:9000/?ns=demo-project",
    });
  } else {
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
}

const db = getDatabase();
export default db;