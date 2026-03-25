import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getEmailConfig() {
  return {
    host: process.env.SMTP_HOST?.trim() || "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER?.trim() || "",
    pass: process.env.SMTP_PASS?.trim() || "",
    from: process.env.SMTP_FROM?.trim() || "Good Lie Club <no-reply@goodlie.club>",
    secure: process.env.SMTP_SECURE === "true",
  };
}

export function isEmailConfigured() {
  const config = getEmailConfig();
  return Boolean(config.host && config.user && config.pass && config.from);
}

function getTransporter() {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporter) {
    const config = getEmailConfig();
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  return transporter;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.log(
      `[email disabled] ${input.subject} -> ${input.to}`,
    );
    return { queued: false };
  }

  const config = getEmailConfig();
  await activeTransporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return { queued: true };
}
