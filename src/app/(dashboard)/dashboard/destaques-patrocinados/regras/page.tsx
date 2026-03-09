"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, ShieldCheck, Shuffle, Target, Waypoints } from "lucide-react";
import MetricCard from "@/components/sponsored-highlights/MetricCard";
import { getErrorMessage } from "@/lib/sponsored-highlights-utils";
import {
  sponsoredHighlightsApi,
  type SponsoredRules,
} from "@/services/sponsored-highlights-api";

export default function SponsoredRulesPage() {
  const queryClient = useQueryClient();
  const [draftRules, setDraftRules] = useState<SponsoredRules | null>(null);
  const [error, setError] = useState("");

  const { data: rules, isLoading } = useQuery({
    queryKey: ["sponsored-highlights", "rules"],
    queryFn: sponsoredHighlightsApi.getRules,
  });

  const { data: lookups } = useQuery({
    queryKey: ["sponsored-highlights", "lookups"],
    queryFn: sponsoredHighlightsApi.getLookups,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<SponsoredRules>) =>
      sponsoredHighlightsApi.updateRules(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "rules"] }),
        queryClient.invalidateQueries({ queryKey: ["sponsored-highlights", "overview"] }),
      ]);
      setDraftRules(null);
      setError("");
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError));
    },
  });

  const availablePlans = useMemo(() => {
    return Array.from(
      new Set((lookups?.establishments || []).map((item) => item.plan)),
    ).sort();
  }, [lookups]);

  const formData = draftRules ?? rules ?? null;

  function updateField<K extends keyof SponsoredRules>(
    key: K,
    value: SponsoredRules[K],
  ) {
    setDraftRules((current) => {
      const base = current ?? rules ?? null;
      return base ? { ...base, [key]: value } : null;
    });
  }

  function togglePlan(plan: string) {
    setDraftRules((current) => {
      const base = current ?? rules ?? null;
      if (!base) {
        return null;
      }

      const nextPlans = base.boostPlans.includes(plan)
        ? base.boostPlans.filter((item) => item !== plan)
        : [...base.boostPlans, plan];

      return { ...base, boostPlans: nextPlans };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData) {
      return;
    }

    saveMutation.mutate(formData);
  }

  if (isLoading || !formData) {
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
          label="Prioridade por plano"
          value={formData.prioritizeByPlan ? "Ativa" : "Inativa"}
          helper="Ordenacao considerando o valor do plano do estabelecimento."
          icon={ShieldCheck}
          tone="primary"
        />
        <MetricCard
          label="Rodizio entre patrocinados"
          value={formData.rotationEnabled ? "Ativo" : "Inativo"}
          helper="Alternancia automatica para distribuir visibilidade."
          icon={Shuffle}
          tone="emerald"
        />
        <MetricCard
          label="Cap por regiao"
          value={String(formData.maxCampaignsPerRegion)}
          helper="Numero maximo de campanhas patrocinadas por regiao."
          icon={Waypoints}
          tone="blue"
        />
        <MetricCard
          label="Frequencia por usuario"
          value={String(formData.maxImpressionsPerUser)}
          helper="Limite maximo de impressoes patrocinadas por visitante."
          icon={Target}
          tone="amber"
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <section className="space-y-4">
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Regras de exibicao
              </h2>
              <p className="text-sm text-slate-500">
                Ajuste o motor de prioridade, conflitos, fallback e frequencia de entrega.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Prioridade por plano</p>
                    <p className="text-sm text-slate-500">
                      Premium e Enterprise recebem impulso automatico.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.prioritizeByPlan}
                    onChange={(event) =>
                      updateField("prioritizeByPlan", event.target.checked)
                    }
                    className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
              </label>

              <label className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Rodizio entre patrocinados</p>
                    <p className="text-sm text-slate-500">
                      Balanceia entrega quando ha disputa por slots.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.rotationEnabled}
                    onChange={(event) =>
                      updateField("rotationEnabled", event.target.checked)
                    }
                    className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
              </label>

              <label className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Limite de exibicao por regiao</p>
                    <p className="text-sm text-slate-500">
                      Evita saturacao comercial em uma unica cidade ou bairro.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.regionCapEnabled}
                    onChange={(event) =>
                      updateField("regionCapEnabled", event.target.checked)
                    }
                    className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
              </label>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Conflito entre campanhas</p>
                <p className="mb-3 text-sm text-slate-500">
                  Escolha o criterio dominante quando duas campanhas competem pelo mesmo slot.
                </p>
                <select
                  value={formData.conflictStrategy}
                  onChange={(event) =>
                    updateField(
                      "conflictStrategy",
                      event.target.value as SponsoredRules["conflictStrategy"],
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                >
                  <option value="highest_priority">Maior prioridade manual</option>
                  <option value="highest_bid">Maior valor do contrato</option>
                  <option value="balanced_mix">Mix balanceado</option>
                </select>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Frequencia maxima por usuario
              </label>
              <input
                type="number"
                min={1}
                value={formData.maxImpressionsPerUser}
                onChange={(event) =>
                  updateField("maxImpressionsPerUser", Number(event.target.value))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
              <p className="mt-2 text-sm text-slate-500">
                Quantidade maxima de impressoes patrocinadas por visitante.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Maximo de campanhas por regiao
              </label>
              <input
                type="number"
                min={1}
                value={formData.maxCampaignsPerRegion}
                onChange={(event) =>
                  updateField("maxCampaignsPerRegion", Number(event.target.value))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
              <p className="mt-2 text-sm text-slate-500">
                Cap comercial para preservar variedade no feed.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Intervalo de rodizio
              </label>
              <input
                type="number"
                min={5}
                value={formData.rotationIntervalMinutes}
                onChange={(event) =>
                  updateField("rotationIntervalMinutes", Number(event.target.value))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
              <p className="mt-2 text-sm text-slate-500">
                Janela em minutos para alternancia de patrocinados.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Fallback quando nao houver patrocinado
              </label>
              <select
                value={formData.fallbackMode}
                onChange={(event) =>
                  updateField(
                    "fallbackMode",
                    event.target.value as SponsoredRules["fallbackMode"],
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                <option value="organic">Conteudo organico</option>
                <option value="house_ads">Anuncios da casa</option>
                <option value="best_converting">Melhor historico de conversao</option>
              </select>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-3">
              <p className="font-semibold text-slate-900">Planos com boost de prioridade</p>
              <p className="text-sm text-slate-500">
                Esses planos recebem tratamento preferencial no ranking comercial.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {availablePlans.map((plan) => {
                const selected = formData.boostPlans.includes(plan);
                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => togglePlan(plan)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      selected
                        ? "bg-primary-600 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700"
                    }`}
                  >
                    {plan}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="flex justify-end border-t border-slate-100 pt-6">
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
              Salvar regras
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Politica atual
            </h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                Conflitos resolvidos por{" "}
                <span className="font-semibold text-slate-900">
                  {formData.conflictStrategy === "highest_priority"
                    ? "prioridade manual"
                    : formData.conflictStrategy === "highest_bid"
                      ? "maior valor"
                      : "mix balanceado"}
                </span>
                .
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                Fallback definido para{" "}
                <span className="font-semibold text-slate-900">
                  {formData.fallbackMode === "organic"
                    ? "conteudo organico"
                    : formData.fallbackMode === "house_ads"
                      ? "anuncios da casa"
                      : "melhor historico de conversao"}
                </span>
                .
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                Rodizio a cada{" "}
                <span className="font-semibold text-slate-900">
                  {formData.rotationIntervalMinutes} minutos
                </span>
                , com limite de{" "}
                <span className="font-semibold text-slate-900">
                  {formData.maxImpressionsPerUser}
                </span>{" "}
                impressoes por usuario.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-primary-100 bg-primary-50 p-6 text-sm text-primary-700 shadow-sm">
            As regras desta pagina controlam conflitos, saturacao regional, frequencia e fallback do inventario patrocinado.
            Elas foram desenhadas para manter o equilibrio entre receita, experiencia do usuario e entrega comercial.
          </div>
        </div>
      </form>
    </div>
  );
}
