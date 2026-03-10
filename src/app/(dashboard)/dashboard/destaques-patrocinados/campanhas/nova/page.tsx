"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, Sparkles } from "lucide-react";
import { normalizeSponsoredHref } from "@/lib/sponsored-highlights-public";
import {
  formatCurrency,
  getErrorMessage,
  getPlacementLabel,
} from "@/lib/sponsored-highlights-utils";
import {
  sponsoredHighlightsApi,
  type SponsoredCampaignPayload,
  type SponsoredCampaignStatus,
  type SponsoredOrigin,
} from "@/services/sponsored-highlights-api";

interface CampaignFormState {
  establishmentId: string;
  formatId: string;
  internalTitle: string;
  startDate: string;
  endDate: string;
  finalPrice: string;
  saleOrigin: SponsoredOrigin;
  internalNotes: string;
  manualPriority: string;
  cityRegion: string;
  category: string;
  landingPage: string;
  imageUrl: string;
  initialStatus: SponsoredCampaignStatus;
}

function toDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

function buildInitialFormState(args: {
  lookups?: Awaited<ReturnType<typeof sponsoredHighlightsApi.getLookups>>;
  campaignToEdit?: Awaited<ReturnType<typeof sponsoredHighlightsApi.getCampaign>>;
  isEditing: boolean;
}): CampaignFormState | null {
  const { lookups, campaignToEdit, isEditing } = args;

  if (isEditing) {
    if (!campaignToEdit) {
      return null;
    }

    return {
      establishmentId: campaignToEdit.establishmentId,
      formatId: campaignToEdit.formatId,
      internalTitle: campaignToEdit.internalTitle,
      startDate: toDateInput(campaignToEdit.startDate),
      endDate: toDateInput(campaignToEdit.endDate),
      finalPrice: String(campaignToEdit.finalPrice),
      saleOrigin: campaignToEdit.saleOrigin,
      internalNotes: campaignToEdit.internalNotes || "",
      manualPriority: String(campaignToEdit.manualPriority),
      cityRegion: campaignToEdit.cityRegion,
      category: campaignToEdit.category,
      landingPage: campaignToEdit.landingPage,
      imageUrl: campaignToEdit.imageUrl,
      initialStatus: campaignToEdit.status,
    };
  }

  if (!lookups) {
    return null;
  }

  const firstEstablishment = lookups.establishments[0];
  const firstFormat = lookups.formats[0];

  return {
    establishmentId: firstEstablishment?.id || "",
    formatId: firstFormat?.id || "",
    internalTitle: "",
    startDate: "",
    endDate: "",
    finalPrice: String(firstFormat?.suggestedPrice || ""),
    saleOrigin: "inside_sales",
    internalNotes: "",
    manualPriority: String(firstFormat?.renderPriority || 80),
    cityRegion: firstEstablishment?.cityRegion || "",
    category: firstEstablishment?.category || "",
    landingPage: lookups.landingPages[1]?.value || "/promocoes",
    imageUrl: "",
    initialStatus: (lookups.statuses[0]?.value || "scheduled") as SponsoredCampaignStatus,
  };
}

function CampaignFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const campaignId = searchParams.get("id");
  const isEditing = Boolean(campaignId);
  const [error, setError] = useState("");

  const { data: lookups, isLoading: isLoadingLookups } = useQuery({
    queryKey: ["sponsored-highlights", "lookups"],
    queryFn: sponsoredHighlightsApi.getLookups,
  });

  const [draftFormData, setDraftFormData] = useState<CampaignFormState | null>(null);

  const { data: campaignToEdit, isLoading: isLoadingCampaign } = useQuery({
    queryKey: ["sponsored-highlights", "campaign", campaignId],
    queryFn: () => sponsoredHighlightsApi.getCampaign(campaignId!),
    enabled: isEditing,
  });

  const initialFormData = useMemo(
    () =>
      buildInitialFormState({
        lookups,
        campaignToEdit,
        isEditing,
      }),
    [campaignToEdit, isEditing, lookups],
  );

  const formData = draftFormData ?? initialFormData;

  const saveMutation = useMutation({
    mutationFn: async (payload: SponsoredCampaignPayload) => {
      if (campaignId) {
        return sponsoredHighlightsApi.updateCampaign(campaignId, payload);
      }

      return sponsoredHighlightsApi.createCampaign(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "slots"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "reports"] }),
      ]);
      router.push("/dashboard/destaques-patrocinados/campanhas");
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError));
    },
  });

  const selectedFormat = useMemo(
    () => lookups?.formats.find((item) => item.id === formData?.formatId) || null,
    [formData?.formatId, lookups],
  );

  const selectedEstablishment = useMemo(
    () =>
      lookups?.establishments.find((item) => item.id === formData?.establishmentId) || null,
    [formData?.establishmentId, lookups],
  );

  function updateField<K extends keyof CampaignFormState>(
    key: K,
    value: CampaignFormState[K],
  ) {
    setDraftFormData((current) => {
      const base = current ?? initialFormData;
      return base ? { ...base, [key]: value } : base;
    });
  }

  function handleEstablishmentChange(nextId: string) {
    const establishment = lookups?.establishments.find((item) => item.id === nextId);
    setDraftFormData((current) => {
      const base = current ?? initialFormData;
      if (!base) {
        return base;
      }

      return {
        ...base,
        establishmentId: nextId,
        cityRegion: establishment?.cityRegion || base.cityRegion,
        category: establishment?.category || base.category,
      };
    });
  }

  function handleFormatChange(nextId: string) {
    const format = lookups?.formats.find((item) => item.id === nextId);
    setDraftFormData((current) => {
      const base = current ?? initialFormData;
      if (!base) {
        return base;
      }

      return {
        ...base,
        formatId: nextId,
        finalPrice: base.finalPrice || String(format?.suggestedPrice || ""),
        manualPriority: String(format?.renderPriority || base.manualPriority),
      };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formData) {
      return;
    }

    const payload: SponsoredCampaignPayload = {
      establishmentId: formData.establishmentId,
      formatId: formData.formatId,
      internalTitle: formData.internalTitle,
      startDate: new Date(`${formData.startDate}T12:00:00`).toISOString(),
      endDate: new Date(`${formData.endDate}T12:00:00`).toISOString(),
      finalPrice: Number(formData.finalPrice || 0),
      saleOrigin: formData.saleOrigin,
      internalNotes: formData.internalNotes,
      manualPriority: Number(formData.manualPriority || 0),
      cityRegion: formData.cityRegion,
      category: formData.category,
      landingPage: normalizeSponsoredHref(formData.landingPage),
      imageUrl: formData.imageUrl,
      initialStatus: formData.initialStatus,
    };

    saveMutation.mutate(payload);
  }

  if (isLoadingLookups || (isEditing && isLoadingCampaign) || !formData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/destaques-patrocinados/campanhas"
          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="font-heading text-3xl font-bold text-slate-900">
            {isEditing ? "Editar campanha patrocinada" : "Criar campanha patrocinada"}
          </h2>
          <p className="text-slate-500">
            Preencha o contrato comercial, a segmentacao e a configuracao visual do destaque.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {error ? (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Estabelecimento
              </label>
              <select
                required
                value={formData.establishmentId}
                onChange={(event) => handleEstablishmentChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              >
                {lookups?.establishments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Formato de destaque
              </label>
              <select
                required
                value={formData.formatId}
                onChange={(event) => handleFormatChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              >
                {lookups?.formats.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Titulo da campanha interna
              </label>
              <input
                required
                value={formData.internalTitle}
                onChange={(event) => updateField("internalTitle", event.target.value)}
                placeholder="Ex: Hero de semana gastronomica"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Data de inicio
              </label>
              <input
                required
                type="date"
                value={formData.startDate}
                onChange={(event) => updateField("startDate", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Data de termino
              </label>
              <input
                required
                type="date"
                value={formData.endDate}
                onChange={(event) => updateField("endDate", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Valor final
              </label>
              <input
                required
                type="number"
                min={0}
                value={formData.finalPrice}
                onChange={(event) => updateField("finalPrice", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Origem da venda
              </label>
              <select
                value={formData.saleOrigin}
                onChange={(event) =>
                  updateField("saleOrigin", event.target.value as SponsoredOrigin)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              >
                {lookups?.origins.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Prioridade manual
              </label>
              <input
                type="number"
                min={1}
                value={formData.manualPriority}
                onChange={(event) => updateField("manualPriority", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Status inicial
              </label>
              <select
                value={formData.initialStatus}
                onChange={(event) =>
                  updateField(
                    "initialStatus",
                    event.target.value as SponsoredCampaignStatus,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              >
                {lookups?.statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Segmentacao por cidade/regiao
              </label>
              <select
                value={formData.cityRegion}
                onChange={(event) => updateField("cityRegion", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              >
                {lookups?.regions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Segmentacao por categoria
              </label>
              <select
                value={formData.category}
                onChange={(event) => updateField("category", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              >
                {lookups?.categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Pagina de destino
              </label>
              <select
                value={formData.landingPage}
                onChange={(event) => updateField("landingPage", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              >
                {lookups?.landingPages.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Imagem ou banner de apoio
              </label>
              <input
                value={formData.imageUrl}
                onChange={(event) => updateField("imageUrl", event.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Observacoes internas
              </label>
              <textarea
                rows={4}
                value={formData.internalNotes}
                onChange={(event) => updateField("internalNotes", event.target.value)}
                placeholder="Detalhes de negociacao, pacote, excecoes e informacoes para comercial/operacao."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-primary-200 transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditing ? "Salvar campanha" : "Criar campanha"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary-700">
              <Sparkles className="h-3.5 w-3.5" />
              Resumo comercial
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Estabelecimento
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {selectedEstablishment?.name || "Selecione um estabelecimento"}
                </p>
                <p className="text-sm text-slate-500">
                  Plano {selectedEstablishment?.plan || "-"} • {selectedEstablishment?.cityRegion || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Formato
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {selectedFormat?.name || "Selecione um formato"}
                </p>
                <p className="text-sm text-slate-500">
                  {selectedFormat
                    ? `${getPlacementLabel(selectedFormat.displayLocation)} • ${selectedFormat.maxSlots} slots`
                    : "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Preco sugerido
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {selectedFormat ? formatCurrency(selectedFormat.suggestedPrice) : "-"}
                </p>
                <p className="text-sm text-slate-500">
                  Valor editavel para negociacao e bundles.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Duracao padrao
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {selectedFormat ? `${selectedFormat.defaultDurationDays} dias` : "-"}
                </p>
                <p className="text-sm text-slate-500">
                  Prioridade base sugerida {selectedFormat?.renderPriority || "-"}.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Checklist da campanha
            </h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                Confirme se o periodo nao conflita com outras campanhas da mesma regiao.
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                Garanta que o valor final reflita o formato, o plano e a prioridade manual.
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                Use a imagem de apoio para alinhar o preview do patrocinado na home e na busca.
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function SponsoredCampaignFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      }
    >
      <CampaignFormPage />
    </Suspense>
  );
}
