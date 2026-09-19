import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="text-center">
        <h1 className="text-6xl font-black text-brand">404</h1>
        <p className="mt-3 text-lg text-brand-muted">This page could not be found.</p>
        <Link to="/" className="btn-primary mt-6">Return home</Link>
      </div>
    </div>
  );
}
