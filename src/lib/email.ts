// src/lib/email.ts
// Thin wrapper around nodemailer — only sends if SMTP is configured.
import nodemailer from "nodemailer";

const host     = process.env.EMAIL_SERVER_HOST;
const port     = parseInt(process.env.EMAIL_SERVER_PORT ?? "587");
const user     = process.env.EMAIL_SERVER_USER;
const pass     = process.env.EMAIL_SERVER_PASSWORD;
const from     = process.env.EMAIL_FROM ?? "noreply@sector1.ro";
const baseUrl  = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export { baseUrl };

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!host || !user || !pass) {
    console.warn("[email] SMTP not configured — email not sent to", opts.to);
    return false;
  }
  const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
  await transporter.sendMail({ from, ...opts });
  return true;
}

export function inviteHtml(name: string, inviteUrl: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#3040c8">Invitație la portal</h2>
      <p>Bună ziua, <strong>${name}</strong>,</p>
      <p>Administratorul asociației v-a creat un cont pe <strong>Portal Sector 1</strong>.
         Accesați linkul de mai jos pentru a vă seta parola și a vă conecta:</p>
      <p style="margin:24px 0">
        <a href="${inviteUrl}" style="background:#3040c8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Activează contul
        </a>
      </p>
      <p style="color:#888;font-size:13px">Linkul este valabil 7 zile.<br>Dacă nu ați solicitat acest cont, ignorați acest email.</p>
    </div>
  `;
}
