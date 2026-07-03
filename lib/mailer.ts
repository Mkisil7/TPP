import nodemailer from "nodemailer";

// Sends 2FA codes from the app itself (SMTP creds live in server env vars).
// Gmail defaults: set SMTP_USER to the Gmail address and SMTP_PASS to a
// Google "app password". SMTP_HOST/SMTP_PORT exist for other providers and
// for local testing against a capture server.

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

/** True when the app can send its own emails (typed-code 2FA available). */
export function mailerConfigured(): boolean {
  return Boolean(SMTP_USER && SMTP_PASS);
}

export async function sendLoginCode(to: string, code: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"ADT Field Assessment" <${SMTP_USER}>`,
    to,
    subject: `${code} is your ADT sign-in code`,
    text: `Your ADT Field Assessment sign-in code is ${code}. It expires in 10 minutes. If you didn't try to sign in, ignore this email.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <div style="background:#012169;border-radius:12px 12px 0 0;padding:20px 24px">
          <span style="color:#ffffff;font-size:18px;font-weight:800">ADT Field Assessment</span>
        </div>
        <div style="border:1px solid #d7e0f0;border-top:none;border-radius:0 0 12px 12px;padding:24px">
          <p style="margin:0 0 8px;color:#0a142f;font-size:15px">Enter this code to verify your device:</p>
          <p style="margin:0 0 16px;color:#012169;font-size:34px;font-weight:800;letter-spacing:8px">${code}</p>
          <p style="margin:0;color:#64748b;font-size:12px">
            The code expires in 10 minutes. If you didn't try to sign in, you can ignore this email.
          </p>
        </div>
      </div>`,
  });
}
