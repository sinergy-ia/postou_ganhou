"use client";

import { getCampaignStatusLabel } from "@/lib/sponsored-highlights-utils";
import type { SponsoredCampaignStatus } from "@/services/sponsored-highlights-api";

const statusMap: Record<
  SponsoredCampaignStatus,
  { className: string; dotClassName: string }
> = {
  active: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-500",
  },
  scheduled: {
    className: "border-blue-200 bg-blue-50 text-blue-700",
    dotClassName: "bg-blue-500",
  },
  paused: {
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dotClassName: "bg-amber-500",
  },
  ended: {
    className: "border-slate-200 bg-slate-100 text-slate-700",
    dotClassName: "bg-slate-500",
  },
  cancelled: {
    className: "border-rose-200 bg-rose-50 text-rose-700",
    dotClassName: "bg-rose-500",
  },
  expired: {
    className: "border-orange-200 bg-orange-50 text-orange-700",
    dotClassName: "bg-orange-500",
  },
  pending_payment: {
    className: "border-violet-200 bg-violet-50 text-violet-700",
    dotClassName: "bg-violet-500",
  },
};

interface StatusBadgeProps {
  status: SponsoredCampaignStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const theme = statusMap[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${theme.className}`}
    >
      <span className={`h-2 w-2 rounded-full ${theme.dotClassName}`} />
      {getCampaignStatusLabel(status)}
    </span>
  );
}
