"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import FeatureUpgradeNotice from "@/components/dashboard/FeatureUpgradeNotice";
import { establishmentApi } from "@/services/establishment-api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Heart, Loader2, Target, TrendingUp } from "lucide-react";

interface InsightCard {
  title?: string;
  description?: string;
}

export default function ResultadosPage() {
  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });
  const canAccessAdvancedAnalytics = Boolean(
    me?.planAccess?.features?.advancedAnalytics,
  );

  const { data: chartData, isLoading: isLoadingCharts } = useQuery({
    queryKey: ["dashboard-charts"],
    queryFn: () => establishmentApi.getCharts(),
    enabled: canAccessAdvancedAnalytics,
  });

  const { data: roiData, isLoading: isLoadingRoi } = useQuery({
    queryKey: ["analytics-roi"],
    queryFn: () => establishmentApi.getAnalyticsRoi(),
    enabled: canAccessAdvancedAnalytics,
  });

  const { data: conversionData } = useQuery({
    queryKey: ["analytics-conversion"],
    queryFn: () => establishmentApi.getAnalyticsConversion(),
    enabled: canAccessAdvancedAnalytics,
  });

  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => establishmentApi.getMetrics(),
  });

  const { data: insightsData } = useQuery({
    queryKey: ["dashboard-insights"],
    queryFn: () => establishmentApi.getAnalyticsInsights(),
    enabled: canAccessAdvancedAnalytics,
  });

  if (isLoadingMe || (canAccessAdvancedAnalytics && (isLoadingCharts || isLoadingRoi))) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!canAccessAdvancedAnalytics) {
    return (
      <FeatureUpgradeNotice
        badge="Analytics avancado"
        title="Resultados completos disponiveis no plano Pro"
        description="ROI, conversao, insights automaticos e relatorios avancados ficam liberados a partir do plano Pro."
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-slate-900">Resultados e Analytics</h1>
        <p className="text-slate-500 mt-1">Dados detalhados para otimizar suas estratégias de recompensa.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-primary-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl shadow-primary-900/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 -m-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="flex gap-4 items-center mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-primary-100 text-sm font-medium">ROI Estimado</div>
              <div className="text-2xl font-black">{roiData?.roi || '0%'}</div>
            </div>
          </div>
          <p className="text-xs text-primary-200">
            Calculado a partir da relacao entre participacoes validadas e cupons efetivamente resgatados.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex gap-4 items-center mb-2">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 border border-green-100">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="text-slate-500 text-sm font-medium">Taxa de Conversão</div>
              <div className="text-3xl font-black text-slate-900">{conversionData?.rate || '0%'}</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Percentual de postagens aprovadas que geraram um resgate de cupom na loja.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex gap-4 items-center mb-2">
            <div className="w-12 h-12 bg-secondary-50 rounded-xl flex items-center justify-center text-secondary-600 border border-secondary-100">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <div className="text-slate-500 text-sm font-medium">Taxa de Aprovação</div>
              <div className="text-3xl font-black text-slate-900">
                {typeof conversionData?.approvalRate === "number"
                  ? `${conversionData.approvalRate}%`
                  : "0%"}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Percentual das postagens recebidas que passaram pela moderacao.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico 1 */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="font-heading font-bold text-xl text-slate-900 mb-6">Desempenho por Dia da Semana</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }}/>
                <Bar dataKey="posts" name="Postagens" fill="#9333ea" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resgates" name="Resgates" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h2 className="font-heading font-bold text-xl text-slate-900 mb-6">Insights Automáticos</h2>
          
          <div className="space-y-4 flex-1">
            {((insightsData?.cards || []) as InsightCard[]).map((card, index: number) => (
              <div
                key={`${card.title}-${index}`}
                className={`rounded-r-xl border-l-4 p-4 ${
                  index === 0
                    ? "border-primary-500 bg-primary-50"
                    : index === 1
                      ? "border-slate-500 bg-slate-50"
                      : "border-green-500 bg-green-50"
                }`}
              >
                <h4 className="text-sm font-bold text-slate-900 mb-1">{card.title}</h4>
                <p className="text-xs text-slate-600">{card.description}</p>
              </div>
            ))}

            <div className="bg-slate-50 border-l-4 border-slate-500 p-4 rounded-r-xl">
              <h4 className="font-bold text-slate-900 text-sm mb-1">Cupons Emitidos</h4>
              <p className="text-slate-600 text-xs">
                {metrics?.couponsIssued || 0} cupons foram gerados e {metrics?.couponsRedeemed || 0} ja foram resgatados.
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/resultados/clientes"
            className="mt-4 w-full py-3 bg-slate-900 text-white hover:bg-slate-800 transition-colors rounded-xl font-medium text-sm text-center"
          >
            Ver Relatório Completo de Clientes
          </Link>
        </div>
      </div>
    </div>
  );
}
