import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const emailStore = {};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const otp = generateOtp();
  emailStore[normalizedEmail] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

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
      devCode: otp,
    });
  } catch (error) {
    console.error('OTP email error:', error);
    return res.status(500).json({
      error: 'Unable to send OTP email. Please check SMTP settings.',
      devCode: otp,
    });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedOtp = String(otp || '').trim();

  if (!normalizedEmail || !normalizedOtp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const record = emailStore[normalizedEmail];

  if (!record) {
    return res.status(400).json({ error: 'No OTP was sent for this email.' });
  }

  if (Date.now() > record.expiresAt) {
    delete emailStore[normalizedEmail];
    return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  }

  if (record.otp !== normalizedOtp) {
    return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  }

  delete emailStore[normalizedEmail];
  return res.json({ ok: true, message: 'Email verified successfully.' });
});

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'tiwari-opticals-otp' });
});

app.listen(port, () => {
  console.log(`OTP server running on http://localhost:${port}`);
});
