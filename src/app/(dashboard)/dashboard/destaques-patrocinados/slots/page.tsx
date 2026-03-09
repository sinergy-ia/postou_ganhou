"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, Loader2, MapPinned, MonitorPlay, Search, SlidersHorizontal } from "lucide-react";
import MetricCard from "@/components/sponsored-highlights/MetricCard";
import StatusBadge from "@/components/sponsored-highlights/StatusBadge";
import {
  formatCurrency,
  formatDateRange,
  formatPercent,
} from "@/lib/sponsored-highlights-utils";
import {
  sponsoredHighlightsApi,
  type SponsoredCampaign,
  type SponsoredSlotArea,
} from "@/services/sponsored-highlights-api";

function resolveAreaIcon(area: SponsoredSlotArea["area"]) {
  switch (area) {
    case "map":
      return MapPinned;
    case "search":
      return Search;
    case "carousel":
      return MonitorPlay;
    default:
      return LayoutGrid;
  }
}

export default function SponsoredSlotsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<SponsoredCampaign | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sponsored-highlights", "slots"],
    queryFn: sponsoredHighlightsApi.getSlots,
  });

  const stats = useMemo(() => {
    const areas = data || [];
    const occupied = areas.reduce((sum, area) => sum + area.occupiedSlots, 0);
    const total = areas.reduce((sum, area) => sum + area.totalSlots, 0);
    return {
      areas: areas.length,
      occupied,
      available: total - occupied,
      occupancy: total ? (occupied / total) * 100 : 0,
    };
  }, [data]);

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
          label="Areas monitoradas"
          value={String(stats.areas)}
          helper="Home, listagem, mapa, busca e carrossel comercial."
          icon={LayoutGrid}
          tone="primary"
        />
        <MetricCard
          label="Slots ocupados"
          value={String(stats.occupied)}
          helper="Posicoes atualmente com campanha ativa ou reservada."
          icon={SlidersHorizontal}
          tone="emerald"
        />
        <MetricCard
          label="Slots livres"
          value={String(stats.available)}
          helper="Inventario disponivel para novas vendas."
          icon={MonitorPlay}
          tone="blue"
        />
        <MetricCard
          label="Ocupacao media"
          value={formatPercent(stats.occupancy)}
          helper="Indicador consolidado de pressao comercial sobre o inventario."
          icon={MapPinned}
          tone="amber"
        />
      </div>

      <div className="space-y-6">
        {data.map((area) => {
          const AreaIcon = resolveAreaIcon(area.area);

          return (
            <section
              key={area.area}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                    <AreaIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-bold text-slate-900">
                      {area.label}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {area.occupiedSlots} ocupados, {area.availableSlots} livres, ocupacao{" "}
                      {formatPercent(area.occupancyRate)}
                    </p>
                  </div>
                </div>

                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                  {area.totalSlots} slots totais
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {area.slots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`rounded-3xl border p-5 transition-colors ${
                      slot.state === "occupied"
                        ? "border-primary-200 bg-primary-50/50"
                        : "border-dashed border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{slot.slotLabel}</p>
                        <p className="text-xs text-slate-500">
                          {slot.state === "occupied" ? "Ocupado" : "Livre"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          slot.state === "occupied"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {slot.state === "occupied" ? "Em uso" : "Disponivel"}
                      </span>
                    </div>

                    {slot.campaign ? (
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {slot.campaign.establishmentName}
                          </p>
                          <p className="text-sm text-slate-500">
                            {slot.campaign.formatName}
                          </p>
                        </div>
                        <p className="text-sm text-slate-600">
                          {formatDateRange(slot.campaign.startDate, slot.campaign.endDate)}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(slot.campaign.finalPrice)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedCampaign(slot.campaign)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-primary-300 hover:bg-white hover:text-primary-700"
                          >
                            Detalhes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 text-sm text-slate-500">
                        <p>Sem campanha alocada para este periodo.</p>
                        <p>
                          Use este espaco para novas propostas ou fallback organico.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {selectedCampaign ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
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

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </p>
                <div className="mt-3">
                  <StatusBadge status={selectedCampaign.status} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Valor contratado
                </p>
                <p className="mt-3 font-semibold text-slate-900">
                  {formatCurrency(selectedCampaign.finalPrice)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Periodo
                </p>
                <p className="mt-3 font-semibold text-slate-900">
                  {formatDateRange(selectedCampaign.startDate, selectedCampaign.endDate)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Segmentacao
                </p>
                <p className="mt-3 font-semibold text-slate-900">
                  {selectedCampaign.cityRegion}
                </p>
                <p className="text-sm text-slate-500">{selectedCampaign.category}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-700">
              CTR simulado de {selectedCampaign.simulatedCtr.toFixed(1)}% com{" "}
              {selectedCampaign.estimatedViews.toLocaleString("pt-BR")} visualizacoes previstas.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
