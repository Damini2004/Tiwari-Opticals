import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      if (!isFirebaseConfigured) {
        setMessage('Password reset is available in Firebase mode. For this demo, use the admin demo credentials or create a new account.');
        return;
      }

      await sendPasswordResetEmail(auth, email.trim());
      setMessage('Password reset email sent. Please check your inbox.');
    } catch (resetError) {
      setError(resetError?.message || 'Unable to send a reset email.');
    }
  };

  return (
    <div className="container-shell py-12">
      <div className="mx-auto max-w-md card-surface p-8">
        <h1 className="text-3xl font-black">Reset password</h1>
        <p className="mt-2 text-sm text-brand-muted">Enter the account email to receive a reset link.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand"
              placeholder="you@example.com"
              required
            />
          </div>

          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-brand-error">{error}</p>}

          <button type="submit" className="btn-primary w-full">Send reset link</button>
        </form>

        <div className="mt-5 text-sm">
          <Link to="/login" className="text-brand-gold">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
