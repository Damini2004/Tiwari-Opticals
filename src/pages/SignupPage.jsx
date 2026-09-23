import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    otp: '',
  });

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Store OTP information only for this customer signup page.
  const [otpData, setOtpData] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;

    // Only allow numbers in OTP field
    if (name === 'otp') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6);

      setForm((current) => ({
        ...current,
        [name]: numericValue,
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    // If customer changes email, previous OTP becomes invalid.
    if (name === 'email') {
      setOtpSent(false);
      setOtpVerified(false);
      setOtpData(null);
      setInfo('');
      setError('');
      setForm((current) => ({
        ...current,
        otp: '',
      }));
    }
  };

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendOtp = async () => {
    setError('');
    setInfo('');
    setSendingOtp(true);

    try {
      const email = form.email.trim().toLowerCase();

      if (!email) {
        throw new Error('Email is required to receive the OTP.');
      }

      // Generate a new 6-digit OTP.
      const otp = generateOtp();

      // OTP expires after 5 minutes.
      const expiresAt = Date.now() + 5 * 60 * 1000;

      // Store OTP information in this browser session.
      setOtpData({
        email,
        otp,
        expiresAt,
        attempts: 0,
      });

      // Send OTP using EmailJS.
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          to_email: email,
          otp: otp,
        },
        {
          publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
        }
      );

      setOtpSent(true);
      setOtpVerified(false);
      setForm((current) => ({
        ...current,
        otp: '',
      }));

      setInfo(
        'OTP sent successfully. Please check your email. The OTP is valid for 5 minutes.'
      );
    } catch (err) {
      console.error('OTP sending error:', err);

      setOtpData(null);
      setOtpSent(false);

      setError(
        err?.text ||
          err?.message ||
          'Unable to send OTP. Please try again.'
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setInfo('');
    setVerifyingOtp(true);

    try {
      const enteredOtp = form.otp.trim();
      const email = form.email.trim().toLowerCase();

      if (!enteredOtp) {
        throw new Error('Please enter the OTP.');
      }

      if (enteredOtp.length !== 6) {
        throw new Error('Please enter the 6-digit OTP.');
      }

      if (!otpData) {
        throw new Error('Please request a new OTP.');
      }

      // Make sure the OTP belongs to the current email.
      if (otpData.email !== email) {
        throw new Error('Email has changed. Please request a new OTP.');
      }

      // Check OTP expiry.
      if (Date.now() > otpData.expiresAt) {
        setOtpData(null);
        setOtpSent(false);

        throw new Error(
          'OTP has expired. Please request a new OTP.'
        );
      }

      // Maximum 5 attempts.
      if (otpData.attempts >= 5) {
        setOtpData(null);
        setOtpSent(false);

        throw new Error(
          'Too many incorrect attempts. Please request a new OTP.'
        );
      }

      // Check OTP.
      if (enteredOtp !== otpData.otp) {
        setOtpData((current) => {
          if (!current) return current;

          return {
            ...current,
            attempts: current.attempts + 1,
          };
        });

        const remainingAttempts = 4 - otpData.attempts;

        throw new Error(
          remainingAttempts > 0
            ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
            : 'Invalid OTP. Please request a new OTP.'
        );
      }

      // OTP is correct.
      setOtpVerified(true);
      setOtpData(null);

      setInfo(
        'Email verified successfully. You can now create your account.'
      );
    } catch (err) {
      setError(err.message || 'Unable to verify OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!otpVerified) {
      setError('Please verify your email before creating your account.');
      return;
    }

    try {
      await signup({
        fullName: form.fullName,
        email: form.email,
        password: form.password,

        // Keep your existing Firebase signup logic.
        // Admin functionality is not changed.
        isEmailVerified: otpVerified,
      });

      navigate('/account');
    } catch (err) {
      setError(err.message || 'Unable to create account.');
    }
  };

  return (
    <div className="container-shell py-12">
      <div className="mx-auto max-w-md card-surface p-8">
        <h1 className="text-3xl font-black">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-brand-muted">
          Unlock savings, wishlist and prescription management.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit}
        >
          {/* Full Name */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">
              Full Name
            </label>

            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand"
              placeholder="Your name"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">
              Email
            </label>

            <div className="flex gap-2">
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand"
                placeholder="you@example.com"
                required
              />

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || otpVerified}
                className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  otpVerified
                    ? 'bg-emerald-600 text-white'
                    : sendingOtp
                      ? 'bg-slate-300 text-slate-700'
                      : 'bg-brand text-white hover:opacity-90'
                }`}
              >
                {sendingOtp
                  ? 'Sending...'
                  : otpVerified
                    ? 'Verified'
                    : 'Send OTP'}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">
              Password
            </label>

            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand"
              placeholder="Choose a password"
              required
            />
          </div>

          {/* OTP */}
          {otpSent && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">
                Enter OTP
              </label>

              <div className="flex gap-2">
                <input
                  name="otp"
                  value={form.otp}
                  onChange={handleChange}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand"
                  placeholder="6-digit OTP"
                  disabled={otpVerified}
                />

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={
                    verifyingOtp ||
                    otpVerified ||
                    form.otp.length !== 6
                  }
                  className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    otpVerified
                      ? 'bg-emerald-600 text-white'
                      : verifyingOtp ||
                          form.otp.length !== 6
                        ? 'bg-slate-300 text-slate-700'
                        : 'bg-slate-800 text-white hover:opacity-90'
                  }`}
                >
                  {verifyingOtp
                    ? 'Verifying...'
                    : otpVerified
                      ? 'Verified'
                      : 'Verify'}
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          {info && (
            <p className="text-sm text-emerald-600">
              {info}
            </p>
          )}

          {error && (
            <p className="text-sm text-brand-error">
              {error}
            </p>
          )}

          {/* Create Account */}
          <button
            type="submit"
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!otpVerified}
          >
            {otpVerified
              ? 'Create Account'
              : 'Verify email to continue'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-brand-muted">
          Already a customer?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-gold"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}