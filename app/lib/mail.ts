import { Resend } from "resend";

export async function sendMail(to: string, subject: string, html: string) {
  try {
    // Constructed lazily (not at module load) so a missing key fails the
    // send gracefully instead of crashing every route that merely imports
    // this file — e.g. in local dev where RESEND_API_KEY isn't set.
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ Mail error: RESEND_API_KEY is not set");
      return { success: false, error: "RESEND_API_KEY is not set" };
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev", // Use your verified domain in production
      to,
      subject,
      html,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Mail error:", error);
    return { success: false, error };
  }
}
