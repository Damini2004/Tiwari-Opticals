import { useState } from 'react';
import { storeAppointment } from '../services/storeService';

const initialForm = {
  name: '',
  phone: '',
  email: '',
  store: 'Wardha',
  date: '',
  service: 'Eye Test',
  notes: '',
};

export default function BookEyeTestPage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('');
    setSubmitting(true);
    try {
      await storeAppointment({ ...form, status: 'Pending' });
      setStatus('Appointment booked successfully. Our team will contact you soon.');
      setForm(initialForm);
    } catch (error) {
      console.error('Unable to book appointment', error);
      setStatus('We could not book your appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-shell py-10">
      <div className="mx-auto max-w-3xl card-surface p-8">
        <h1 className="text-4xl font-black">Book an eye test</h1>
        <p className="mt-3 text-brand-muted">Schedule a professional vision consultation at one of our stores.</p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Your name" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="+91 ..." required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Store</label>
            <select name="store" value={form.store} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3">
              <option>Wardha</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Date</label>
            <input name="date" type="date" value={form.date} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand">Service</label>
            <select name="service" value={form.service} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3">
              <option>Eye Test</option>
              <option>Frame Consultation</option>
              <option>Contact Lens Consultation</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-brand">Notes</label>
            <textarea name="notes" rows="4" value={form.notes} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Any special requirements?" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary w-full" disabled={submitting}>{submitting ? 'Booking…' : 'Book appointment'}</button>
          </div>
        </form>
        {status && <p className={`mt-4 text-sm ${status.startsWith('We could') ? 'text-brand-error' : 'text-brand-success'}`}>{status}</p>}
      </div>
    </div>
  );
}
