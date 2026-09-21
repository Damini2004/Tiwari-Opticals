import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await signup(form);
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
            <input name="fullName" value={form.fullName} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand" placeholder="Your name" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Email</label>
            <input name="email" value={form.email} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand" placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand" placeholder="Choose a password" />
          </div>
          {error && <p className="text-sm text-brand-error">{error}</p>}
          <button type="submit" className="btn-primary w-full">Create Account</button>
        </form>
        <p className="mt-5 text-center text-sm text-brand-muted">
          Already a customer? <Link to="/login" className="font-semibold text-brand-gold">Login</Link>
        </p>
      </div>
    </div>
  );
}
