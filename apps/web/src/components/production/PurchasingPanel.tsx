/**
 * Phase 16 — Purchasing Recommendation Panel.
 */

import React from 'react';
import type { PurchasingRecommendation } from '../../shared/api/production';

const STATUS_CONFIG = {
  sufficient: { label: 'Sufficient', color: 'text-green-700 bg-green-50 border-green-200' },
  exact: { label: 'Exact', color: 'text-green-700 bg-green-50 border-green-200' },
  excess: { label: 'Excess', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  insufficient: { label: 'Insufficient — Purchase Required', color: 'text-red-700 bg-red-50 border-red-200' },
  unknown: { label: 'Inventory Unknown', color: 'text-amber-700 bg-amber-50 border-amber-200' },
};

export default function PurchasingPanel({ rec }: { rec: PurchasingRecommendation }) {
  const config = STATUS_CONFIG[rec.status];
  return (
    <section aria-label="Purchasing recommendation" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Purchasing Recommendation</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${config.color}`}>
          {config.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Metric label="FABRIC REQUIRED" value={`${rec.requiredCm} cm`} sub={`${(rec.requiredCm / 100).toFixed(2)} m`} highlight />
        {rec.availableCm != null && (
          <Metric label="Available" value={`${rec.availableCm} cm`} sub={`${(rec.availableCm / 100).toFixed(2)} m`} />
        )}
        {rec.shortageCm != null && (
          <Metric label="Shortage" value={`${rec.shortageCm} cm`} sub={`${(rec.shortageCm / 100).toFixed(2)} m`} warn />
        )}
        {rec.excessCm != null && (
          <Metric label="Excess" value={`${rec.excessCm} cm`} sub={`${(rec.excessCm / 100).toFixed(2)} m`} />
        )}
      </div>

      {rec.recommendedPurchaseCm != null && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">RECOMMENDED PURCHASE</p>
          <p className="text-2xl font-bold text-indigo-900 mt-1">
            {rec.recommendedPurchaseMeters?.toFixed(2)} m
            <span className="text-base font-medium text-indigo-600 ml-2">
              ({rec.recommendedPurchaseYards?.toFixed(2)} yd · {rec.recommendedPurchaseCm} cm)
            </span>
          </p>
          {rec.purchaseRoundingReason && (
            <p className="text-xs text-indigo-600 mt-1">{rec.purchaseRoundingReason}</p>
          )}
        </div>
      )}

      {rec.estimatedCost != null ? (
        <p className="text-sm text-gray-700">
          Estimated cost: <strong>{rec.currency ? `${rec.currency} ` : ''}{rec.estimatedCost.toFixed(2)}</strong>
        </p>
      ) : (
        <p className="text-xs text-gray-500">Cost unavailable. Fabric price has not been provided.</p>
      )}

      {rec.reasons.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-0.5">
          {rec.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      {rec.assumptions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2 space-y-0.5">
          {rec.assumptions.map((a, i) => (
            <p key={i} className="text-xs text-amber-800">{a}</p>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, sub, highlight, warn }: { label: string; value: string; sub?: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'bg-indigo-50 border-indigo-200' : warn ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${highlight ? 'text-indigo-700' : warn ? 'text-red-700' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-base font-bold mt-1 ${highlight ? 'text-indigo-900' : warn ? 'text-red-900' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
