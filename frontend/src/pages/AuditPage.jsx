import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { api } from '../api/client.js';

export function AuditPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/audit-logs').then(({ data }) => setLogs(data.auditLogs));
  }, []);

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <ScrollText size={20} />
        </span>
        <div>
          <p className="eyebrow">System record</p>
          <h1 className="section-title">Audit trail</h1>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
              <th className="p-3">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="p-3">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-3">{log.actor_name || 'System'}</td>
                <td className="p-3"><span className="badge">{log.action}</span></td>
                <td className="p-3">{log.entity_type}</td>
                <td className="p-3 text-xs text-slate-600">{JSON.stringify(log.metadata)}</td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td className="p-6 text-center text-sm text-slate-600" colSpan="5">No audit activity yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
