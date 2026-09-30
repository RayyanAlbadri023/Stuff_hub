// Access control for the Shared Files feature.
//
// The shared-files page is split into isolated sections (roughly matching
// company departments). Each section has its own fixed member list — only
// members of a section (or the super-access email below) can see, upload
// to, or delete from that section. Sections are fully isolated from each
// other: being a member of "programming" gives no visibility into
// "marketing", etc.
//
// The "general" section has an empty member list, which is treated as
// "open to every authenticated user" — it's the one shared space everyone
// can see regardless of department.

import type { TranslationKeys } from "@/app/context/translations";

export type FileSectionKey =
  | "marketing"
  | "programming"
  | "ai"
  | "sales"
  | "design"
  | "general";

export interface FileSectionDef {
  key: FileSectionKey;
  labelKey: TranslationKeys; // translation key for the section's display name
  icon: string;
  /** Lowercased member emails. An empty array means "open to everyone". */
  members: string[];
}

// This single email can see and manage every section, regardless of its
// member list.
const SUPER_ACCESS_EMAIL = "salim.almandhari@ebanah.com";

export const FILE_SECTIONS: FileSectionDef[] = [
  {
    key: "general",
    labelKey: "sectionGeneral",
    icon: "🗂️",
    members: [], // open to everyone
  },
  {
    key: "marketing",
    labelKey: "sectionMarketing",
    icon: "📣",
    members: ["duaa.alshibli@ebanah.com", "masiud.alshamakhi@ebanah.com"],
  },
  {
    key: "sales",
    labelKey: "sectionSales",
    icon: "💼",
    members: ["duaa.alshibli@ebanah.com", "masiud.alshamakhi@ebanah.com"],
  },
  {
    key: "programming",
    labelKey: "sectionProgramming",
    icon: "💻",
    members: [
      "rayyan.albadri@ebanah.com",
      "shaban.elmansy@ebanah.com",
      "mohammed.aljabri@ebanah.com",
    ],
  },
  {
    key: "ai",
    labelKey: "sectionAI",
    icon: "🤖",
    members: [
      "rayyan.albadri@ebanah.com",
      "shaban.elmansy@ebanah.com",
      "mohammed.aljabri@ebanah.com",
    ],
  },
  {
    key: "design",
    labelKey: "sectionDesign",
    icon: "🎨",
    members: [
      "rayyan.albadri@ebanah.com",
      "anass.hassouni@ebanah.com",
      "shaban.elmansy@ebanah.com",
    ],
  },
];

function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

/** Whether the given email may see/upload/manage files in this section. */
export function canAccessSection(email: string | undefined | null, sectionKey: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (normalized === SUPER_ACCESS_EMAIL) return true;

  const section = FILE_SECTIONS.find((s) => s.key === sectionKey);
  if (!section) return false;
  if (section.members.length === 0) return true; // open section (general)

  return section.members.includes(normalized);
}

/** All sections this email is allowed to see, in display order. */
export function getAccessibleSections(email: string | undefined | null): FileSectionDef[] {
  return FILE_SECTIONS.filter((s) => canAccessSection(email, s.key));
}

export function isValidSectionKey(key: string): key is FileSectionKey {
  return FILE_SECTIONS.some((s) => s.key === key);
}
