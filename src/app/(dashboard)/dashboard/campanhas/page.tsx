"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Edit2,
  Filter,
  Loader2,
  Pause,
  Play,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FeatureUpgradeNotice from "@/components/dashboard/FeatureUpgradeNotice";
import { establishmentApi } from "@/services/establishment-api";

export default function CampanhasPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Todas");
  const [search, setSearch] = useState("");
  const tabs = ["Todas", "Ativas", "Agendadas", "Encerradas"];
  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });
  const canManageCampaigns = (me?.currentUser?.role || "owner") !== "viewer";

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", search],
    queryFn: () =>
      establishmentApi.getCampaigns({
        search: search || undefined,
      }),
  });

  const campaigns: Array<Record<string, any>> = (data?.items || []).filter((promo: any) => {
    if (activeTab === "Ativas") {
      return promo.status === "active";
    }

    if (activeTab === "Agendadas") {
      return promo.status === "scheduled" || promo.status === "paused";
    }

    if (activeTab === "Encerradas") {
      return promo.status === "ended";
    }

    return true;
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      establishmentApi.updateCampaign(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err: any) => {
      alert(`Falha ao atualizar campanha no Backend: ${err?.response?.data?.message || err.message}`);
    },
  });

  if (isLoadingMe) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-3xl text-slate-900">Campanhas</h1>
          <p className="text-slate-500 mt-1">Gerencie suas promoções e crie novas ofertas.</p>
        </div>
        {canManageCampaigns ? (
          <Link href="/dashboard/campanhas/nova" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md shadow-primary-200 flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Nova Campanha
          </Link>
        ) : null}
      </div>

      {!canManageCampaigns ? (
        <FeatureUpgradeNotice
          badge="Perfil viewer"
          title="Seu acesso nesta área é somente leitura"
          description="Você pode acompanhar as campanhas do estabelecimento, mas apenas owner e manager podem criar, editar ou alterar status."
          ctaLabel="Entendi"
          ctaHref="/dashboard"
        />
      ) : null}

      {/* Filters and List */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {tabs.map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar campanha..."
                className="w-full md:w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 caret-primary-600 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table / List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase">
              <tr>
                <th className="px-6 py-4 font-semibold">Nome da Campanha</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold">Recompensas</th>
                <th className="px-6 py-4 font-semibold text-center">Participações</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr key="loading">
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr key="empty">
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-slate-500">Nenhuma campanha encontrada.</div>
                  </td>
                </tr>
              ) : (
                campaigns.map((promo: any, index: number) => (
                <tr key={promo.id || promo._id || index} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 mb-1">{promo.title}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      {promo.expiresAt
                        ? `Valida ate ${new Date(promo.expiresAt).toLocaleDateString("pt-BR")}`
                        : "Sem data limite"}
                    </div>
                    {promo.autoApproveParticipations ? (
                      <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 border border-emerald-200">
                        Autoaprovação ativa
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 font-medium rounded-md text-xs">
                      {promo.type === 'both' ? 'Story + Post' : promo.type === 'story' ? 'Story' : 'Post Feed'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-slate-700 text-xs font-medium bg-primary-50 px-2 py-1 rounded w-fit border border-primary-100">
                        <Tag className="w-3 h-3 text-primary-600" /> {promo.baseReward}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Base: {promo.baseLikesRequired ?? 0} likes
                      </div>
                      {promo.maxReward && (
                        <>
                          <div className="text-[10px] text-slate-500 max-w-[150px] truncate" title={promo.maxReward}>
                            Até {promo.maxReward}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Máxima: {promo.maxLikesRequired !== undefined ? `${promo.maxLikesRequired} likes` : 'sem meta'}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center justify-center">
                      <span className="font-bold text-slate-900 text-base">{promo.stats?.participants || 0}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 font-bold border rounded-full text-xs ${
                      promo.status === "active"
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : promo.status === "ended"
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          promo.status === "active"
                            ? "bg-green-500"
                            : promo.status === "ended"
                              ? "bg-slate-400"
                              : "bg-blue-500"
                        }`}
                      ></span>
                      {promo.status === "active"
                        ? "Ativa"
                        : promo.status === "ended"
                          ? "Encerrada"
                          : "Pausada"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-slate-400">
                      {canManageCampaigns ? (
                        <>
                          <Link href={`/dashboard/campanhas/nova?id=${promo.id || promo._id}`} className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => {
                              const idToUpdate = promo.id || promo._id;
                              if (idToUpdate) updateStatusMutation.mutate({ id: idToUpdate, isActive: !promo.isActive });
                            }} 
                            disabled={updateStatusMutation.isPending}
                            className="p-1.5 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors disabled:opacity-50" 
                            title={promo.isActive ? "Pausar" : "Reativar"}
                          >
                            {promo.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        
        {/* Empty State Mock for future use */}
        {/* <div className="p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
            <Megaphone className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-2">Nenhuma campanha encontrada</h3>
          <p className="text-slate-500 max-w-sm mb-6">Você ainda não criou campanhas ou não há resultados para o filtro atual.</p>
        </div> */}
      </div>

    </div>
  );
}
