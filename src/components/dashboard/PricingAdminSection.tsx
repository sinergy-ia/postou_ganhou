"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  X,
} from "lucide-react";
import {
  establishmentApi,
  type PricingEstablishmentAssignment,
} from "@/services/establishment-api";

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getPlanTone(planType: string) {
  switch (planType) {
    case "pro":
      return "bg-primary-50 text-primary-700 border-primary-200";
    case "scale":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "start":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getErrorMessage(error: unknown, fallback: string) {
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

type AdminCreateForm = {
  name: string;
  establishmentName: string;
  email: string;
  category: string;
  superAdmin: boolean;
  planType: "free" | "start" | "pro" | "scale";
  billingCycle: "monthly" | "annual";
};

const defaultAdminCreateForm: AdminCreateForm = {
  name: "",
  establishmentName: "",
  email: "",
  category: "",
  superAdmin: false,
  planType: "free",
  billingCycle: "monthly",
};

export default function PricingAdminSection() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [draftPlans, setDraftPlans] = useState<
    Record<
      string,
      {
        planType: "free" | "start" | "pro" | "scale";
        billingCycle: "monthly" | "annual";
      }
    >
  >({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<AdminCreateForm>(defaultAdminCreateForm);
  const [createError, setCreateError] = useState("");

  const { data: me } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });

  const { data: pricingPlans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["pricing-plans-admin"],
    queryFn: establishmentApi.getPricingPlans,
  });

  const { data: establishments, isLoading: isLoadingEstablishments } = useQuery({
    queryKey: ["pricing-establishments-admin"],
    queryFn: establishmentApi.getPricingEstablishments,
  });

  const assignPlanMutation = useMutation({
    mutationFn: ({
      establishmentId,
      payload,
    }: {
      establishmentId: string;
      payload: {
        planType: "free" | "start" | "pro" | "scale";
        billingCycle: "monthly" | "annual";
      };
    }) => establishmentApi.assignPricingPlan(establishmentId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pricing-establishments-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["establishment-me"] }),
        queryClient.invalidateQueries({ queryKey: ["settings"] }),
      ]);
    },
    onError: (error) => {
      window.alert(getErrorMessage(error, "Nao foi possivel alterar o plano."));
    },
  });

  const superAdminMutation = useMutation({
    mutationFn: ({
      establishmentId,
      superAdmin,
    }: {
      establishmentId: string;
      superAdmin: boolean;
    }) => establishmentApi.updatePricingSuperAdmin(establishmentId, { superAdmin }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pricing-establishments-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["establishment-me"] }),
        queryClient.invalidateQueries({ queryKey: ["settings"] }),
      ]);
    },
    onError: (error) => {
      window.alert(getErrorMessage(error, "Nao foi possivel atualizar o super admin."));
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: establishmentApi.createPricingAdmin,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pricing-establishments-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["establishment-me"] }),
      ]);
      setIsCreateModalOpen(false);
      setCreateForm(defaultAdminCreateForm);
      setCreateError("");
    },
    onError: (error) => {
      setCreateError(
        getErrorMessage(error, "Nao foi possivel criar o novo admin."),
      );
    },
  });

  const currentPlan = me?.planAccess || null;

  const filteredEstablishments = useMemo(() => {
    const items = establishments || [];
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((item) =>
      [
        item.name,
        item.email,
        item.category,
        item.plan,
        item.superAdmin ? "super admin" : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [establishments, search]);

  function getDraft(establishment: PricingEstablishmentAssignment) {
    return (
      draftPlans[establishment.id] || {
        planType: establishment.pricingPlanType,
        billingCycle: establishment.pricingBillingCycle,
      }
    );
  }

  function updateDraft(
    establishmentId: string,
    payload: Partial<{
      planType: "free" | "start" | "pro" | "scale";
      billingCycle: "monthly" | "annual";
    }>,
  ) {
    setDraftPlans((current) => ({
      ...current,
      [establishmentId]: {
        ...(current[establishmentId] || {
          planType: "free",
          billingCycle: "monthly",
        }),
        ...payload,
      },
    }));
  }

  function openCreateModal() {
    setCreateForm(defaultAdminCreateForm);
    setCreateError("");
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setCreateError("");
  }

  if (isLoadingPlans || isLoadingEstablishments) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-700">
              <Sparkles className="h-3.5 w-3.5" />
              Plano atual
            </div>
            <h2 className="mt-4 font-heading font-bold text-2xl text-slate-900">
              {currentPlan?.planName || me?.plan || "Free"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Ciclo {currentPlan?.billingCycle === "annual" ? "anual" : "mensal"} • limite de{" "}
              {currentPlan?.limits?.maxActiveCampaigns ?? "campanhas ilimitadas"} campanhas ativas
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Recursos liberados
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(currentPlan?.features || {})
                .filter(([, enabled]) => enabled)
                .map(([feature]) => (
                  <span
                    key={feature}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200"
                  >
                    {feature}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-heading font-bold text-2xl text-slate-900">
              Planos cadastrados
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Referência comercial dinâmica usada na landing e nas travas por plano.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
          {(pricingPlans || []).map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-5 ${getPlanTone(plan.type)}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-xl font-bold">{plan.name}</p>
                  <p className="text-xs uppercase tracking-[0.16em] opacity-75">
                    {plan.type}
                  </p>
                </div>
                {plan.isActive ? <CheckCircle2 className="h-5 w-5" /> : null}
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <p>{formatCurrency(plan.monthlyPrice)}/mes</p>
                <p>{formatCurrency(plan.annualPrice)}/ano</p>
                <p>Taxa por cupom: {formatCurrency(plan.redemptionFee)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-heading font-bold text-2xl text-slate-900">
              Administração de acessos
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Crie novos admins, altere plano e promova ou revogue super admins.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar estabelecimento..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-primary-200 transition-colors hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Novo admin
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50/70 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-4 font-semibold">Estabelecimento</th>
                <th className="px-4 py-4 font-semibold">Categoria</th>
                <th className="px-4 py-4 font-semibold">Plano atual</th>
                <th className="px-4 py-4 font-semibold">Super admin</th>
                <th className="px-4 py-4 font-semibold">Novo plano</th>
                <th className="px-4 py-4 font-semibold">Ciclo</th>
                <th className="px-4 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEstablishments.map((item) => {
                const draft = getDraft(item);
                const isPlanPending =
                  assignPlanMutation.isPending &&
                  assignPlanMutation.variables?.establishmentId === item.id;
                const isSuperAdminPending =
                  superAdminMutation.isPending &&
                  superAdminMutation.variables?.establishmentId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.email || "Sem e-mail"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.category || "-"}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getPlanTone(
                          item.pricingPlanType,
                        )}`}
                      >
                        {item.plan}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          superAdminMutation.mutate({
                            establishmentId: item.id,
                            superAdmin: !item.superAdmin,
                          })
                        }
                        disabled={isSuperAdminPending}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                          item.superAdmin
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {isSuperAdminPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : item.superAdmin ? (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        ) : (
                          <ShieldOff className="h-3.5 w-3.5" />
                        )}
                        {item.superAdmin ? "Super admin" : "Padrão"}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={draft.planType}
                        onChange={(event) =>
                          updateDraft(item.id, {
                            planType: event.target.value as "free" | "start" | "pro" | "scale",
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                      >
                        {(pricingPlans || []).map((plan) => (
                          <option key={`${item.id}-${plan.id}`} value={plan.type}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={draft.billingCycle}
                        onChange={(event) =>
                          updateDraft(item.id, {
                            billingCycle: event.target.value as "monthly" | "annual",
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                      >
                        <option value="monthly">Mensal</option>
                        <option value="annual">Anual</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          assignPlanMutation.mutate({
                            establishmentId: item.id,
                            payload: draft,
                          })
                        }
                        disabled={isPlanPending}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPlanPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BadgeDollarSign className="h-4 w-4" />
                        )}
                        Aplicar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900">
                  Cadastrar novo admin
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Crie uma nova conta administrativa do Marque &amp; Ganhe e enviaremos um convite por e-mail para confirmar o acesso e definir a senha.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setCreateError("");
                createAdminMutation.mutate(createForm);
              }}
              className="space-y-6 p-6"
            >
              {createError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {createError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Nome do responsável
                  </label>
                  <input
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Nome do estabelecimento
                  </label>
                  <input
                    required
                    value={createForm.establishmentName}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        establishmentName: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    E-mail
                  </label>
                  <input
                    required
                    type="email"
                    value={createForm.email}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, email: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div className="md:col-span-2 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-4 text-sm text-primary-700">
                  O owner da nova loja receberá um link no e-mail para ativar a conta e escolher a senha.
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Categoria
                  </label>
                  <input
                    value={createForm.category}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Plano inicial
                  </label>
                  <select
                    value={createForm.planType}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        planType: event.target.value as "free" | "start" | "pro" | "scale",
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  >
                    <option value="free">Free</option>
                    <option value="start">Start</option>
                    <option value="pro">Pro</option>
                    <option value="scale">Scale</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Ciclo
                  </label>
                  <select
                    value={createForm.billingCycle}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        billingCycle: event.target.value as "monthly" | "annual",
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-8">
                  <input
                    id="new-admin-super"
                    type="checkbox"
                    checked={createForm.superAdmin}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        superAdmin: event.target.checked,
                      }))
                    }
                    className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="new-admin-super"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Criar já com acesso de super admin
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createAdminMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createAdminMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Criar admin
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
