import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { fetchAdminAuditLogs, type AdminAuditLogRow } from '../api/adminAudit';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

function formatSummary(row: AdminAuditLogRow): string {
  const base = `${row.action} on ${row.targetType}${row.targetId ? `(${row.targetId})` : ''}`;
  const payload = row.payload as Record<string, unknown> | undefined;

  if (row.action === 'inventory_grant' && payload) {
    return `Granted cosmetic ${payload.itemId ?? ''} to ${payload.userId ?? ''}`;
  }
  if (row.action === 'wallet_credit' && payload) {
    return `Credited ${payload.amount ?? ''} soft to ${payload.userId ?? ''}`;
  }
  if (row.action === 'cosmetic_create' && payload) {
    return `Created cosmetic ${payload.code ?? ''} (${payload.title ?? ''})`;
  }
  if (row.action === 'offer_create' && payload) {
    return `Created offer ${payload.code ?? ''} for item ${payload.itemId ?? ''}`;
  }
  if (row.action === 'season_create' && payload) {
    return `Created season ${payload.code ?? ''} (${payload.name ?? ''})`;
  }
  if (row.action === 'season_reward_create' && payload) {
    return `Created reward level ${payload.level ?? ''} type ${payload.rewardType ?? ''}`;
  }

  return base;
}

export function AdminAuditLogSection() {
  const token = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<AdminAuditLogRow[]>([]);
  const [status, setStatus] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);

  const [adminFilter, setAdminFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setStatus('loading');
      setError(null);
      try {
        const data = await fetchAdminAuditLogs(token, { limit: 100 });
        if (!cancelled) {
          setRows(data);
          setStatus('loaded');
        }
      } catch {
        if (!cancelled) {
          setError('Не удалось загрузить журнал действий.');
          setStatus('error');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (adminFilter && !row.adminUserId.includes(adminFilter.trim())) return false;
      if (actionFilter && !row.action.includes(actionFilter.trim())) return false;
      if (
        targetFilter &&
        !`${row.targetType}${row.targetId ?? ''}`.toLowerCase().includes(targetFilter.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [rows, adminFilter, actionFilter, targetFilter]);

  if (!token) return null;

  return (
    <section className="space-y-3 mt-4" aria-label="Админ: журнал действий">
      <h2 className="text-sm font-semibold">Audit log</h2>
      <p className="text-xs text-gray-400">
        Журнал действий администраторов. Показывает, кто и что менял в магазине, сезонах и экономике.
      </p>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <label className="flex flex-col gap-0.5">
          <span>Admin userId</span>
          <input
            className="rounded bg-gray-800 px-2 py-1"
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span>Action</span>
          <input
            className="rounded bg-gray-800 px-2 py-1"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span>Target</span>
          <input
            className="rounded bg-gray-800 px-2 py-1"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            placeholder="например: Season / avatar_hat"
          />
        </label>
      </div>

      {status === 'loading' && <p className="text-xs text-gray-400">Загрузка журнала…</p>}
      {status === 'error' && error && <p className="text-xs text-red-400">{error}</p>}
      {status === 'loaded' && filtered.length === 0 && (
        <p className="text-xs text-gray-400">Записей не найдено (возможно, фильтр слишком строгий).</p>
      )}

      {filtered.length > 0 && (
        <div className="space-y-1 text-[11px]">
          {filtered.map((row) => (
            <div
              key={row.id}
              className="rounded bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {new Date(row.createdAt).toLocaleString()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-700 text-[10px]">
                      {row.action}
                    </span>
                    <span className="px-1.5 py-0.5 rounded border border-gray-600 text-[10px]">
                      {row.targetType}
                      {row.targetId ? `(${row.targetId})` : ''}
                    </span>
                    {!row.success && (
                      <span className="px-1.5 py-0.5 rounded bg-red-700 text-[10px]">
                        failed
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400">
                    actor: <span className="text-gray-200">{row.adminUserId}</span>
                    {row.reason && (
                      <>
                        {' '}
                        • reason:{' '}
                        <span className="text-gray-200">
                          {row.reason}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-gray-200">
                    summary: <span className="text-gray-100">{formatSummary(row)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-2 py-1 rounded bg-gray-700 text-[10px]"
                  onClick={() =>
                    setExpandedId((prev) => (prev === row.id ? null : row.id))
                  }
                >
                  {expandedId === row.id ? 'Скрыть детали' : 'Детали'}
                </button>
              </div>
              {expandedId === row.id && (
                <div className="mt-2 text-[10px] text-gray-300">
                  <div className="mb-1">
                    <span className="font-semibold">Payload JSON:</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-all bg-black/40 rounded px-2 py-1 max-h-48 overflow-auto">
                    {JSON.stringify(row.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

