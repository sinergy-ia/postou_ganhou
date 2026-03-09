"use client";

import { useQuery } from "@tanstack/react-query";
import { establishmentApi } from "@/services/establishment-api";
import { Activity, Loader2, Megaphone, Ticket, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function DashboardPage() {
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: establishmentApi.getMetrics,
  });

  const { data: chartData, isLoading: isLoadingCharts } = useQuery({
    queryKey: ["dashboard-charts"],
    queryFn: () => establishmentApi.getCharts(),
  });

  const { data: participationsRes, isLoading: isLoadingParticipation } = useQuery({
    queryKey: ["dashboard-recent-posts"],
    queryFn: () => establishmentApi.getParticipations({ limit: 4 }),
  });

  const { data: insightsData, isLoading: isLoadingInsights } = useQuery({
    queryKey: ["dashboard-insights"],
    queryFn: establishmentApi.getAnalyticsInsights,
  });

  const recentActivity: Array<Record<string, any>> = participationsRes?.items || [];
  const highlightCard = insightsData?.cards?.[0] || null;

  if (isLoadingMetrics || isLoadingCharts || isLoadingParticipation || isLoadingInsights) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="font-heading font-bold text-3xl text-slate-900">Visão Geral</h1>
        <p className="text-slate-500 mt-1">Acompanhe o desempenho das suas campanhas em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
           { label: 'Campanhas Ativas', value: metrics?.activeCampaigns || 0, icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-100' },
           { label: 'Total de Postagens', value: metrics?.totalPosts || 0, icon: Activity, color: 'text-primary-600', bg: 'bg-primary-100' },
           { label: 'Cupons Emitidos', value: metrics?.couponsIssued || 0, icon: Ticket, color: 'text-green-600', bg: 'bg-green-100' },
           { label: 'Cupons Resgatados', value: metrics?.couponsRedeemed || 0, icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shrink-0`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="text-slate-500 text-sm font-bold mb-1">{stat.label}</div>
            <div className="font-black text-3xl text-slate-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-heading font-bold text-xl text-slate-900">Evolução do Período</h2>
              <p className="text-xs text-slate-500">Postagens vs. Cupons Resgatados</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResgates" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="posts" name="Postagens" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorPosts)" />
                <Area type="monotone" dataKey="resgates" name="Resgates" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorResgates)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-xl text-slate-900">Em Destaque</h2>
          </div>

          {highlightCard ? (
            <div className="flex-1 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 -m-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

              <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur border border-white/20 rounded-full text-xs font-bold self-start mb-6 shadow-sm">
                Insight principal
              </div>
              <h3 className="font-bold text-2xl leading-tight drop-shadow-md mb-2">
                {highlightCard.title}
              </h3>
              <p className="text-primary-100 text-sm mb-6 drop-shadow-sm">
                {highlightCard.description}
              </p>

              <div className="mt-auto rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-primary-100 backdrop-blur-sm">
                Os insights abaixo são gerados diretamente a partir das postagens, aprovações e resgates do estabelecimento.
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 mb-3 shadow-sm">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm mb-1">Aguardando dados</h3>
              <p className="text-slate-500 text-xs">Crie campanhas e aprove postagens para ver os destaques aqui.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-heading font-bold text-xl text-slate-900">Atividades Recentes</h2>
          <span className="text-sm font-bold text-primary-600">
            {recentActivity.length} itens
          </span>
        </div>

        <div className="p-2 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase rounded-xl">
                <tr>
                  <th className="px-6 py-4 font-semibold rounded-tl-xl rounded-bl-xl">Cliente</th>
                  <th className="px-6 py-4 font-semibold">Postagem</th>
                  <th className="px-6 py-4 font-semibold">Campanha</th>
                  <th className="px-6 py-4 font-semibold text-right rounded-tr-xl rounded-br-xl">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((post) => (
                  <tr key={post.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img src={post.userAvatar} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
                        <div>
                          <div className="font-bold text-slate-900">{post.userName}</div>
                          <div className="text-xs text-slate-500">{post.userHandle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          <img src={post.imageUrl} className="w-full h-full object-cover" alt="Post thumbnail" />
                        </div>
                        <div className="text-xs text-slate-500">
                          {post.type.charAt(0).toUpperCase() + post.type.slice(1)} • {post.likes} likes
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      <span className="max-w-[150px] truncate block" title={post.campaign?.title || post.discountEarned}>
                        {post.campaign?.title || post.discountEarned}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {post.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 font-bold border border-green-200 rounded-full text-xs">
                           Aprovado
                        </span>
                      )}
                      {post.status === 'redeemed' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 font-bold border border-slate-200 rounded-full text-xs">
                           Resgatado
                        </span>
                      )}
                      {post.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 font-bold border border-yellow-200 rounded-full text-xs">
                           Pendente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
