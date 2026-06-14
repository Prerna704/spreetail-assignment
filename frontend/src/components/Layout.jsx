import { Link, NavLink, Outlet } from 'react-router-dom';
import { LogOut, ReceiptText, ScrollText, UsersRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-ink text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
  }`;

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-base font-semibold text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <ReceiptText size={20} />
            </span>
            <span>Shared Expenses</span>
          </Link>
          <nav className="flex items-center gap-2">
            <NavLink to="/" className={linkClass} end>
              <UsersRound size={16} />
              Groups
            </NavLink>
            <NavLink to="/audit" className={linkClass}>
              <ScrollText size={16} />
              Audit
            </NavLink>
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700 sm:inline-flex">{user?.name}</span>
            <button className="btn-secondary" onClick={logout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
