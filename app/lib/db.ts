import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

// NOTE: Firebase Admin is initialized lazily (only when `db` is actually
// used to make a call, e.g. db.ref(...)) instead of at module load time.
// This avoids failures during `next build`, where Next.js loads every
// route module to collect page data — at that point env vars provided
// only at container *runtime* (e.g. on Render's Docker builds) are not
// yet available, and eager initialization would throw.

let cachedApp: App | undefined;

function getFirebaseApp(): App {
  if (cachedApp) return cachedApp;

  if (getApps().length) {
    cachedApp = getApps()[0];
    return cachedApp;
  }

  const isEmulator = process.env.FIREBASE_DATABASE_EMULATOR_HOST !== undefined;

  if (isEmulator) {
    cachedApp = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "demo-project",
      databaseURL: process.env.FIREBASE_DATABASE_URL || "http://127.0.0.1:9000/?ns=demo-project",
    });
  } else {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? "")
      .replace(/\\n/g, "\n")
      .replace(/^["']|["']$/g, "")
      .trim();

    cachedApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  return cachedApp;
}

let cachedDb: Database | undefined;

function getDb(): Database {
  if (!cachedDb) {
    cachedDb = getDatabase(getFirebaseApp());
  }
  return cachedDb;
}

// A Proxy that behaves exactly like the real Database instance, but only
// triggers `getDb()` (and therefore Firebase initialization) the first
// time a property/method on it is actually accessed.
const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export default db;
