"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";

interface FeatureUpgradeNoticeProps {
  badge?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function FeatureUpgradeNotice({
  badge = "Upgrade de plano",
  title,
  description,
  ctaLabel = "Ver planos",
  ctaHref = "/para-estabelecimentos#planos",
}: FeatureUpgradeNoticeProps) {
  return (
    <div className="rounded-[2rem] border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-8 shadow-sm">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-1.5 text-sm font-bold text-primary-700 shadow-sm">
          <Sparkles className="h-4 w-4" />
          {badge}
        </div>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-300/60">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-3xl font-bold text-slate-900">{title}</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
        <div className="mt-8 flex justify-center">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-200 transition-colors hover:bg-primary-700"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
