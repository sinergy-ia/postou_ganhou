"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, Loader2, Percent, ShoppingBag, Timer } from "lucide-react";
import MetricCard from "@/components/sponsored-highlights/MetricCard";
import StatusBadge from "@/components/sponsored-highlights/StatusBadge";
import {
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/sponsored-highlights-utils";
import { sponsoredHighlightsApi } from "@/services/sponsored-highlights-api";

export default function SponsoredReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["sponsored-highlights", "reports"],
    queryFn: sponsoredHighlightsApi.getReports,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Receita total"
          value={formatCurrency(data.summary.totalRevenue)}
          helper="Faturamento consolidado do modulo patrocinado."
          icon={DollarSign}
          tone="primary"
        />
        <MetricCard
          label="Ticket medio"
          value={formatCurrency(data.summary.averageTicket)}
          helper="Valor medio investido por campanha patrocinada."
          icon={ShoppingBag}
          tone="emerald"
        />
        <MetricCard
          label="CTR medio"
          value={formatPercent(data.summary.ctrAverage)}
          helper="Taxa de clique simulada com base nos formatos vendidos."
          icon={Percent}
          tone="blue"
        />
        <MetricCard
          label="Campanhas vencendo"
          value={String(data.summary.expiringSoon)}
          helper="Contratos com oportunidade de renovacao no curto prazo."
          icon={Timer}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Receita por formato
            </h2>
            <p className="text-sm text-slate-500">
              Compare os formatos com maior poder de monetizacao.
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByFormat} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="revenue" fill="#9333ea" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Receita por periodo
            </h2>
            <p className="text-sm text-slate-500">
              Acompanhe a tendencia comercial das vendas patrocinadas.
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueByPeriod} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0f172a"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#0f172a" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Ticket medio por estabelecimento
              </h2>
              <p className="text-sm text-slate-500">
                Quem concentra maior investimento patrocinado.
              </p>
            </div>
            <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-700">
              Ocupacao media consolidada:{" "}
              <span className="font-semibold">
                {formatPercent(data.summary.averageOccupancy)}
              </span>
              .
            </div>
          </div>

          <div className="space-y-4">
            {data.averageTicketByEstablishment.map((item) => (
              <div
                key={item.establishmentId}
                className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">
                    {item.campaigns} campanhas • receita {formatCurrency(item.totalRevenue)}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Ticket medio
                  </p>
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(item.averageTicket)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Campanhas vencendo em breve
            </h2>
            <p className="text-sm text-slate-500">
              Priorize este pipeline de renovacao.
            </p>
          </div>

          <div className="space-y-4">
            {data.campaignsExpiringSoon.map((campaign) => (
              <div
                key={campaign.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {campaign.internalTitle}
                    </p>
                    <p className="text-sm text-slate-500">
                      {campaign.establishmentName}
                    </p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Encerra em {formatDate(campaign.endDate)}</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(campaign.finalPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
