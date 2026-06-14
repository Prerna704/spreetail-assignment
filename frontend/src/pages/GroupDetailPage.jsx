import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calculator, Download, FileUp, Pencil, Plus, Save, Trash2, UsersRound, X } from 'lucide-react';
import { api } from '../api/client.js';

const today = new Date().toISOString().slice(0, 10);

function getApiMessage(apiError, fallback) {
  return apiError.response?.data?.message || fallback;
}

function formatDateOnly(value) {
  if (!value) return 'active';
  return new Date(value).toLocaleDateString('en-CA');
}

function filenameFromDisposition(disposition, fallback) {
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [balances, setBalances] = useState(null);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('expenses');
  const [memberForm, setMemberForm] = useState({ email: '', joinDate: today, leaveDate: today });
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', baseCurrency: 'INR' });
  const [error, setError] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'General',
    amount: '',
    currency: 'INR',
    expenseDate: today,
    paidBy: '',
    splitType: 'EQUAL',
    participants: []
  });
  const [settlementForm, setSettlementForm] = useState({
    payerId: '',
    receiverId: '',
    amount: '',
    currency: 'INR',
    settlementDate: today,
    note: ''
  });

  const activeMembers = useMemo(
    () => members.filter((member) => !member.leave_date || new Date(member.leave_date) >= new Date(today)),
    [members]
  );

  const loadAll = useCallback(async () => {
    const [groupResponse, expensesResponse, settlementsResponse, balancesResponse] = await Promise.all([
      api.get(`/groups/${groupId}`),
      api.get(`/groups/${groupId}/expenses`),
      api.get(`/groups/${groupId}/settlements`),
      api.get(`/groups/${groupId}/balances`)
    ]);
    setGroup(groupResponse.data.group);
    setGroupForm({ name: groupResponse.data.group.name, baseCurrency: groupResponse.data.group.base_currency });
    setMembers(groupResponse.data.members);
    setExpenses(expensesResponse.data.expenses);
    setSettlements(settlementsResponse.data.settlements);
    setBalances(balancesResponse.data.balances);
    setExpenseForm((current) => ({
      ...current,
      currency: groupResponse.data.group.base_currency,
      paidBy: groupResponse.data.members[0]?.user_id || '',
      participants: groupResponse.data.members.map((member) => ({ userId: member.user_id }))
    }));
    setSettlementForm((current) => ({
      ...current,
      currency: groupResponse.data.group.base_currency,
      payerId: groupResponse.data.members[0]?.user_id || '',
      receiverId: groupResponse.data.members[1]?.user_id || ''
    }));
  }, [groupId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function participantValue(userId, field) {
    return expenseForm.participants.find((participant) => participant.userId === userId)?.[field] || '';
  }

  function setParticipant(userId, patch) {
    setExpenseForm((current) => {
      const exists = current.participants.some((participant) => participant.userId === userId);
      const participants = exists
        ? current.participants.map((participant) => (participant.userId === userId ? { ...participant, ...patch } : participant))
        : [...current.participants, { userId, ...patch }];
      return { ...current, participants };
    });
  }

  async function updateGroup(event) {
    event.preventDefault();
    try {
      await api.patch(`/groups/${groupId}`, groupForm);
      setEditingGroup(false);
      await loadAll();
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not update group'));
    }
  }

  async function deleteGroup() {
    const confirmed = window.confirm('Delete this group?');
    if (!confirmed) return;
    try {
      await api.delete(`/groups/${groupId}`);
      navigate('/');
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not delete group'));
    }
  }

  async function addMember(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post(`/groups/${groupId}/members`, { email: memberForm.email, joinDate: memberForm.joinDate });
      setMemberForm({ ...memberForm, email: '' });
      await loadAll();
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not add member'));
    }
  }

  async function removeMember(member) {
    setError('');
    try {
      await api.delete(`/groups/${groupId}/members`, { data: { email: member.email, leaveDate: memberForm.leaveDate } });
      await loadAll();
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not remove member'));
    }
  }

  async function submitExpense(event) {
    event.preventDefault();
    setError('');
    try {
      const participants = expenseForm.participants.filter((participant) => participant.userId);
      await api.post(`/groups/${groupId}/expenses`, { ...expenseForm, amount: Number(expenseForm.amount), participants });
      setExpenseForm({ ...expenseForm, description: '', amount: '' });
      await loadAll();
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not add expense'));
    }
  }

  async function deleteExpense(expenseId) {
    setError('');
    try {
      await api.delete(`/expenses/${expenseId}`);
      await loadAll();
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not delete expense'));
    }
  }

  async function submitSettlement(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post(`/groups/${groupId}/settlements`, { ...settlementForm, amount: Number(settlementForm.amount) });
      setSettlementForm({ ...settlementForm, amount: '', note: '' });
      await loadAll();
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not record settlement'));
    }
  }

  async function uploadCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/groups/${groupId}/imports/csv`, formData);
      setReport(data.report);
      setActiveTab('import');
      await loadAll();
    } catch (apiError) {
      setActiveTab('import');
      setError(getApiMessage(apiError, 'Could not upload CSV'));
    } finally {
      event.target.value = '';
    }
  }

  async function downloadCsv(path, fallbackFilename) {
    setError('');
    try {
      const response = await api.get(path, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filenameFromDisposition(response.headers['content-disposition'], fallbackFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not download CSV'));
    }
  }

  if (!group) {
    return <div className="text-sm text-slate-600">Loading group...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-[280px] flex-1">
          {editingGroup ? (
            <form className="grid gap-2 md:grid-cols-[1fr_120px_auto_auto]" onSubmit={updateGroup}>
              <input value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} />
              <select value={groupForm.baseCurrency} onChange={(event) => setGroupForm({ ...groupForm, baseCurrency: event.target.value })}>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
              <button className="btn-primary">
                <Save size={16} />
                Save
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditingGroup(false)}>
                <X size={16} />
                Cancel
              </button>
            </form>
          ) : (
            <>
              <p className="eyebrow">Group ledger</p>
              <h1 className="mt-1 text-2xl font-semibold text-ink">{group.name}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="badge">Base currency {group.base_currency}</span>
                <span className="badge">{members.length} members</span>
                <span className="badge">{activeMembers.length} active</span>
              </div>
            </>
          )}
          {error && <p className="alert-error mt-3">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setEditingGroup(true)}>
            <Pencil size={16} />
            Edit group
          </button>
          <button className="btn-secondary text-coral" onClick={deleteGroup}>
            <Trash2 size={16} />
            Delete group
          </button>
          <label className="btn-secondary cursor-pointer" title="Upload CSV file">
            <FileUp size={16} />
            Upload CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={uploadCsv} />
          </label>
          <button className="btn-secondary" onClick={() => downloadCsv(`/groups/${groupId}/expenses/export.csv`, 'expenses_export.csv')}>
            <Download size={16} />
            Export expenses
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="panel p-4">
            <div className="flex items-center gap-2">
              <UsersRound size={17} className="text-accent" />
              <h2 className="font-semibold">Members</h2>
            </div>
            <form className="mt-3 space-y-2" onSubmit={addMember}>
              <input placeholder="Registered member email" type="email" value={memberForm.email} onChange={(event) => setMemberForm({ ...memberForm, email: event.target.value })} />
              <input type="date" value={memberForm.joinDate} onChange={(event) => setMemberForm({ ...memberForm, joinDate: event.target.value })} />
              <button className="btn-primary">
                <Plus size={16} />
                Add member
              </button>
            </form>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Leave date for removal</span>
              <input type="date" value={memberForm.leaveDate} onChange={(event) => setMemberForm({ ...memberForm, leaveDate: event.target.value })} />
            </label>
            <div className="mt-3 divide-y divide-line">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{member.name}</p>
                      <span className={member.leave_date ? 'badge text-slate-500' : 'badge border-violet-200 bg-violet-50 text-accent'}>
                        {member.leave_date ? 'inactive' : 'active'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{member.email}</p>
                    <p className="text-xs text-slate-500">{formatDateOnly(member.join_date)} to {formatDateOnly(member.leave_date)}</p>
                  </div>
                  <button className="btn-secondary px-2" onClick={() => removeMember(member)} title="Set leave date">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Calculator size={17} className="text-accent" />
              Balance summary
            </h2>
            <div className="mt-3 space-y-2">
              {balances?.summary.map((row) => (
                <div key={row.userId} className="flex justify-between rounded-md bg-violet-50 px-3 py-2 text-sm">
                  <span>{row.name}</span>
                  <span className={row.netAmount >= 0 ? 'text-accent' : 'text-coral'}>
                    {row.netAmount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="panel overflow-hidden">
          <div className="flex flex-wrap gap-2 border-b border-line bg-violet-50 p-3">
            {['expenses', 'settlements', 'balances', 'import'].map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? 'bg-accent px-3 py-2 text-white shadow-sm' : 'bg-white px-3 py-2 text-slate-700 hover:bg-violet-100'}
                onClick={() => setActiveTab(tab)}
              >
                {tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {error && <div className="border-b border-line p-3"><p className="alert-error">{error}</p></div>}

          {activeTab === 'expenses' && (
            <div className="grid gap-5 p-4 xl:grid-cols-[360px_1fr]">
              <form className="space-y-3" onSubmit={submitExpense}>
                <input placeholder="Description" value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} />
                <input placeholder="Category" value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Amount" type="number" min="0" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} />
                  <select value={expenseForm.currency} onChange={(event) => setExpenseForm({ ...expenseForm, currency: event.target.value })}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <input type="date" value={expenseForm.expenseDate} onChange={(event) => setExpenseForm({ ...expenseForm, expenseDate: event.target.value })} />
                <select value={expenseForm.paidBy} onChange={(event) => setExpenseForm({ ...expenseForm, paidBy: event.target.value })}>
                  {activeMembers.map((member) => <option key={member.id} value={member.user_id}>{member.name}</option>)}
                </select>
                <select value={expenseForm.splitType} onChange={(event) => setExpenseForm({ ...expenseForm, splitType: event.target.value })}>
                  <option value="EQUAL">Equal</option>
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="EXACT">Exact amount</option>
                </select>
                <div className="space-y-2">
                  {activeMembers.map((member) => (
                    <label key={member.id} className="grid grid-cols-[20px_1fr_90px] items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={expenseForm.participants.some((participant) => participant.userId === member.user_id)}
                        onChange={(event) => {
                          setExpenseForm((current) => ({
                            ...current,
                            participants: event.target.checked
                              ? [...current.participants, { userId: member.user_id }]
                              : current.participants.filter((participant) => participant.userId !== member.user_id)
                          }));
                        }}
                      />
                      <span>{member.name}</span>
                      {expenseForm.splitType !== 'EQUAL' && (
                        <input
                          type="number"
                          step="0.01"
                          placeholder={expenseForm.splitType === 'PERCENTAGE' ? '%' : group.base_currency}
                          value={participantValue(member.user_id, expenseForm.splitType === 'PERCENTAGE' ? 'percentage' : 'exactAmount')}
                          onChange={(event) =>
                            setParticipant(member.user_id, {
                              [expenseForm.splitType === 'PERCENTAGE' ? 'percentage' : 'exactAmount']: Number(event.target.value)
                            })
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
                <button className="btn-primary">Add expense</button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Expense</th>
                      <th className="p-3">Paid by</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="p-3">{expense.expense_date}</td>
                        <td className="p-3">{expense.description}</td>
                        <td className="p-3">{expense.paid_by_name}</td>
                        <td className="p-3">{expense.currency} {Number(expense.amount).toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <button className="btn-secondary px-2" onClick={() => deleteExpense(expense.id)}>
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settlements' && (
            <div className="grid gap-5 p-4 xl:grid-cols-[360px_1fr]">
              <form className="space-y-3" onSubmit={submitSettlement}>
                <select value={settlementForm.payerId} onChange={(event) => setSettlementForm({ ...settlementForm, payerId: event.target.value })}>
                  {activeMembers.map((member) => <option key={member.id} value={member.user_id}>{member.name}</option>)}
                </select>
                <select value={settlementForm.receiverId} onChange={(event) => setSettlementForm({ ...settlementForm, receiverId: event.target.value })}>
                  {activeMembers.map((member) => <option key={member.id} value={member.user_id}>{member.name}</option>)}
                </select>
                <input type="number" step="0.01" placeholder="Amount" value={settlementForm.amount} onChange={(event) => setSettlementForm({ ...settlementForm, amount: event.target.value })} />
                <input type="date" value={settlementForm.settlementDate} onChange={(event) => setSettlementForm({ ...settlementForm, settlementDate: event.target.value })} />
                <textarea placeholder="Note" value={settlementForm.note} onChange={(event) => setSettlementForm({ ...settlementForm, note: event.target.value })} />
                <button className="btn-primary">Record payment</button>
              </form>
              <div className="divide-y divide-line">
                {settlements.map((settlement) => (
                  <div key={settlement.id} className="p-3 text-sm">
                    <span className="font-medium">{settlement.payer_name}</span> paid <span className="font-medium">{settlement.receiver_name}</span> {settlement.currency} {Number(settlement.amount).toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'balances' && (
            <div className="grid gap-5 p-4 xl:grid-cols-2">
              <div className="rounded-lg border border-line p-4">
                <p className="eyebrow">Aisha's view</p>
                <h3 className="mt-1 font-semibold">Simplified debts</h3>
                <div className="mt-3 divide-y divide-line">
                  {balances?.simplifiedDebts.map((debt) => (
                    <div key={`${debt.fromUserId}-${debt.toUserId}-${debt.amount}`} className="py-3 text-sm">
                      <span className="font-medium">{debt.fromName}</span> owes <span className="font-medium">{debt.toName}</span> {group.base_currency} {debt.amount.toFixed(2)}
                    </div>
                  ))}
                  {!balances?.simplifiedDebts.length && <p className="muted py-3">No pending debts.</p>}
                </div>
              </div>
              <div className="rounded-lg border border-line p-4">
                <p className="eyebrow">Rohan's view</p>
                <h3 className="mt-1 font-semibold">Traceability</h3>
                <div className="mt-3 max-h-[460px] divide-y divide-line overflow-auto rounded-md bg-slate-950 px-3">
                  {balances?.trace.map((entry, index) => (
                    <pre key={`${entry.type}-${index}`} className="whitespace-pre-wrap py-3 text-xs text-slate-100">
                      {JSON.stringify(entry, null, 2)}
                    </pre>
                  ))}
                  {!balances?.trace.length && <p className="py-3 text-sm text-slate-300">No trace entries yet.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="p-4">
              {!report && (
                <label className="block cursor-pointer rounded-lg border border-dashed border-line bg-violet-50 p-8 text-center transition hover:border-accent hover:bg-violet-100/70">
                  <FileUp className="mx-auto text-slate-300" size={34} />
                  <p className="mt-3 font-medium text-ink">Upload expenses_export.csv</p>
                  <p className="muted mt-1">The import report will list anomalies, actions taken, skipped rows, and imported rows.</p>
                  <span className="btn-primary mt-4">Choose CSV file</span>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={uploadCsv} />
                </label>
              )}
              {report && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="eyebrow">Import report</p>
                      <h3 className="font-semibold text-ink">{report.filename}</h3>
                    </div>
                    <label className="btn-secondary cursor-pointer">
                      <FileUp size={16} />
                      Upload another CSV
                      <input type="file" accept=".csv,text/csv" className="hidden" onChange={uploadCsv} />
                    </label>
                    <button className="btn-secondary" onClick={() => downloadCsv(`/imports/${report.importId}/report.csv`, 'import_report.csv')}>
                      <Download size={16} />
                      Download report CSV
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Metric label="Rows imported" value={report.rowsImported} />
                    <Metric label="Rows skipped" value={report.rowsSkipped} />
                    <Metric label="Anomalies" value={report.anomalies.length} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="p-3">Row</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Message</th>
                          <th className="p-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {report.anomalies.map((anomaly, index) => (
                          <tr key={`${anomaly.rowNumber}-${anomaly.type}-${index}`}>
                            <td className="p-3">{anomaly.rowNumber}</td>
                            <td className="p-3 font-medium">{anomaly.type}</td>
                            <td className="p-3">{anomaly.message}</td>
                            <td className="p-3">{anomaly.actionTaken}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-violet-50 p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
