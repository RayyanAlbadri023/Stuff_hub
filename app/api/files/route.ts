import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { canAccessSection, isValidSectionKey } from "@/app/lib/fileSections";

// 8 MB cap on the base64 payload (Firebase Realtime Database keeps each
// value well clear of its practical size limits this way).
const MAX_FILE_DATA_LENGTH = 8 * 1024 * 1024 * 1.4; // base64 is ~1.37x the raw byte size

export async function GET(req: NextRequest) {
  try {
    const section = req.nextUrl.searchParams.get("section") || "";
    const email = req.nextUrl.searchParams.get("email") || "";

    if (!section || !isValidSectionKey(section)) {
      return NextResponse.json({ message: "A valid section is required" }, { status: 400 });
    }
    if (!canAccessSection(email, section)) {
      return NextResponse.json({ message: "Not allowed to view this section" }, { status: 403 });
    }

    const snap = await db.ref("sharedFiles").once("value");
    const files: any[] = [];
    snap.forEach((child) => {
      const d = child.val();
      // Files uploaded before sections existed have no `section` field —
      // treat those as belonging to the open "general" section so nothing
      // already shared disappears.
      const fileSection = d.section || "general";
      if (fileSection !== section) return;
      files.push({
        id: child.key,
        title: d.title || "",
        fileData: d.fileData || null,
        fileName: d.fileName || "file",
        fileSize: d.fileSize || 0,
        section: fileSection,
        uploadedByName: d.uploadedByName || "Unknown",
        uploadedByEmail: d.uploadedByEmail || "",
        uploadedByRole: d.uploadedByRole || "",
        createdAt: d.createdAt,
      });
    });
    return NextResponse.json({ files: files.reverse() });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, fileData, fileName, fileSize, section, uploadedByName, uploadedByEmail, uploadedByRole } = body;

    if (!section || !isValidSectionKey(section)) {
      return NextResponse.json({ message: "A valid section is required" }, { status: 400 });
    }
    if (!canAccessSection(uploadedByEmail, section)) {
      return NextResponse.json({ message: "Not allowed to upload to this section" }, { status: 403 });
    }
    if (!fileData) {
      return NextResponse.json({ message: "File is required" }, { status: 400 });
    }
    if (typeof fileData === "string" && fileData.length > MAX_FILE_DATA_LENGTH) {
      return NextResponse.json({ message: "File is too large" }, { status: 400 });
    }

    await db.ref("sharedFiles").push({
      title: title || "",
      fileData,
      fileName: fileName || "file",
      fileSize: fileSize || 0,
      section,
      uploadedByName: uploadedByName || "Unknown",
      uploadedByEmail: uploadedByEmail || "",
      uploadedByRole: uploadedByRole || "",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: "File uploaded" }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
