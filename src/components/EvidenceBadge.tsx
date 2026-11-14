'use client';

import React from 'react';
import { CheckCircle2, MessageSquare, AlertTriangle, HelpCircle } from 'lucide-react';
import { FactStatus } from '@/types/crm';

interface EvidenceBadgeProps {
  status: FactStatus;
  sourceId?: string;
  className?: string;
  onClick?: () => void;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  status,
  sourceId,
  className = '',
  onClick,
}) => {
  const configs = {
    verified: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
      label: 'VERIFIED',
      icon: CheckCircle2,
      desc: 'Backed by file in records',
    },
    told: {
      bg: 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100',
      label: 'TOLD',
      icon: MessageSquare,
      desc: 'Stated by stakeholder',
    },
    claim: {
      bg: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100',
      label: 'CLAIM',
      icon: AlertTriangle,
      desc: 'Unbacked customer claim',
    },
    unknown: {
      bg: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100',
      label: 'UNKNOWN',
      icon: HelpCircle,
      desc: 'Not established in records',
    },
  };

  const current = configs[status] || configs.unknown;
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={`${current.label}: ${current.desc}${sourceId ? ` (ID: ${sourceId})` : ''}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase border transition-colors ${
        current.bg
      } ${onClick ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'} ${className}`}
    >
      <Icon className="w-3 h-3" />
      <span>{current.label}</span>
      {sourceId && (
        <span className="text-[10px] font-mono opacity-75 lowercase border-l pl-1 border-current">
          {sourceId.length > 14 ? sourceId.slice(0, 12) + '…' : sourceId}
        </span>
      )}
    </button>
  );
};
