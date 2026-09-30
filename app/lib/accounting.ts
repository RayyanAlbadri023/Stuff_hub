// Accounting module — Chart of Accounts + Journal Entries (real double-entry).
//
// Every journal entry is a set of lines, each debiting or crediting one
// account. A valid entry has at least two lines and total debits must equal
// total credits. Account balances are derived from the journal entries
// rather than stored directly, so the trial balance is always consistent.

export const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isValidAccountType(t: string): t is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(t);
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  createdAt?: string;
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  note?: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  lines: JournalLine[];
  fileData?: string;
  fileName?: string;
  createdAt?: string;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function sumDebits(lines: JournalLine[]): number {
  return round2(lines.reduce((s, l) => s + (Number(l.debit) || 0), 0));
}

export function sumCredits(lines: JournalLine[]): number {
  return round2(lines.reduce((s, l) => s + (Number(l.credit) || 0), 0));
}

/** A valid journal entry needs 2+ active lines and debits === credits, non-zero. */
export function isBalanced(lines: JournalLine[]): boolean {
  const active = lines.filter((l) => l.accountId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0));
  if (active.length < 2) return false;
  const d = sumDebits(active);
  const c = sumCredits(active);
  return d > 0 && d === c;
}

/** Assets and expenses grow with debits; liabilities, equity and revenue grow with credits. */
export function isDebitNormal(type: AccountType): boolean {
  return type === "asset" || type === "expense";
}

/** Net balance of one account across all journal entries, signed per its normal side. */
export function accountBalance(entries: JournalEntry[], account: Account): number {
  let debit = 0;
  let credit = 0;
  for (const e of entries) {
    for (const l of e.lines) {
      if (l.accountId !== account.id) continue;
      debit += Number(l.debit) || 0;
      credit += Number(l.credit) || 0;
    }
  }
  return round2(isDebitNormal(account.type) ? debit - credit : credit - debit);
}
