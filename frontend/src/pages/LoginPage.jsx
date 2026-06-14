import { ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await login(form);
      navigate('/');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Login failed');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <form onSubmit={submit} className="panel w-full max-w-md p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <ReceiptText size={22} />
          </span>
          <div>
            <p className="eyebrow">Flatmate ledger</p>
            <h1 className="text-xl font-semibold text-ink">Sign in</h1>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <input placeholder="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <input placeholder="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          {error && <p className="alert-error">{error}</p>}
          <button className="btn-primary w-full justify-center">Login</button>
        </div>
        <div className="mt-5 rounded-md border border-line bg-violet-50 p-3 text-sm text-slate-600">
          Demo: <span className="font-medium text-ink">aisha@example.com</span> / <span className="font-medium text-ink">password123</span>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          New here? <Link className="font-medium text-accent" to="/register">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
