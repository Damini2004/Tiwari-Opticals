import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdminIdentity } from '../firebase/config';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const loggedInUser = await login(form);
      navigate(isAdminIdentity(loggedInUser) ? '/admin' : '/account');
    } catch (err) {
      setError(err.message || 'Unable to login.');
    }
  };

  return (
    <div className="container-shell py-12">
      <div className="mx-auto max-w-md card-surface p-8">
        <h1 className="text-3xl font-black">Welcome back</h1>
        <p className="mt-2 text-sm text-brand-muted">Sign in to manage your orders, prescriptions, and savings.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Email</label>
            <input name="email" value={form.email} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand" placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand" placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-brand-error">{error}</p>}
          <button type="submit" className="btn-primary w-full">Login</button>
        </form>
        <div className="mt-5 flex items-center justify-between text-sm">
          <Link to="/signup" className="text-brand-gold">Create account</Link>
          <a href="/" className="text-brand-muted">Forgot password?</a>
        </div>
      </div>
    </div>
  );
}
