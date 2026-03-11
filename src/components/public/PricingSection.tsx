"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  CircleHelp,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { publicApi, type PublicPricingPlan } from "@/services/public-api";

type BillingCycle = "monthly" | "annual";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(Number(value || 0));
}

function resolveBadgeToneClass(plan: PublicPricingPlan) {
  switch (plan.badgeTone) {
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "primary":
      return "border-primary-200 bg-primary-50 text-primary-700";
    case "emerald":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function resolveDisplayedPrice(plan: PublicPricingPlan, billingCycle: BillingCycle) {
  if (billingCycle === "annual") {
    return {
      amount: plan.annualPrice,
      suffix: "/ano",
      helper:
        plan.annualPrice > 0
          ? `${formatCurrency(plan.monthlyEquivalentAnnual)} por mes no anual`
          : "Sem custo fixo",
    };
  }

  return {
    amount: plan.monthlyPrice,
    suffix: "/mes",
    helper:
      plan.monthlyPrice > 0
        ? "Comece mensal e evolua no seu ritmo"
        : "Entrada sem risco para validar a estrategia",
  };
}

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const { data, isLoading } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: publicApi.getPricing,
  });

  const plans = useMemo(() => data?.plans || [], [data?.plans]);

  if (isLoading) {
    return (
      <section id="planos" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        </div>
      </section>
    );
  }

  if (!data || plans.length === 0) {
    return null;
  }

  return (
    <section id="planos" className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-bold text-primary-700">
            <Sparkles className="h-4 w-4" />
            {data.sectionBadge}
          </div>
          <h2 className="font-heading text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            {data.sectionTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            {data.sectionSubtitle}
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {data.billingToggle.monthlyLabel}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                billingCycle === "annual"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {data.billingToggle.annualLabel}
            </button>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            {data.billingToggle.annualBadge}
            <span className="hidden text-emerald-600 sm:inline">
              • {data.billingToggle.annualHelper}
            </span>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 xl:grid-cols-4">
          {plans.map((plan) => {
            const price = resolveDisplayedPrice(plan, billingCycle);
            const isAnnual = billingCycle === "annual";
            const ctaHref = "/para-estabelecimentos#cadastro";

            return (
              <article
                key={plan.id}
                className={`group relative flex h-full flex-col overflow-visible rounded-[2rem] border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                  plan.isHighlighted
                    ? "border-primary-300 pt-8 ring-2 ring-primary-100 shadow-primary-100/80"
                    : "border-slate-200"
                }`}
              >
                {plan.isHighlighted && plan.highlightLabel ? (
                  <div className="absolute inset-x-6 top-0 z-10 -translate-y-1/2">
                    <div className="inline-flex whitespace-nowrap items-center rounded-full bg-primary-600 px-4 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary-300/50">
                      {plan.highlightLabel}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-2xl font-bold text-slate-900">
                      {plan.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {plan.shortDescription}
                    </p>
                  </div>
                  {plan.badge ? (
                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${resolveBadgeToneClass(
                        plan,
                      )}`}
                    >
                      {plan.badge}
                    </div>
                  ) : null}
                </div>

                <div className="mt-8">
                  <div className="flex items-end gap-2">
                    <span className="font-heading text-4xl font-black tracking-tight text-slate-900 transition-all duration-300 md:text-5xl">
                      {formatCurrency(price.amount)}
                    </span>
                    <span className="pb-2 text-sm font-semibold text-slate-500">
                      {price.suffix}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 transition-all duration-300">
                    {price.helper}
                  </p>
                  {isAnnual && plan.yearlySavings > 0 ? (
                    <div className="mt-3 inline-flex rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                      Economize {formatCurrency(plan.yearlySavings)} por ano
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    Taxa por cupom resgatado
                    <span title="Cobranca variavel aplicada apenas quando o cupom for realmente utilizado.">
                      <CircleHelp className="h-4 w-4 text-slate-400" />
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {formatCurrency(plan.redemptionFee)}
                  </p>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <Link
                    href={ctaHref}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all ${
                      plan.isHighlighted
                        ? "bg-primary-600 text-white shadow-lg shadow-primary-200 hover:bg-primary-700"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {plan.ctaLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-12 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <h3 className="font-heading text-2xl font-bold text-slate-900 md:text-3xl">
              {data.performanceFee.title}
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {data.performanceFee.description}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {data.performanceFee.items.map((item) => (
              <div
                key={item.planType}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center"
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {item.planName}
                </p>
                <p className="mt-3 font-heading text-3xl font-bold text-slate-900">
                  {formatCurrency(item.redemptionFee)}
                </p>
                <p className="mt-1 text-sm text-slate-500">por cupom resgatado</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-[2rem] border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-8 shadow-sm">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex rounded-full border border-primary-200 bg-white px-4 py-1.5 text-sm font-bold text-primary-700">
              {data.reinforcement.badge}
            </div>
            <h3 className="mt-5 font-heading text-3xl font-bold text-slate-900">
              {data.reinforcement.title}
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {data.reinforcement.description}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={data.reinforcement.primaryCtaHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-200 transition-colors hover:bg-primary-700"
              >
                {data.reinforcement.primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={data.reinforcement.secondaryCtaHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-700"
              >
                {data.reinforcement.secondaryCtaLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {data.trustPoints.map((item) => (
            <div
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="h-3.5 w-3.5" />
              </span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
