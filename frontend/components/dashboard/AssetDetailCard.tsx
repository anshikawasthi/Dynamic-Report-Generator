"use client";

import type { AtRiskAsset } from "@/lib/types";
import EditableLabel from "@/components/edit/EditableLabel";

interface Props {
  asset: AtRiskAsset;
}

// Risk score → color scale
function riskColor(score: number): { bar: string; text: string; ring: string } {
  if (score >= 80) return { bar: "bg-red-500",    text: "text-red-600",    ring: "ring-red-200" };
  if (score >= 65) return { bar: "bg-orange-400", text: "text-orange-600", ring: "ring-orange-200" };
  return              { bar: "bg-yellow-400",  text: "text-yellow-600", ring: "ring-yellow-200" };
}

const priorityBadge: Record<string, string> = {
  High:   "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low:    "bg-green-100 text-green-700",
};

const criticalityBadge: Record<string, string> = {
  "Tier 1": "bg-purple-100 text-purple-700",
  "Tier 2": "bg-blue-100 text-blue-700",
  "Tier 3": "bg-gray-100 text-gray-600",
};

export default function AssetDetailCard({ asset }: Props) {
  const colors = riskColor(asset.riskScore);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm ring-2 ${colors.ring} flex flex-col gap-4`}>

      {/* Header: name + badges */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">{asset.name}</h3>
          <span className="text-xs text-gray-400">{asset.assetType}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${criticalityBadge[asset.criticality] ?? "bg-gray-100 text-gray-600"}`}>
            {asset.criticality}
          </span>
          {asset.priority && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityBadge[asset.priority] ?? "bg-gray-100 text-gray-600"}`}>
              {asset.priority} priority
            </span>
          )}
        </div>
      </div>

      {/* Risk score: big number + bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-end justify-between">
          <span className="text-xs text-gray-400 uppercase tracking-wide"><EditableLabel originalText="Risk Score" className="text-gray-400 uppercase tracking-wide" /></span>
          <span className={`text-3xl font-bold ${colors.text}`}>{asset.riskScore}<span className="text-sm text-gray-400">/100</span></span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${colors.bar}`}
            style={{ width: `${asset.riskScore}%` }}
          />
        </div>
      </div>

      {/* Signal blocks */}
      {asset.signals.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 mr-1"><EditableLabel originalText="Signals" className="text-gray-400" /></span>
          {asset.signals.map((color, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className="text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1"><EditableLabel originalText="Recommendation" className="text-gray-400 uppercase tracking-wide" /></span>
        <EditableLabel
          originalText={`rec:${asset.id}`}
          defaultText={asset.recommendation}
          multiline
          className="text-gray-700 leading-relaxed"
        />
      </div>

      {/* Footer: savings + dates */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 border-t border-gray-100 pt-3">
        {asset.savingsEstimate && (
          <span>
            <span className="font-medium text-green-600">💰 {asset.savingsEstimate}</span>
          </span>
        )}
        {asset.lastServiceDate && (
          <span className="flex items-center gap-1"><EditableLabel originalText="Last service" className="text-gray-400" />: <span className="text-gray-600">{asset.lastServiceDate}</span></span>
        )}
        {asset.estimatedFailureWindow && (
          <span className="flex items-center gap-1"><EditableLabel originalText="Est. failure" className="text-gray-400" />: <span className="text-gray-600">{asset.estimatedFailureWindow}</span></span>
        )}
      </div>

    </div>
  );
}
