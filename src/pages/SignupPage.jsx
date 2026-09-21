import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, sendOtp, verifyOtp } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === 'email') {
      setOtpSent(false);
      setOtpVerified(false);
      setInfo('');
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setInfo('');
    setSendingOtp(true);

    try {
      if (!form.email.trim()) {
        throw new Error('Email is required to receive the OTP.');
      }

      const result = await sendOtp({ email: form.email });
      setOtpSent(true);
      setOtpVerified(false);
      setInfo(result.message);
    } catch (err) {
      setError(err.message || 'Unable to send OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setInfo('');
    setVerifyingOtp(true);

    try {
      await verifyOtp({ email: form.email, otp: form.otp });
      setOtpVerified(true);
      setInfo('Email verified successfully. You can now create your account.');
    } catch (err) {
      setError(err.message || 'Unable to verify OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

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
        <p className="mt-2 text-sm text-brand-muted">Unlock savings, wishlist and prescription management.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Full Name</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand" placeholder="Your name" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Email</label>
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
                {sendingOtp ? 'Sending...' : otpVerified ? 'Sent' : 'Send OTP'}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand" placeholder="Choose a password" required />
          </div>

          {otpSent && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">Enter OTP</label>
              <div className="flex gap-2">
                <input name="otp" value={form.otp} onChange={handleChange} className="flex-1 rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand" placeholder="6-digit OTP" />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otpVerified}
                  className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    otpVerified ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:opacity-90'
                  }`}
                >
                  {verifyingOtp ? 'Verifying...' : otpVerified ? 'Verified' : 'Verify'}
                </button>
              </div>
            </div>
          )}

          {info && <p className="text-sm text-emerald-600">{info}</p>}
          {error && <p className="text-sm text-brand-error">{error}</p>}

          <button type="submit" className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={!otpVerified}>
            {otpVerified ? 'Create Account' : 'Verify email to continue'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-brand-muted">
          Already a customer? <Link to="/login" className="font-semibold text-brand-gold">Login</Link>
        </p>
      </div>
    </div>
  );
}
