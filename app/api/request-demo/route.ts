import { NextRequest, NextResponse } from "next/server";

const TO_EMAIL = "ma.alshehri@hotmail.com";

function clean(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Honeypot: bots often fill every field.
  if (clean(body.website)) return NextResponse.json({ ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 180);
  const company = clean(body.company, 180);
  const phone = clean(body.phone, 80);
  const message = clean(body.message, 2500);
  const locale = clean(body.locale, 10) || "en";

  if (!name || !email || !company || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error("Request demo email is not configured: RESEND_API_KEY / ALERT_FROM_EMAIL missing.");
    return NextResponse.json({ ok: false, error: "Email service is not configured" }, { status: 500 });
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:28px;color:#241824">
      <div style="font-size:26px;font-weight:800;color:#660066;margin-bottom:22px">metriX — Demo Request</div>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">Name</td><td style="padding:10px;border-bottom:1px solid #eee">${esc(name)}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">Email</td><td style="padding:10px;border-bottom:1px solid #eee">${esc(email)}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">Company</td><td style="padding:10px;border-bottom:1px solid #eee">${esc(company)}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">Phone</td><td style="padding:10px;border-bottom:1px solid #eee">${esc(phone || "—")}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">Language</td><td style="padding:10px;border-bottom:1px solid #eee">${esc(locale)}</td></tr>
      </table>
      <div style="margin-top:22px;font-weight:700">Monitoring needs</div>
      <div style="margin-top:8px;padding:16px;background:#faf7fa;border-radius:14px;white-space:pre-wrap">${esc(message || "—")}</div>
      <p style="margin-top:22px;color:#777;font-size:12px">Submitted from trymetrix.co</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [TO_EMAIL],
      reply_to: email,
      subject: `metriX demo request — ${company}`,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend demo request failed:", await res.text());
    return NextResponse.json({ ok: false, error: "Email delivery failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
