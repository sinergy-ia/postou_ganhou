"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import FeatureUpgradeNotice from "@/components/dashboard/FeatureUpgradeNotice";
import { Plus, Sparkles } from "lucide-react";
import ModuleTabs from "@/components/sponsored-highlights/ModuleTabs";
import { establishmentApi } from "@/services/establishment-api";

export default function SponsoredHighlightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: me, isLoading } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Sparkles className="h-6 w-6 animate-pulse text-primary-500" />
      </div>
    );
  }

  if (!me?.planAccess?.features?.sponsoredHighlights) {
    return (
      <FeatureUpgradeNotice
        badge="Destaques patrocinados"
        title="Este modulo esta disponivel a partir do plano Pro"
        description="Gerencie formatos, campanhas patrocinadas, slots e regras comerciais com um upgrade de plano."
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
            <Sparkles className="h-3.5 w-3.5" />
            Modulo comercial premium
          </div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">
            Destaques Patrocinados
          </h1>
          <p className="mt-2 text-slate-500">
            Gerencie formatos, campanhas, ocupacao de slots, regras de exibicao e
            previsoes de receita dos espacos patrocinados do SaaS.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/destaques-patrocinados/formatos"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            Gerenciar formatos
          </Link>
          <Link
            href="/dashboard/destaques-patrocinados/campanhas/nova"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-primary-200 transition-colors hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Nova campanha patrocinada
          </Link>
        </div>
      </div>

      <ModuleTabs />
      {children}
    </div>
  );
}
