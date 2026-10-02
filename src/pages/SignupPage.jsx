import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MAX_VERIFY_ATTEMPTS = 5;

const normalizeEmail = (value) =>
  String(value || '').trim().toLowerCase();

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, sendOtp, verifyOtp } = useAuth();

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
  const [otpData, setOtpData] = useState(null);
  const [clockNow, setClockNow] = useState(Date.now());

  useEffect(() => {
    if (!otpData?.resendAvailableAt) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpData?.resendAvailableAt]);

  const resendCooldownSeconds = useMemo(() => {
    if (!otpData?.resendAvailableAt) {
      return 0;
    }

    return Math.max(
      0,
      Math.ceil((otpData.resendAvailableAt - clockNow) / 1000)
    );
  }, [otpData?.resendAvailableAt, clockNow]);

  const handleChange = (event) => {
    const { name, value } = event.target;

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

  const handleSendOtp = async () => {
    setError('');
    setInfo('');
    setSendingOtp(true);

    try {
      const email = normalizeEmail(form.email);

      if (!email) {
        throw new Error('Email is required to receive the OTP.');
      }

      if (otpVerified && otpData?.email === email) {
        throw new Error('This email is already verified.');
      }

      if (otpData && otpData.email === email) {
        const remainingSeconds = Math.max(
          1,
          Math.ceil((otpData.resendAvailableAt - Date.now()) / 1000)
        );

        if (Date.now() < otpData.resendAvailableAt) {
          throw new Error(
            `Please wait ${remainingSeconds} seconds before requesting another OTP.`
          );
        }
      }

      const generatedOtp = await sendOtp({ email });

      const nextOtpData = {
        email,
        expiresAt: generatedOtp.expiresAt,
        resendAvailableAt: generatedOtp.resendAvailableAt,
        attempts: 0,
        verifiedAt: null,
      };

      setOtpData(nextOtpData);
      setOtpSent(true);
      setOtpVerified(false);
      setForm((current) => ({
        ...current,
        otp: '',
      }));

      setInfo(
        `OTP sent successfully to ${email}. The code is valid for 5 minutes.`
      );
    } catch (err) {
      console.error('OTP sending error:', err);

      setOtpData(null);
      setOtpSent(false);
      setError(
        err?.text || err?.message || 'Unable to send OTP. Please try again.'
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
      const email = normalizeEmail(form.email);
      const enteredOtp = form.otp.trim();

      if (!email) {
        throw new Error('Please enter your email address.');
      }

      if (!enteredOtp) {
        throw new Error('Please enter the OTP.');
      }

      if (enteredOtp.length !== 6) {
        throw new Error('Please enter the 6-digit OTP.');
      }

      if (!otpData) {
        throw new Error('Please request a new OTP.');
      }

      if (otpData.email !== email) {
        throw new Error('Email has changed. Please request a new OTP.');
      }

      if (Date.now() > otpData.expiresAt) {
        setOtpData(null);
        setOtpSent(false);
        throw new Error('OTP has expired. Please request a new OTP.');
      }

      if (otpData.attempts >= MAX_VERIFY_ATTEMPTS) {
        setOtpData(null);
        setOtpSent(false);
        throw new Error(
          'Too many incorrect attempts. Please request a new OTP.'
        );
      }

      const result = await verifyOtp({ email, otp: enteredOtp });

      if (!result?.verified) {
        throw new Error('Unable to verify OTP.');
      }

      const nextOtpData = {
        ...otpData,
        attempts: 0,
        verifiedAt: Date.now(),
        otp: null,
      };

      setOtpData(nextOtpData);
      setOtpVerified(true);
      setOtpSent(true);
      setInfo('Email verified successfully. You can now create your account.');
    } catch (err) {
      const nextAttempts = (otpData?.attempts || 0) + 1;
      const remainingAttempts = MAX_VERIFY_ATTEMPTS - nextAttempts;

      if (otpData && otpData.email === normalizeEmail(form.email)) {
        setOtpData((current) => ({
          ...current,
          attempts: Math.min(nextAttempts, MAX_VERIFY_ATTEMPTS),
        }));
      }

      if (
        err?.message?.includes('Invalid OTP') ||
        err?.message?.includes('Too many incorrect attempts') ||
        err?.message?.includes('OTP expired')
      ) {
        setError(err.message);
      } else {
        setError(err.message || 'Unable to verify OTP.');
      }

      if (remainingAttempts <= 0 && otpData) {
        setOtpData(null);
        setOtpSent(false);
      }
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
        <h1 className="text-3xl font-black">Create your account</h1>

        <p className="mt-2 text-sm text-brand-muted">
          Unlock savings, wishlist and prescription management.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
                disabled={sendingOtp || otpVerified || resendCooldownSeconds > 0}
                className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  otpVerified
                    ? 'bg-emerald-600 text-white'
                    : sendingOtp || resendCooldownSeconds > 0
                      ? 'bg-slate-300 text-slate-700'
                      : 'bg-brand text-white hover:opacity-90'
                }`}
              >
                {sendingOtp
                  ? 'Sending...'
                  : otpVerified
                    ? 'Verified'
                    : resendCooldownSeconds > 0
                      ? `Wait ${resendCooldownSeconds}s`
                      : 'Send OTP'}
              </button>
            </div>
          </div>

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
                  disabled={verifyingOtp || otpVerified || form.otp.length !== 6}
                  className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    otpVerified
                      ? 'bg-emerald-600 text-white'
                      : verifyingOtp || form.otp.length !== 6
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

          {info && <p className="text-sm text-emerald-600">{info}</p>}

          {error && <p className="text-sm text-brand-error">{error}</p>}

          <button
            type="submit"
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!otpVerified}
          >
            {otpVerified ? 'Create Account' : 'Verify email to continue'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-brand-muted">
          Already a customer?{' '}
          <Link to="/login" className="font-semibold text-brand-gold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
