"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Edit2,
  Filter,
  Loader2,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FeatureUpgradeNotice from "@/components/dashboard/FeatureUpgradeNotice";
import { normalizeSponsoredHref } from "@/lib/sponsored-highlights-public";
import { establishmentApi } from "@/services/establishment-api";
import {
  sponsoredHighlightsApi,
  type SponsoredCampaign,
  type SponsoredCampaignStatus,
} from "@/services/sponsored-highlights-api";

interface RegularCampaign {
  id?: string;
  _id?: string;
  title?: string;
  expiresAt?: string;
  autoApproveParticipations?: boolean;
  type?: "story" | "post" | "both" | string;
  baseReward?: string;
  baseLikesRequired?: number;
  maxReward?: string;
  maxLikesRequired?: number;
  stats?: {
    participants?: number;
  };
  status?: "active" | "scheduled" | "paused" | "ended" | string;
  isActive?: boolean;
}

interface BoostStatusDescriptor {
  label: string;
  className: string;
  disabled: boolean;
}

function getCampaignErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function addDays(baseDate: Date, days: number) {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function pickDefaultSponsoredFormat(
  formats?: Array<{
    id: string;
    isActive: boolean;
    displayLocation: string;
    defaultDurationDays: number;
    suggestedPrice: number;
    renderPriority: number;
  }>,
) {
  const activeFormats = (formats || []).filter((item) => item.isActive);

  return (
    activeFormats.find((item) => item.displayLocation === "listing") ||
    activeFormats.find((item) => item.displayLocation === "home") ||
    activeFormats[0] ||
    null
  );
}

function extractOriginalCampaignId(campaign: SponsoredCampaign) {
  const landingPage = normalizeSponsoredHref(campaign.landingPage);
  const landingPageMatch = landingPage.match(/^\/promocoes\/([^/?#]+)/);

  if (landingPageMatch?.[1]) {
    return landingPageMatch[1];
  }

  const notesMatch = String(campaign.internalNotes || "").match(
    /Campaign ID original:\s*([^\n\r]+)/i,
  );

  return notesMatch?.[1]?.trim() || "";
}

function getBoostStatusDescriptor(status?: SponsoredCampaignStatus | null): BoostStatusDescriptor {
  switch (status) {
    case "pending_payment":
      return {
        label: "Aguardando aprovação",
        className: "border-amber-200 bg-amber-50 text-amber-700",
        disabled: true,
      };
    case "scheduled":
      return {
        label: "Aprovado",
        className: "border-blue-200 bg-blue-50 text-blue-700",
        disabled: true,
      };
    case "active":
      return {
        label: "Em execução",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        disabled: true,
      };
    case "paused":
      return {
        label: "Impulsionado pausado",
        className: "border-slate-200 bg-slate-100 text-slate-700",
        disabled: true,
      };
    default:
      return {
        label: "Impulsionar",
        className: "border-violet-200 bg-violet-50 text-violet-700",
        disabled: false,
      };
  }
}

export default function CampanhasPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Todas");
  const [search, setSearch] = useState("");
  const [boostFeedback, setBoostFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const tabs = ["Todas", "Ativas", "Agendadas", "Encerradas"];
  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });
  const canManageCampaigns = (me?.currentUser?.role || "owner") !== "viewer";

  const { data: sponsoredLookups } = useQuery({
    queryKey: ["sponsored-highlights", "boost-lookups"],
    queryFn: sponsoredHighlightsApi.getLookups,
    enabled: canManageCampaigns,
  });

  const { data: sponsoredRequestsData } = useQuery({
    queryKey: ["sponsored-highlights", "boost-requests", me?.id || me?._id || ""],
    queryFn: () => sponsoredHighlightsApi.getCampaigns({ limit: 100 }),
    enabled: canManageCampaigns && Boolean(me?.id || me?._id),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", search],
    queryFn: () =>
      establishmentApi.getCampaigns({
        search: search || undefined,
      }),
  });

  const campaigns: RegularCampaign[] = ((data?.items || []) as RegularCampaign[]).filter((promo) => {
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
  const sponsoredRequestsByCampaignId = useMemo(() => {
    const establishmentId = String(me?.id || me?._id || "");
    const items = (sponsoredRequestsData?.items || []).filter(
      (campaign) => campaign.establishmentId === establishmentId,
    );

    const statusPriority: Record<SponsoredCampaignStatus, number> = {
      active: 5,
      scheduled: 4,
      pending_payment: 3,
      paused: 2,
      ended: 1,
      cancelled: 1,
      expired: 1,
    };

    return items.reduce<Record<string, SponsoredCampaign>>((accumulator, campaign) => {
      const originalCampaignId = extractOriginalCampaignId(campaign);

      if (!originalCampaignId) {
        return accumulator;
      }

      const current = accumulator[originalCampaignId];

      if (
        !current ||
        statusPriority[campaign.status] > statusPriority[current.status]
      ) {
        accumulator[originalCampaignId] = campaign;
      }

      return accumulator;
    }, {});
  }, [me, sponsoredRequestsData]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      establishmentApi.updateCampaign(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (error) => {
      alert(
        `Falha ao atualizar campanha no Backend: ${getCampaignErrorMessage(
          error,
          "erro inesperado",
        )}`,
      );
    },
  });

  const requestBoostMutation = useMutation({
    mutationFn: async (promo: RegularCampaign) => {
      const establishmentId = String(me?.id || me?._id || "");
      const defaultFormat = pickDefaultSponsoredFormat(sponsoredLookups?.formats);

      if (!establishmentId) {
        throw new Error("Nao foi possivel identificar o estabelecimento para solicitar o impulsionamento.");
      }

      if (!defaultFormat) {
        throw new Error("Nao existe formato patrocinado ativo para registrar o pedido de impulsionamento.");
      }

      const campaignId = String(promo.id || promo._id || "");
      const startDate = new Date();
      const endDate = addDays(startDate, defaultFormat.defaultDurationDays || 7);

      return sponsoredHighlightsApi.createCampaign({
        establishmentId,
        formatId: defaultFormat.id,
        internalTitle: `Pedido de impulsionamento - ${String(promo.title || "Campanha")}`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        finalPrice: Number(defaultFormat.suggestedPrice || 0),
        saleOrigin: "self_service",
        internalNotes: [
          "Solicitacao criada pelo lojista na area de campanhas.",
          `Campanha original: ${String(promo.title || "Sem titulo")}`,
          `Campaign ID original: ${campaignId || "nao informado"}`,
        ].join("\n"),
        manualPriority: Number(defaultFormat.renderPriority || 80),
        cityRegion: String(me?.address || "Nao informado"),
        category: String(me?.category || "Sem categoria"),
        landingPage: normalizeSponsoredHref(campaignId ? `/promocoes/${campaignId}` : "/promocoes"),
        imageUrl: String(me?.coverUrl || me?.cover || ""),
        initialStatus: "pending_payment",
      });
    },
    onSuccess: () => {
      setBoostFeedback({
        type: "success",
        message:
          "Pedido de impulsionamento enviado para o time admin. Agora o super admin pode ajustar e publicar a campanha patrocinada.",
      });

      queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "boost-requests"] });
    },
    onError: (error) => {
      setBoostFeedback({
        type: "error",
        message: `Nao foi possivel solicitar o impulsionamento: ${getCampaignErrorMessage(
          error,
          "erro inesperado",
        )}`,
      });
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

      {boostFeedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            boostFeedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {boostFeedback.message}
        </div>
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
                campaigns.map((promo, index: number) => {
                  const promoId = String(promo.id || promo._id || "");
                  const linkedSponsoredCampaign =
                    sponsoredRequestsByCampaignId[promoId] || null;
                  const boostStatus = getBoostStatusDescriptor(
                    linkedSponsoredCampaign?.status || null,
                  );

                  return (
                    <tr
                      key={promo.id || promo._id || index}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
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
                          {promo.type === "both"
                            ? "Story + Post"
                            : promo.type === "story"
                              ? "Story"
                              : "Post Feed"}
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
                              <div
                                className="text-[10px] text-slate-500 max-w-[150px] truncate"
                                title={promo.maxReward}
                              >
                                Até {promo.maxReward}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Máxima:{" "}
                                {promo.maxLikesRequired !== undefined
                                  ? `${promo.maxLikesRequired} likes`
                                  : "sem meta"}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center justify-center">
                          <span className="font-bold text-slate-900 text-base">
                            {promo.stats?.participants || 0}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                            Total
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 font-bold border rounded-full text-xs ${
                            promo.status === "active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : promo.status === "ended"
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
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
                              <Link
                                href={`/dashboard/campanhas/nova?id=${promo.id || promo._id}`}
                                className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => {
                                  const idToUpdate = promo.id || promo._id;
                                  if (idToUpdate) {
                                    updateStatusMutation.mutate({
                                      id: idToUpdate,
                                      isActive: !promo.isActive,
                                    });
                                  }
                                }}
                                disabled={updateStatusMutation.isPending}
                                className="p-1.5 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors disabled:opacity-50"
                                title={promo.isActive ? "Pausar" : "Reativar"}
                              >
                                {promo.isActive ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBoostFeedback(null);
                                  requestBoostMutation.mutate(promo);
                                }}
                                disabled={
                                  requestBoostMutation.isPending ||
                                  boostStatus.disabled ||
                                  !sponsoredLookups?.formats?.length ||
                                  !promoId
                                }
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${boostStatus.className} ${
                                  boostStatus.disabled
                                    ? ""
                                    : "hover:border-violet-300 hover:bg-violet-100"
                                }`}
                                title="Solicitar impulsionamento patrocinado"
                              >
                                {requestBoostMutation.isPending &&
                                String(
                                  requestBoostMutation.variables?.id ||
                                    requestBoostMutation.variables?._id ||
                                    "",
                                ) === promoId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5" />
                                )}
                                {boostStatus.label}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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
