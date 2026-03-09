"use client";

import type { LucideIcon } from "lucide-react";

const toneMap = {
  primary: {
    icon: "bg-primary-100 text-primary-700",
    ring: "ring-primary-100",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700",
    ring: "ring-emerald-100",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    ring: "ring-amber-100",
  },
  blue: {
    icon: "bg-blue-100 text-blue-700",
    ring: "ring-blue-100",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700",
    ring: "ring-rose-100",
  },
  slate: {
    icon: "bg-slate-100 text-slate-700",
    ring: "ring-slate-100",
  },
} as const;

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: keyof typeof toneMap;
}

export default function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "primary",
}: MetricCardProps) {
  const palette = toneMap[tone];

  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ${palette.ring}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 font-heading text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${palette.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="text-sm text-slate-500">{helper || "Atualizado com base nas campanhas e slots do modulo."}</p>
    </div>
  );
}
