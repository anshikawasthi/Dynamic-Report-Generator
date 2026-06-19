"use client";

import type { ReportMeta, UniversalContract } from "@/lib/types";
import ExportButtons from "@/components/export/ExportButtons";
import { Building2, MessageSquare, Share2 } from "lucide-react";
import { useState } from "react";

interface Props {
  meta: ReportMeta;
  contract: UniversalContract;
  onOpenChat: () => void;
}

export default function DashboardHeader({ meta, contract, onOpenChat }: Props) {
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{meta.title}</h1>
              <button
                onClick={handleShare}
                title="Share link"
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {shareCopied && (
                <span className="text-xs text-green-600 font-medium">Link copied!</span>
              )}
            </div>

            {/* Contract badge */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span>Service Contract</span>
              <span className="font-medium text-gray-700">{meta.serviceName ?? "Prema Premier Service"}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium border border-yellow-200">
                {meta.contractTier}
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">{meta.customerName}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenChat}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Ask AI
            </button>
            <ExportButtons contract={contract} />
          </div>
        </div>
      </div>
    </header>
  );
}
