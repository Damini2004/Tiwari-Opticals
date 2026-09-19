import { useState } from 'react';
import { storeContactMessage } from '../services/storeService';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  subject: 'Order support',
  message: '',
};

export default function ContactPage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    storeContactMessage(form);
    setStatus('Your message has been sent. We will reach out soon.');
    setForm(initialForm);
  };

  return (
    <div className="container-shell py-10">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card-surface p-8">
          <h1 className="text-4xl font-black">Contact us</h1>
          <p className="mt-3 text-brand-muted">We usually reply within 1 business day.</p>
          <div className="mt-6 space-y-4 text-sm text-brand-muted">
            <p>Call: <a href="tel:+919011886479" className="font-semibold text-brand">+91 90118 86479</a></p>
            <p>Visit: Malgujaripura, opposite Lohiya Hospital, Wardha</p>
          </div>
        </div>
        <form className="card-surface p-8" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Your name" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="+91 ..." required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand">Subject</label>
              <input name="subject" value={form.subject} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Order support" />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-brand">Message</label>
            <textarea name="message" rows="5" value={form.message} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Tell us how we can help" required />
          </div>
          <button type="submit" className="btn-primary mt-6">Send enquiry</button>
          {status && <p className="mt-4 text-sm text-brand-success">{status}</p>}
        </form>
      </div>
    </div>
  );
}
