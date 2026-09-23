import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { isAdminIdentity } from '../firebase/config';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    login,
    loading,
  } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');

  /*
  =======================================================
  REDIRECT ALREADY LOGGED-IN USERS
  =======================================================
  */

 
useEffect(() => {
  if (loading) {
    return;
  }

  if (!user) {
    return;
  }

  // Admin users always go to the admin dashboard.
  if (user.role === 'admin' || user.isAdmin === true) {
    navigate('/admin', {
      replace: true,
    });
    return;
  }

  // Normal customers go to their account page.
  navigate('/account', {
    replace: true,
  });
}, [user, loading, navigate]);


  /*
  =======================================================
  HANDLE INPUT CHANGE
  =======================================================
  */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /*
  =======================================================
  HANDLE LOGIN
  =======================================================
  */


const handleSubmit = async (event) => {
  event.preventDefault();

  setError('');

  try {
    const loggedInUser = await login(form);

    // Admin → Admin Dashboard
    if (
      loggedInUser?.role === 'admin' ||
      loggedInUser?.isAdmin === true
    ) {
      navigate('/admin', {
        replace: true,
      });
      return;
    }

    // Customer → Account
    navigate(
      location.state?.from || '/account',
      {
        replace: true,
      }
    );
  } catch (err) {
    console.error('LOGIN ERROR:', err);

    setError(
      err.message || 'Unable to login.'
    );
  }
};



  /*
  =======================================================
  PAGE
  =======================================================
  */

  return (
    <div className="container-shell py-12">
      <div className="mx-auto max-w-md card-surface p-8">

        <h1 className="text-3xl font-black">
          Welcome back
        </h1>

        <p className="mt-2 text-sm text-brand-muted">
          Sign in to manage your orders, prescriptions,
          and savings.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit}
        >

          {/* EMAIL */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">
              Email
            </label>

            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-brand"
              placeholder="you@example.com"
            />
          </div>

          {/* PASSWORD */}

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
              placeholder="••••••••"
            />
          </div>

          {/* ERROR */}

          {error && (
            <p className="text-sm text-brand-error">
              {error}
            </p>
          )}

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            className="btn-primary w-full"
          >
            Login
          </button>

        </form>

        {/* LINKS */}

        <div className="mt-5 flex items-center justify-between text-sm">

          <Link
            to="/signup"
            className="text-brand-gold"
          >
            Create account
          </Link>

          <Link
            to="/reset-password"
            className="text-brand-muted"
          >
            Forgot password?
          </Link>

        </div>

      </div>
    </div>
  );
}
