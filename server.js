import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const emailStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const generateOtp = () => String(crypto.randomInt(100000, 1_000_000));
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);
const hasResendConfig = () => Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const sendOtpEmail = async ({ email, otp }) => {
  const text = `Your Tiwari Opticals verification code is ${otp}. It expires in 5 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827;">
      <h2>Tiwari Opticals</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 4px; margin: 20px 0;">${otp}</p>
      <p>This code expires in 5 minutes.</p>
    </div>
  `;

  let smtpError = null;

  if (hasSmtpConfig()) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Your Tiwari Opticals verification code',
        text,
        html,
      });

      return 'smtp';
    } catch (error) {
      smtpError = error;
      console.error('SMTP OTP delivery failed; trying Resend:', error.message);
    }
  }

  if (hasResendConfig()) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        to: [email],
        subject: 'Your Tiwari Opticals verification code',
        text,
        html,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || `Resend returned HTTP ${response.status}.`);
    }

    return 'resend';
  }

  if (smtpError) {
    throw new Error('SMTP delivery failed and Resend fallback is unavailable.');
  }

  throw new Error('Email delivery is not configured.');
};

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  if (!hasResendConfig() && !hasSmtpConfig()) {
    return res.status(503).json({ error: 'Email service is not configured.' });
  }

  const existing = emailStore.get(normalizedEmail);
  if (existing && Date.now() < existing.resendAvailableAt) {
    const retryAfter = Math.ceil((existing.resendAvailableAt - Date.now()) / 1000);
    return res.status(429).json({ error: `Please wait ${retryAfter} seconds before requesting another code.` });
  }

  const otp = generateOtp();
  const now = Date.now();
  const expiresAt = now + OTP_TTL_MS;
  const resendAvailableAt = now + RESEND_COOLDOWN_MS;
  emailStore.set(normalizedEmail, {
    otp,
    expiresAt,
    resendAvailableAt,
    attempts: 0,
  });

  try {
    const deliveryProvider = await sendOtpEmail({
      email: normalizedEmail,
      otp,
    });

    return res.json({
      ok: true,
      message: 'OTP sent to your email.',
      expiresAt,
      resendAvailableAt,
      deliveryProvider,
    });
  } catch (error) {
    console.error('OTP email delivery failed:', error.message);
    emailStore.delete(normalizedEmail);
    return res.status(500).json({
      error: 'Unable to send OTP email. Check Resend and SMTP settings.',
    });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedOtp = String(otp || '').trim();

  if (!isValidEmail(normalizedEmail) || !/^\d{6}$/.test(normalizedOtp)) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const record = emailStore.get(normalizedEmail);

  if (!record) {
    return res.status(400).json({ error: 'No OTP was sent for this email.' });
  }

  if (Date.now() > record.expiresAt) {
    emailStore.delete(normalizedEmail);
    return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    emailStore.delete(normalizedEmail);
    return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
  }

  const isMatch = crypto.timingSafeEqual(Buffer.from(record.otp), Buffer.from(normalizedOtp));
  if (!isMatch) {
    record.attempts += 1;
    emailStore.set(normalizedEmail, record);
    return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  }

  emailStore.delete(normalizedEmail);
  return res.json({ ok: true, message: 'Email verified successfully.' });
});

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'tiwari-opticals-otp' });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`OTP server running on port ${PORT}`);
});
