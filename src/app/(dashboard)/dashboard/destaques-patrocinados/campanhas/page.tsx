"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Copy,
  Eye,
  Filter,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import MetricCard from "@/components/sponsored-highlights/MetricCard";
import StatusBadge from "@/components/sponsored-highlights/StatusBadge";
import DashboardDialog from "@/components/ui/DashboardDialog";
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  getErrorMessage,
  getOriginLabel,
  getPlacementLabel,
} from "@/lib/sponsored-highlights-utils";
import {
  sponsoredHighlightsApi,
  type SponsoredCampaign,
  type SponsoredCampaignListResponse,
  type SponsoredCampaignStatus,
} from "@/services/sponsored-highlights-api";

type CampaignAction = "activate" | "pause" | "cancel" | "renew" | "duplicate";

function getOptimisticStatus(
  action: CampaignAction,
  currentStatus: SponsoredCampaignStatus,
): SponsoredCampaignStatus | null {
  switch (action) {
    case "activate":
      return currentStatus === "active" ? null : "active";
    case "pause":
      return currentStatus === "paused" ? null : "paused";
    case "cancel":
      return currentStatus === "cancelled" ? null : "cancelled";
    default:
      return null;
  }
}

function canRunAction(action: CampaignAction, status: SponsoredCampaignStatus) {
  switch (action) {
    case "activate":
      return !["active", "cancelled", "expired"].includes(status);
    case "pause":
      return status === "active";
    case "cancel":
      return !["cancelled", "expired"].includes(status);
    case "renew":
      return ["ended", "expired", "cancelled"].includes(status);
    case "duplicate":
      return true;
    default:
      return false;
  }
}

export default function SponsoredCampaignsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [formatId, setFormatId] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<SponsoredCampaign | null>(null);
  const [notice, setNotice] = useState("");

  const { data: lookups } = useQuery({
    queryKey: ["sponsored-highlights", "lookups"],
    queryFn: sponsoredHighlightsApi.getLookups,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["sponsored-highlights", "campaigns", search, status, origin, formatId],
    queryFn: () =>
      sponsoredHighlightsApi.getCampaigns({
        search: search || undefined,
        status: status || undefined,
        origin: origin || undefined,
        formatId: formatId || undefined,
        limit: 50,
      }),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: CampaignAction }) => {
      switch (action) {
        case "activate":
          return sponsoredHighlightsApi.activateCampaign(id);
        case "pause":
          return sponsoredHighlightsApi.pauseCampaign(id);
        case "cancel":
          return sponsoredHighlightsApi.cancelCampaign(id);
        case "renew":
          return sponsoredHighlightsApi.renewCampaign(id);
        case "duplicate":
          return sponsoredHighlightsApi.duplicateCampaign(id);
        default:
          return sponsoredHighlightsApi.getCampaign(id);
      }
    },
    onMutate: async (variables) => {
      const optimisticStatus = items.find((item) => item.id === variables.id)?.status
        ? getOptimisticStatus(
            variables.action,
            items.find((item) => item.id === variables.id)!.status,
          )
        : null;

      await queryClient.cancelQueries({ queryKey: ["sponsored-highlights", "campaigns"] });

      const previousCampaignQueries = queryClient.getQueriesData<SponsoredCampaignListResponse>({
        queryKey: ["sponsored-highlights", "campaigns"],
      });

      if (optimisticStatus) {
        queryClient.setQueriesData<SponsoredCampaignListResponse>(
          { queryKey: ["sponsored-highlights", "campaigns"] },
          (current) => {
            if (!current?.items?.length) {
              return current;
            }

            return {
              ...current,
              items: current.items.map((item) =>
                item.id === variables.id ? { ...item, status: optimisticStatus } : item,
              ),
            };
          },
        );

        setSelectedCampaign((current) =>
          current && current.id === variables.id
            ? { ...current, status: optimisticStatus }
            : current,
        );
      }

      return {
        previousCampaignQueries,
      };
    },
    onSuccess: async (updatedCampaign, variables) => {
      queryClient.setQueriesData<SponsoredCampaignListResponse>(
        { queryKey: ["sponsored-highlights", "campaigns"] },
        (current) => {
          if (!current?.items?.length) {
            return current;
          }

          const existingIndex = current.items.findIndex((item) => item.id === variables.id);

          if (existingIndex >= 0) {
            return {
              ...current,
              items: current.items.map((item) =>
                item.id === variables.id ? updatedCampaign : item,
              ),
            };
          }

          if (variables.action === "renew" || variables.action === "duplicate") {
            return {
              ...current,
              items: [updatedCampaign, ...current.items],
            };
          }

          return current;
        },
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "slots"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "reports"] }),
      ]);

      if (
        selectedCampaign &&
        (selectedCampaign.id === variables.id || variables.action === "renew" || variables.action === "duplicate")
      ) {
        setSelectedCampaign(updatedCampaign);
      }
    },
    onError: (mutationError, _variables, context) => {
      for (const [queryKey, queryData] of context?.previousCampaignQueries || []) {
        queryClient.setQueryData(queryKey, queryData);
      }

      setNotice(getErrorMessage(mutationError));
    },
  });

  const items = data?.items ?? [];

  const stats = {
    active: items.filter((item) => item.status === "active").length,
    scheduled: items.filter((item) => item.status === "scheduled").length,
    pendingPayment: items.filter((item) => item.status === "pending_payment").length,
    revenue: items.reduce((sum, item) => sum + item.finalPrice, 0),
  };

  function handleAction(id: string, action: CampaignAction) {
    actionMutation.mutate({ id, action });
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Campanhas ativas"
          value={String(stats.active)}
          helper="Contratos atualmente em entrega de visibilidade."
          icon={Play}
          tone="emerald"
        />
        <MetricCard
          label="Campanhas agendadas"
          value={String(stats.scheduled)}
          helper="Reservas futuras que ja ocupam planejamento comercial."
          icon={RefreshCw}
          tone="blue"
        />
        <MetricCard
          label="Pendentes de pagamento"
          value={String(stats.pendingPayment)}
          helper="Leads comerciais prontos para follow-up financeiro."
          icon={Wallet}
          tone="amber"
        />
        <MetricCard
          label="Receita filtrada"
          value={formatCurrency(stats.revenue)}
          helper="Total dos contratos exibidos na listagem atual."
          icon={Filter}
          tone="primary"
        />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Gestao de campanhas patrocinadas
              </h2>
              <p className="text-sm text-slate-500">
                Visualize compras, ativacoes, renovacoes e campanhas vencendo em breve.
              </p>
            </div>

            <Link
              href="/dashboard/destaques-patrocinados/campanhas/nova"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-primary-200 transition-colors hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Criar campanha
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por campanha, estabelecimento ou categoria..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Todos os status</option>
              {lookups?.statuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              >
                <option value="">Origem</option>
                {lookups?.origins.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={formatId}
                onChange={(event) => setFormatId(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              >
                <option value="">Formato</option>
                {lookups?.formats.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Estabelecimento</th>
                <th className="px-6 py-4 font-semibold">Formato contratado</th>
                <th className="px-6 py-4 font-semibold">Plano</th>
                <th className="px-6 py-4 font-semibold">Periodo</th>
                <th className="px-6 py-4 font-semibold">Valor</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Origem</th>
                <th className="px-6 py-4 font-semibold text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-500" />
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((campaign) => {
                  const isPendingForCampaign =
                    actionMutation.isPending && actionMutation.variables?.id === campaign.id;
                  const activeAction = isPendingForCampaign
                    ? actionMutation.variables?.action
                    : null;

                  return (
                  <tr key={campaign.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <img
                          src={campaign.establishmentAvatarUrl}
                          alt={campaign.establishmentName}
                          className="h-10 w-10 rounded-2xl object-cover"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">
                            {campaign.establishmentName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {campaign.category} • {campaign.cityRegion}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-semibold text-slate-900">{campaign.formatName}</p>
                      <p className="text-xs text-slate-500">
                        {campaign.internalTitle}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-primary-700">
                        {getPlacementLabel(campaign.displayLocation)}
                      </p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-semibold text-slate-900">
                        {campaign.establishmentPlan}
                      </p>
                      <p className="text-xs text-slate-500">
                        Prioridade {campaign.manualPriority}
                      </p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-semibold text-slate-900">
                        {formatDateRange(campaign.startDate, campaign.endDate)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {campaign.durationDays} dias contratados
                      </p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(campaign.finalPrice)}
                      </p>
                      <p className="text-xs text-slate-500">
                        CTR {campaign.simulatedCtr.toFixed(1)}%
                      </p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {getOriginLabel(campaign.saleOrigin)}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCampaign(campaign)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/dashboard/destaques-patrocinados/campanhas/nova?id=${campaign.id}`}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleAction(campaign.id, "activate")}
                          disabled={actionMutation.isPending || !canRunAction("activate", campaign.status)}
                          className={`rounded-lg border p-2 transition-colors ${
                            campaign.status === "active"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                          title="Ativar"
                        >
                          {activeAction === "activate" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(campaign.id, "pause")}
                          disabled={actionMutation.isPending || !canRunAction("pause", campaign.status)}
                          className={`rounded-lg border p-2 transition-colors ${
                            campaign.status === "paused"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                          title="Pausar"
                        >
                          {activeAction === "pause" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Pause className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(campaign.id, "cancel")}
                          disabled={actionMutation.isPending || !canRunAction("cancel", campaign.status)}
                          className={`rounded-lg border p-2 transition-colors ${
                            campaign.status === "cancelled"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-slate-200 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                          title="Cancelar"
                        >
                          {activeAction === "cancel" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(campaign.id, "renew")}
                          disabled={actionMutation.isPending || !canRunAction("renew", campaign.status)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Renovar"
                        >
                          {activeAction === "renew" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(campaign.id, "duplicate")}
                          disabled={actionMutation.isPending || !canRunAction("duplicate", campaign.status)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Duplicar"
                        >
                          {activeAction === "duplicate" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma campanha encontrada com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCampaign ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900">
                  {selectedCampaign.internalTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedCampaign.establishmentName} • {selectedCampaign.formatName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <img
                  src={selectedCampaign.imageUrl}
                  alt={selectedCampaign.internalTitle}
                  className="h-64 w-full rounded-3xl object-cover"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Periodo
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {formatDateRange(selectedCampaign.startDate, selectedCampaign.endDate)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Valor cobrado
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {formatCurrency(selectedCampaign.finalPrice)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Segmentacao
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {selectedCampaign.cityRegion}
                    </p>
                    <p className="text-sm text-slate-500">{selectedCampaign.category}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Pagina de destino
                    </p>
                    <p className="mt-2 break-all font-semibold text-slate-900">
                      {selectedCampaign.landingPage}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Status
                  </p>
                  <div className="mt-3">
                    <StatusBadge status={selectedCampaign.status as SponsoredCampaignStatus} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Origem
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {getOriginLabel(selectedCampaign.saleOrigin)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Performance simulada
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>CTR</span>
                      <span className="font-semibold text-slate-900">
                        {selectedCampaign.simulatedCtr.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Views estimadas</span>
                      <span className="font-semibold text-slate-900">
                        {selectedCampaign.estimatedViews.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cliques estimados</span>
                      <span className="font-semibold text-slate-900">
                        {selectedCampaign.estimatedClicks.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Observacoes internas
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {selectedCampaign.internalNotes || "Sem observacoes cadastradas."}
                  </p>
                </div>

                <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-700">
                  Venda registrada em {formatDate(selectedCampaign.startDate)}. O formato ocupa a area{" "}
                  <span className="font-semibold">
                    {getPlacementLabel(selectedCampaign.displayLocation)}
                  </span>{" "}
                  e possui prioridade manual {selectedCampaign.manualPriority}.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <DashboardDialog
        open={Boolean(notice)}
        onClose={() => setNotice("")}
        title="Nao foi possivel concluir a acao"
        description={notice}
        footer={
          <button
            type="button"
            onClick={() => setNotice("")}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            Entendi
          </button>
        }
      />
    </div>
  );
}
