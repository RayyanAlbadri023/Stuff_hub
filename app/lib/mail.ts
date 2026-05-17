import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail(to: string, subject: string, html: string) {
  try {
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
