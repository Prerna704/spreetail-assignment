import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Registration failed');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <form onSubmit={submit} className="panel w-full max-w-md p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <UserPlus size={22} />
          </span>
          <div>
            <p className="eyebrow">New flatmate</p>
            <h1 className="text-xl font-semibold text-ink">Create account</h1>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <input placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input placeholder="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <input placeholder="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          {error && <p className="alert-error">{error}</p>}
          <button className="btn-primary w-full justify-center">Register</button>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Already registered? <Link className="font-medium text-accent" to="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
