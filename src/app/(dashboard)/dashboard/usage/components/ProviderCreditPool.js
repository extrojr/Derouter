"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Badge from "@/shared/components/Badge";

function fmt(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("en-US");
}

function ProviderPoolCard({ p, expanded, onToggle }) {
  const healthy = p.accounts - p.failed;
  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-text-primary truncate">{p.name}</p>
          <p className="text-xs text-text-muted">
            {p.accounts} akun · {healthy} aktif{healthy !== p.accounts ? ` · ${p.failed} gagal dibaca` : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-text-primary leading-none">
            {p.unlimited ? "∞" : fmt(p.remaining)}
          </p>
          <p className="text-[11px] text-text-muted mt-1">sisa kredit</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {p.unlimited && <Badge variant="success">Unlimited</Badge>}
        {p.failed > 0 && <Badge variant="warning">{p.failed} akun bermasalah</Badge>}
        <button
          type="button"
          onClick={onToggle}
          className="text-xs text-primary hover:underline ml-auto"
        >
          {expanded ? "Sembunyikan rincian" : "Lihat rincian per akun"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border/50 pt-2 max-h-64 overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-text-muted">
              <tr>
                <th className="text-left font-medium py-1">Akun</th>
                <th className="text-left font-medium py-1">Plan</th>
                <th className="text-right font-medium py-1">Sisa</th>
              </tr>
            </thead>
            <tbody>
              {p.breakdown.map((a, i) => (
                <tr key={i} className="border-t border-border/30">
                  <td className="py-1 pr-2 truncate max-w-[180px]">{a.name}</td>
                  <td className="py-1 pr-2 text-text-muted truncate max-w-[120px]">{a.plan || "-"}</td>
                  <td className={`py-1 text-right ${a.ok ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                    {a.ok ? fmt(a.remaining) : "error"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function ProviderCreditPool() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/usage/pool", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-text-primary">Credits Pool</h2>
          <p className="text-xs text-text-muted">
            Total sisa kredit gabungan semua akun per provider
            {data?.updatedAt ? ` · update ${new Date(data.updatedAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
          {loading ? "Memuat…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <Card padding="md">
          <p className="text-sm text-red-500">Gagal memuat credits pool: {error}</p>
        </Card>
      )}

      {!error && loading && !data && (
        <Card padding="md"><p className="text-sm text-text-muted">Menghitung kredit…</p></Card>
      )}

      {!error && data && data.providers.length === 0 && (
        <Card padding="md"><p className="text-sm text-text-muted">Belum ada provider dengan quota yang bisa dibaca.</p></Card>
      )}

      {!error && data && data.providers.length > 0 && (
        <>
          <Card padding="md" className="bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <p className="font-medium text-text-primary">TOTAL SEMUA PROVIDER</p>
              <p className="text-2xl font-bold text-primary">{fmt(data.totalRemaining)}</p>
            </div>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.providers.map((p) => (
              <ProviderPoolCard
                key={p.id}
                p={p}
                expanded={!!expanded[p.id]}
                onToggle={() => setExpanded((e) => ({ ...e, [p.id]: !e[p.id] }))}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
