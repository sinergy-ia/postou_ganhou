"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Clock3,
  DollarSign,
  LayoutGrid,
  Loader2,
  Megaphone,
  PanelTop,
  Percent,
} from "lucide-react";
import MetricCard from "@/components/sponsored-highlights/MetricCard";
import StatusBadge from "@/components/sponsored-highlights/StatusBadge";
import {
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/sponsored-highlights-utils";
import { sponsoredHighlightsApi } from "@/services/sponsored-highlights-api";

export default function SponsoredHighlightsOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["sponsored-highlights", "overview"],
    queryFn: sponsoredHighlightsApi.getOverview,
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Faturamento do mes"
          value={formatCurrency(data.metrics.monthRevenue)}
          helper="Receita contratada em campanhas iniciadas no periodo atual."
          icon={DollarSign}
          tone="primary"
        />
        <MetricCard
          label="Campanhas patrocinadas ativas"
          value={String(data.metrics.activeCampaigns)}
          helper="Campanhas rodando agora em home, listagem, mapa, busca e carrosseis."
          icon={Megaphone}
          tone="emerald"
        />
        <MetricCard
          label="Espacos disponiveis"
          value={String(data.metrics.availableSlots)}
          helper="Inventario imediato para novas vendas e upgrades de plano."
          icon={LayoutGrid}
          tone="blue"
        />
        <MetricCard
          label="Espacos ocupados"
          value={String(data.metrics.occupiedSlots)}
          helper="Slots ativos ou reservados por campanhas ja aprovadas."
          icon={PanelTop}
          tone="amber"
        />
        <MetricCard
          label="Taxa de ocupacao"
          value={formatPercent(data.metrics.occupancyRate)}
          helper="Media de preenchimento considerando todas as areas de exibicao."
          icon={Percent}
          tone="rose"
        />
        <MetricCard
          label="Proximos vencimentos"
          value={String(data.metrics.upcomingExpirations)}
          helper="Campanhas com encerramento previsto para os proximos 14 dias."
          icon={Clock3}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Receita por periodo
              </h2>
              <p className="text-sm text-slate-500">
                Evolucao dos contratos patrocinados fechados nos ultimos meses.
              </p>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              Meta premium em acompanhamento
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.revenueSeries}
                margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="sponsoredRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#9333ea"
                  strokeWidth={3}
                  fill="url(#sponsoredRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Ocupacao por area
            </h2>
            <p className="text-sm text-slate-500">
              Leitura rapida do inventario patrocinado disponivel.
            </p>
          </div>

          <div className="space-y-4">
            {data.occupancyByArea.map((area) => (
              <div
                key={area.area}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{area.label}</p>
                    <p className="text-xs text-slate-500">
                      {area.occupiedSlots} ocupados de {area.totalSlots} disponiveis
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {formatPercent(area.occupancyRate)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-violet-500"
                    style={{ width: `${Math.min(area.occupancyRate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Calendario das campanhas ativas
            </h2>
            <p className="text-sm text-slate-500">
              Visao dos proximos 14 dias por volume de campanhas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {data.calendar.map((day) => (
              <div
                key={day.date}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  {day.label}
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {day.activeCampaigns}
                </p>
                <p className="text-xs text-slate-500">campanhas</p>
                <div className="mt-4 space-y-1">
                  {day.campaigns.length > 0 ? (
                    day.campaigns.map((campaign) => (
                      <div
                        key={`${day.date}-${campaign}`}
                        className="truncate rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-slate-600"
                        title={campaign}
                      >
                        {campaign}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg bg-white px-2 py-1 text-[11px] text-slate-400">
                      Sem reserva
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Formatos mais vendidos
            </h2>
            <p className="text-sm text-slate-500">
              Receita consolidada por tipo de espaco patrocinado.
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topFormats} layout="vertical" margin={{ top: 10, right: 10, left: 40, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" horizontal={false} strokeDasharray="4 4" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={130}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="revenue" radius={[12, 12, 12, 12]} fill="#7e22ce" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Ranking de estabelecimentos
              </h2>
              <p className="text-sm text-slate-500">
                Quem mais compra destaque e concentra receita no modulo.
              </p>
            </div>
            <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-700">
              As colocacoes combinam receita acumulada, quantidade de contratos e campanhas ativas.
            </div>
          </div>

          <div className="space-y-4">
            {data.topEstablishments.map((establishment, index) => (
              <div
                key={establishment.establishmentId}
                className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{establishment.name}</p>
                    <p className="text-sm text-slate-500">
                      Plano {establishment.plan} • {establishment.campaigns} contratos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Receita
                    </p>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(establishment.totalRevenue)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-4 py-2 text-right text-emerald-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                      Ativas
                    </p>
                    <p className="font-semibold">{establishment.activeCampaigns}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Proximos vencimentos
            </h2>
            <p className="text-sm text-slate-500">
              Acompanhe renovacoes que exigem abordagem comercial.
            </p>
          </div>

          <div className="space-y-4">
            {data.expiringSoon.map((campaign) => (
              <div
                key={campaign.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{campaign.internalTitle}</p>
                    <p className="text-sm text-slate-500">
                      {campaign.establishmentName} • {campaign.formatName}
                    </p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Fim em {formatDate(campaign.endDate)}</span>
                  <span className="font-semibold text-slate-700">
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
