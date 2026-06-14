import { CheckCircle2, XCircle } from 'lucide-react';

export function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.type === 'error';
  const Icon = isError ? XCircle : CheckCircle2;

  return (
    <div className="fixed right-4 top-4 z-50 max-w-sm rounded-lg border border-line bg-white p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <Icon className={isError ? 'mt-0.5 text-coral' : 'mt-0.5 text-accent'} size={20} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{toast.title}</p>
          {toast.message && <p className="mt-1 text-sm text-slate-600">{toast.message}</p>}
        </div>
        <button className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-violet-50" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export function useToastState(useStateHook) {
  const [toast, setToast] = useStateHook(null);

  function showToast(nextToast) {
    setToast(nextToast);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), 3500);
  }

  return { toast, showToast, clearToast: () => setToast(null) };
}
