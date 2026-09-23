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
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const generateOtp = () => String(crypto.randomInt(100000, 1_000_000));
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);
const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  if (!hasSmtpConfig()) {
    return res.status(503).json({ error: 'Email service is not configured.' });
  }

  const existing = emailStore.get(normalizedEmail);
  if (existing && Date.now() < existing.resendAvailableAt) {
    const retryAfter = Math.ceil((existing.resendAvailableAt - Date.now()) / 1000);
    return res.status(429).json({ error: `Please wait ${retryAfter} seconds before requesting another code.` });
  }

  const otp = generateOtp();
  emailStore.set(normalizedEmail, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
    attempts: 0,
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: normalizedEmail,
      subject: 'Your Tiwari Opticals verification code',
      text: `Your Tiwari Opticals verification code is ${otp}. It expires in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827;">
          <h2>Tiwari Opticals</h2>
          <p>Your verification code is:</p>
          <p style="font-size: 32px; font-weight: 700; letter-spacing: 4px; margin: 20px 0;">${otp}</p>
          <p>This code expires in 5 minutes.</p>
        </div>
      `,
    });

    return res.json({
      ok: true,
      message: 'OTP sent to your email.',
    });
  } catch (error) {
    console.error('OTP email error:', error);
    emailStore.delete(normalizedEmail);
    return res.status(500).json({
      error: 'Unable to send OTP email. Please check SMTP settings.',
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
