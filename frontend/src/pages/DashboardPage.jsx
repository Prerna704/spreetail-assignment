import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, Pencil, Plus, RefreshCcw, Trash2, UsersRound, WalletCards, X } from 'lucide-react';
import { api } from '../api/client.js';
import { Toast, useToastState } from '../components/Toast.jsx';

export function DashboardPage() {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ name: '', baseCurrency: 'INR' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', baseCurrency: 'INR' });
  const [error, setError] = useState('');
  const { toast, showToast, clearToast } = useToastState(useState);

  async function loadGroups() {
    try {
      const { data } = await api.get('/groups');
      setGroups(data.groups);
      setError('');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Could not load groups');
      showToast({ type: 'error', title: 'Could not load groups', message: apiError.response?.data?.message });
    }
  }

  useEffect(() => {
    async function loadInitialGroups() {
      try {
        const { data } = await api.get('/groups');
        setGroups(data.groups);
        setError('');
      } catch (apiError) {
        setError(apiError.response?.data?.message || 'Could not load groups');
      }
    }

    loadInitialGroups();
  }, []);

  async function createGroup(event) {
    event.preventDefault();
    try {
      await api.post('/groups', form);
      setForm({ name: '', baseCurrency: 'INR' });
      showToast({ type: 'success', title: 'Group created' });
      await loadGroups();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Could not create group');
      showToast({ type: 'error', title: 'Group not created', message: apiError.response?.data?.message || 'Could not create group' });
    }
  }

  function startEdit(group) {
    setEditingId(group.id);
    setEditForm({ name: group.name, baseCurrency: group.base_currency });
  }

  async function saveEdit(groupId) {
    try {
      await api.patch(`/groups/${groupId}`, editForm);
      setEditingId(null);
      showToast({ type: 'success', title: 'Group updated' });
      await loadGroups();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Could not update group');
      showToast({ type: 'error', title: 'Group not updated', message: apiError.response?.data?.message || 'Could not update group' });
    }
  }

  async function deleteGroup(groupId) {
    const confirmed = window.confirm('Delete this group? Expenses stay audit-tracked but the group will be hidden.');
    if (!confirmed) return;
    try {
      await api.delete(`/groups/${groupId}`);
      showToast({ type: 'success', title: 'Group deleted' });
      await loadGroups();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Could not delete group');
      showToast({ type: 'error', title: 'Group not deleted', message: apiError.response?.data?.message || 'Could not delete group' });
    }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={clearToast} />
      <section className="panel overflow-hidden">
        <div className="grid gap-4 border-b border-line bg-white/90 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Shared expense groups</h1>
            <p className="muted mt-1">Track balances, imported rows, settlements, and audit history.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <SummaryTile icon={<UsersRound size={15} />} label="Groups" value={groups.length} />
            <SummaryTile icon={<WalletCards size={15} />} label="Currencies" value="INR/USD" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="panel p-5">
          <p className="eyebrow">New ledger</p>
          <h2 className="section-title mt-1">Create group</h2>
          <form className="mt-4 space-y-3" onSubmit={createGroup}>
            <input placeholder="Group name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <select value={form.baseCurrency} onChange={(event) => setForm({ ...form, baseCurrency: event.target.value })}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
            <button className="btn-primary">
              <Plus size={16} />
              Create
            </button>
          </form>
          {error && <p className="alert-error mt-4">{error}</p>}
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-4">
            <div>
              <p className="eyebrow">Active work</p>
              <h2 className="section-title">Groups</h2>
            </div>
            <button className="btn-secondary" onClick={loadGroups}>
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
          <div className="divide-y divide-line">
            {groups.map((group) => (
              <div key={group.id} className="grid gap-3 p-4 transition hover:bg-violet-50 md:grid-cols-[1fr_auto]">
                {editingId === group.id ? (
                  <div className="grid gap-2 md:grid-cols-[1fr_120px]">
                    <input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
                    <select value={editForm.baseCurrency} onChange={(event) => setEditForm({ ...editForm, baseCurrency: event.target.value })}>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-ink">{group.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="badge">{group.member_count} members</span>
                      <span className="badge">{group.base_currency}</span>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {editingId === group.id ? (
                    <>
                      <button className="btn-primary" onClick={() => saveEdit(group.id)}>
                        <Check size={16} />
                        Save
                      </button>
                      <button className="btn-secondary" onClick={() => setEditingId(null)}>
                        <X size={16} />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <Link className="btn-secondary" to={`/groups/${group.id}`}>
                        <ExternalLink size={16} />
                        Open
                      </Link>
                      <button className="btn-secondary" onClick={() => startEdit(group)}>
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button className="btn-secondary text-coral" onClick={() => deleteGroup(group.id)}>
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!groups.length && (
              <div className="p-8 text-center">
                <UsersRound className="mx-auto text-slate-300" size={34} />
                <p className="mt-3 font-medium text-ink">No groups yet</p>
                <p className="muted mt-1">Create the flatmates group to start tracking expenses.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryTile({ icon, label, value }) {
  return (
    <div className="min-w-28 rounded-lg border border-line bg-violet-50 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
