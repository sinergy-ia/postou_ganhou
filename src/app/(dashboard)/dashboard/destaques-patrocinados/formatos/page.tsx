"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings2,
  X,
  XCircle,
} from "lucide-react";
import MetricCard from "@/components/sponsored-highlights/MetricCard";
import {
  formatCurrency,
  formatPercent,
  getBillingModelLabel,
  getErrorMessage,
  getPlacementLabel,
} from "@/lib/sponsored-highlights-utils";
import {
  sponsoredHighlightsApi,
  type SponsoredFormat,
  type SponsoredFormatPayload,
  type SponsoredPlacement,
} from "@/services/sponsored-highlights-api";

const defaultForm: SponsoredFormatPayload = {
  name: "",
  slug: "",
  description: "",
  displayLocation: "home",
  maxSlots: 3,
  defaultDurationDays: 14,
  suggestedPrice: 990,
  billingModel: "one_time",
  isActive: true,
  renderPriority: 50,
};

function buildFormState(format?: SponsoredFormat | null): SponsoredFormatPayload {
  if (!format) {
    return defaultForm;
  }

  return {
    name: format.name,
    slug: format.slug,
    description: format.description,
    displayLocation: format.displayLocation,
    maxSlots: format.maxSlots,
    defaultDurationDays: format.defaultDurationDays,
    suggestedPrice: format.suggestedPrice,
    billingModel: format.billingModel,
    isActive: format.isActive,
    renderPriority: format.renderPriority,
  };
}

export default function SponsoredFormatsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFormat, setEditingFormat] = useState<SponsoredFormat | null>(null);
  const [formData, setFormData] = useState<SponsoredFormatPayload>(defaultForm);
  const [error, setError] = useState("");

  const { data: formats, isLoading } = useQuery({
    queryKey: ["sponsored-highlights", "formats", search],
    queryFn: () =>
      sponsoredHighlightsApi.getFormats({
        search: search || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: sponsoredHighlightsApi.createFormat,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "formats"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "reports"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "lookups"] }),
      ]);
      setIsModalOpen(false);
      setEditingFormat(null);
      setFormData(defaultForm);
      setError("");
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SponsoredFormatPayload> }) =>
      sponsoredHighlightsApi.updateFormat(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "formats"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "reports"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "lookups"] }),
      ]);
      setIsModalOpen(false);
      setEditingFormat(null);
      setFormData(defaultForm);
      setError("");
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError));
    },
  });

  const stats = useMemo(() => {
    const items = formats || [];
    return {
      total: items.length,
      ativos: items.filter((item) => item.isActive).length,
      recorrentes: items.filter((item) => item.billingModel === "recurring").length,
      inventario: items.reduce((sum, item) => sum + item.maxSlots, 0),
    };
  }, [formats]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  function openCreateModal() {
    setEditingFormat(null);
    setFormData(defaultForm);
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(format: SponsoredFormat) {
    setEditingFormat(format);
    setFormData(buildFormState(format));
    setError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingFormat(null);
    setFormData(defaultForm);
    setError("");
  }

  function updateField<K extends keyof SponsoredFormatPayload>(
    key: K,
    value: SponsoredFormatPayload[K],
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (editingFormat) {
      updateMutation.mutate({ id: editingFormat.id, payload: formData });
      return;
    }

    createMutation.mutate(formData);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Formatos cadastrados"
          value={String(stats.total)}
          helper="Catalogo total de espacos comercializaveis."
          icon={Layers3}
          tone="primary"
        />
        <MetricCard
          label="Formatos ativos"
          value={String(stats.ativos)}
          helper="Disponiveis agora para venda e alocacao de campanhas."
          icon={CheckCircle2}
          tone="emerald"
        />
        <MetricCard
          label="Modelos recorrentes"
          value={String(stats.recorrentes)}
          helper="Formatos com potencial de receita previsivel."
          icon={Settings2}
          tone="blue"
        />
        <MetricCard
          label="Inventario teorico"
          value={String(stats.inventario)}
          helper="Soma dos slots maximos parametrizados nos formatos."
          icon={XCircle}
          tone="amber"
        />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Cadastro de formatos de destaque
            </h2>
            <p className="text-sm text-slate-500">
              Ajuste precos, prioridade, capacidade de slots e modelo comercial.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar formato..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200 sm:w-72"
              />
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-primary-200 transition-colors hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Novo formato
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Formato</th>
                <th className="px-6 py-4 font-semibold">Exibicao</th>
                <th className="px-6 py-4 font-semibold">Slots</th>
                <th className="px-6 py-4 font-semibold">Duracao</th>
                <th className="px-6 py-4 font-semibold">Preco</th>
                <th className="px-6 py-4 font-semibold">Modelo</th>
                <th className="px-6 py-4 font-semibold">Status</th>
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
              ) : formats && formats.length > 0 ? (
                formats.map((format) => (
                  <tr key={format.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 align-top">
                      <div>
                        <p className="font-semibold text-slate-900">{format.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{format.slug}</p>
                        <p className="mt-2 max-w-sm text-sm text-slate-500">
                          {format.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {getPlacementLabel(format.displayLocation)}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-semibold text-slate-900">{format.maxSlots}</p>
                      <p className="text-xs text-slate-500">
                        Fill rate {formatPercent(format.occupancyRate)}
                      </p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-semibold text-slate-900">
                        {format.defaultDurationDays} dias
                      </p>
                      <p className="text-xs text-slate-500">
                        Prioridade {format.renderPriority}
                      </p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(format.suggestedPrice)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Receita {formatCurrency(format.totalRevenue)}
                      </p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-semibold text-slate-900">
                        {getBillingModelLabel(format.billingModel)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format.soldCampaigns || 0} vendas
                      </p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          format.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {format.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(format)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Nenhum formato encontrado para os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900">
                  {editingFormat ? "Editar formato" : "Novo formato de destaque"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Configure capacidade, recorrencia, preco sugerido e prioridade de renderizacao.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Nome do formato
                  </label>
                  <input
                    required
                    value={formData.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                    placeholder="Ex: Destaque na Home"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Slug interno
                  </label>
                  <input
                    value={formData.slug || ""}
                    onChange={(event) => updateField("slug", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                    placeholder="destaque-home"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Local de exibicao
                  </label>
                  <select
                    value={formData.displayLocation}
                    onChange={(event) =>
                      updateField(
                        "displayLocation",
                        event.target.value as SponsoredPlacement,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  >
                    <option value="home">Home</option>
                    <option value="listing">Listagem</option>
                    <option value="map">Mapa</option>
                    <option value="search">Busca</option>
                    <option value="carousel">Carrossel</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Descricao
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description || ""}
                    onChange={(event) => updateField("description", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                    placeholder="Explique onde o formato aparece e qual valor comercial ele entrega."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Quantidade maxima de slots
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.maxSlots}
                    onChange={(event) => updateField("maxSlots", Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Duracao padrao
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.defaultDurationDays}
                    onChange={(event) =>
                      updateField("defaultDurationDays", Number(event.target.value))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Preco sugerido
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.suggestedPrice}
                    onChange={(event) =>
                      updateField("suggestedPrice", Number(event.target.value))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Prioridade de renderizacao
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.renderPriority}
                    onChange={(event) =>
                      updateField("renderPriority", Number(event.target.value))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Modelo comercial
                  </label>
                  <select
                    value={formData.billingModel}
                    onChange={(event) =>
                      updateField(
                        "billingModel",
                        event.target.value as SponsoredFormatPayload["billingModel"],
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  >
                    <option value="one_time">Avulso</option>
                    <option value="recurring">Recorrente</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-8">
                  <input
                    id="format-active"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(event) => updateField("isActive", event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="format-active" className="text-sm font-semibold text-slate-700">
                    Manter formato ativo para vendas
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingFormat ? "Salvar formato" : "Criar formato"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
