"use client";

import type { AtRiskAsset } from "@/lib/types";
import { AlertTriangle } from "lucide-react";
import EditableLabel from "@/components/edit/EditableLabel";

interface Props {
  assets: AtRiskAsset[];
}

const criticalityBadge: Record<AtRiskAsset["criticality"], string> = {
  "Tier 1": "bg-red-50 text-red-700 border-red-200",
  "Tier 2": "bg-orange-50 text-orange-700 border-orange-200",
  "Tier 3": "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const riskBarColor = (score: number) => {
  if (score >= 80) return "bg-red-500";
  if (score >= 65) return "bg-orange-400";
  return "bg-yellow-400";
};

export default function AtRiskTable({ assets }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-gray-900">At-Risk Assets</h3>
          <div className="flex items-center gap-1 ml-2">
            {(["All", "Tier 1", "Tier 2"] as const).map((f, i) => (
              <button
                key={f}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                  i === 0
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {f}
              </button>
            ))}
            <button className="px-2 py-0.5 text-gray-400 text-xs hover:text-gray-600">
              •••
            </button>
          </div>
        </div>
        <button className="text-sm text-blue-600 hover:underline font-medium">View All →</button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {(["Asset", "Type", "Criticality", "Risk", "Signal", "Recommendation"] as const).map((h) => (
                <th key={h} className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <EditableLabel originalText={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                {/* Asset */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-sm">
                      {asset.assetType === "HVAC" ? "❄️" : asset.assetType === "Controls" ? "🎛️" : "⚙️"}
                    </div>
                    <span className="font-medium text-gray-900">{asset.name}</span>
                  </div>
                </td>

                {/* Type */}
                <td className="py-3 px-4 text-gray-500 text-xs">{asset.assetType}</td>

                {/* Criticality */}
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${criticalityBadge[asset.criticality]}`}
                  >
                    {asset.criticality}
                  </span>
                </td>

                {/* Risk score + bar */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${riskBarColor(asset.riskScore)}`}
                        style={{ width: `${asset.riskScore}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gray-800 text-xs w-6">{asset.riskScore}</span>
                  </div>
                </td>

                {/* Signal blocks */}
                <td className="py-3 px-4">
                  <div className="flex gap-0.5">
                    {asset.signals.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-sm"
                        style={{ backgroundColor: color }}
                        title={`Signal ${i + 1}`}
                      />
                    ))}
                  </div>
                </td>

                {/* Recommendation */}
                <td className="py-3 px-4">
                  <p className="text-gray-700 text-xs max-w-xs leading-relaxed">
                    {asset.recommendation}
                  </p>
                  {asset.savingsEstimate && (
                    <p className="text-green-700 font-medium text-xs mt-0.5">
                      💰 {asset.savingsEstimate}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
