// Work permit & residency card tracking for expatriate employees.
//
// Under Omani law, an expatriate employee must hold a valid work permit
// (تصريح عمل, issued/renewed via the Ministry of Labour) and a valid
// resident card (بطاقة إقامة, issued via the Royal Oman Police / ROP) at
// all times — letting either lapse exposes the employer to fines and the
// employee to legal risk. This module tracks expiry dates and flags
// documents that are expired or approaching expiry so HR can renew in time.

export type DocStatus = "valid" | "expiring_soon" | "expired" | "missing";

// Documents expiring within this many days are flagged for renewal.
export const EXPIRY_WARNING_DAYS = 60;

export function getDocStatus(expiryDate?: string | null, now: Date = new Date()): DocStatus {
  if (!expiryDate) return "missing";
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return "missing";
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "expired";
  if (daysLeft <= EXPIRY_WARNING_DAYS) return "expiring_soon";
  return "valid";
}

export function daysUntil(expiryDate?: string | null, now: Date = new Date()): number | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export interface EmployeeDocs {
  workPermitNumber?: string | null;
  workPermitExpiry?: string | null;
  residencyNumber?: string | null;
  residencyExpiry?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
}

export function worstStatus(docs: EmployeeDocs, now: Date = new Date()): DocStatus {
  const statuses = [
    getDocStatus(docs.workPermitExpiry, now),
    getDocStatus(docs.residencyExpiry, now),
  ];
  if (statuses.includes("expired")) return "expired";
  if (statuses.includes("expiring_soon")) return "expiring_soon";
  if (statuses.includes("missing")) return "missing";
  return "valid";
}
