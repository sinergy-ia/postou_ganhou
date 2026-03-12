"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BadgeDollarSign,
  CalendarRange,
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Ticket,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  establishmentApi,
  type PricingEstablishmentAssignment,
} from "@/services/establishment-api";

type InsightCard = {
  title?: string;
  description?: string;
};

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPercentageValue(value?: number | null) {
  return `${Number(value || 0)}%`;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthStart() {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

function getToday() {
  return toDateInputValue(new Date());
}

function formatDatePtBr(value?: string | null) {
  if (!value) {
    return "--";
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return String(value);
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatDateTimePtBr(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function escapeHtml(value?: string | number | null) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeFileName(value?: string | null) {
  return String(value || "estabelecimento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function buildInvoiceHtml(payload: {
  invoiceNumber: string;
  generatedAt: string;
  establishmentName: string;
  establishmentEmail: string;
  category: string;
  planName: string;
  billingCycle: string;
  periodLabel: string;
  redeemedCoupons: number;
  issuedCoupons: number;
  totalParticipations: number;
  conversionRate: string;
  approvalRate: string;
  roi: string;
  unitFee: string;
  totalAmount: string;
}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fatura ${escapeHtml(payload.invoiceNumber)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f8fafc;
      --card: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
      --primary: #4f46e5;
      --accent: #0f766e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 32px;
    }
    .sheet {
      max-width: 920px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding: 32px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #fff;
    }
    .brand {
      font-size: 14px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      opacity: 0.75;
      margin-bottom: 12px;
    }
    .title {
      font-size: 34px;
      font-weight: 800;
      margin: 0 0 8px;
    }
    .subtitle {
      margin: 0;
      color: rgba(255,255,255,0.75);
      font-size: 14px;
      line-height: 1.6;
    }
    .meta {
      min-width: 260px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 18px;
      padding: 20px;
    }
    .meta-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      opacity: 0.7;
      margin-bottom: 6px;
    }
    .meta-value {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 18px;
    }
    .content {
      padding: 32px;
      display: grid;
      gap: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 20px;
      background: #fff;
    }
    .card h3 {
      margin: 0 0 14px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .line {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }
    .line:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .line strong {
      color: var(--text);
    }
    .summary {
      border: 1px solid #c7d2fe;
      background: #eef2ff;
      border-radius: 20px;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-end;
    }
    .summary-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #4338ca;
      font-weight: 700;
    }
    .summary-total {
      font-size: 40px;
      font-weight: 900;
      color: #312e81;
      line-height: 1;
      margin-top: 8px;
    }
    .summary-note {
      max-width: 340px;
      color: #4338ca;
      font-size: 13px;
      line-height: 1.6;
    }
    .footer {
      padding: 0 32px 32px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.7;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .sheet {
        box-shadow: none;
        border: 0;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="header">
      <div>
        <div class="brand">Marque &amp; Ganhe</div>
        <h1 class="title">Fatura de cobrança</h1>
        <p class="subtitle">Documento gerado pelo painel administrativo para conferência de cobrança por resgates de cupons no período selecionado.</p>
      </div>
      <aside class="meta">
        <div class="meta-label">Número da fatura</div>
        <div class="meta-value">${escapeHtml(payload.invoiceNumber)}</div>
        <div class="meta-label">Gerado em</div>
        <div class="meta-value">${escapeHtml(payload.generatedAt)}</div>
      </aside>
    </section>

    <section class="content">
      <div class="grid">
        <section class="card">
          <h3>Estabelecimento</h3>
          <div class="line"><span>Nome</span><strong>${escapeHtml(payload.establishmentName)}</strong></div>
          <div class="line"><span>E-mail</span><strong>${escapeHtml(payload.establishmentEmail)}</strong></div>
          <div class="line"><span>Categoria</span><strong>${escapeHtml(payload.category)}</strong></div>
        </section>

        <section class="card">
          <h3>Plano e período</h3>
          <div class="line"><span>Plano</span><strong>${escapeHtml(payload.planName)}</strong></div>
          <div class="line"><span>Ciclo</span><strong>${escapeHtml(payload.billingCycle)}</strong></div>
          <div class="line"><span>Período</span><strong>${escapeHtml(payload.periodLabel)}</strong></div>
        </section>
      </div>

      <section class="card">
        <h3>Resumo de performance</h3>
        <div class="line"><span>Participações no período</span><strong>${escapeHtml(payload.totalParticipations)}</strong></div>
        <div class="line"><span>Cupons emitidos</span><strong>${escapeHtml(payload.issuedCoupons)}</strong></div>
        <div class="line"><span>Cupons resgatados</span><strong>${escapeHtml(payload.redeemedCoupons)}</strong></div>
        <div class="line"><span>Taxa de conversão</span><strong>${escapeHtml(payload.conversionRate)}</strong></div>
        <div class="line"><span>Taxa de aprovação</span><strong>${escapeHtml(payload.approvalRate)}</strong></div>
        <div class="line"><span>ROI estimado</span><strong>${escapeHtml(payload.roi)}</strong></div>
        <div class="line"><span>Taxa unitária por resgate</span><strong>${escapeHtml(payload.unitFee)}</strong></div>
      </section>

      <section class="summary">
        <div>
          <div class="summary-label">Valor total estimado</div>
          <div class="summary-total">${escapeHtml(payload.totalAmount)}</div>
        </div>
        <div class="summary-note">
          Total calculado com base na quantidade de cupons resgatados multiplicada pela taxa unitária de resgate do plano vigente do estabelecimento.
        </div>
      </section>
    </section>

    <footer class="footer">
      Esta fatura possui caráter administrativo e foi gerada automaticamente pelo painel do super admin.
      Caso necessário, abra o arquivo no navegador e utilize a impressão do sistema para salvar em PDF.
    </footer>
  </main>
</body>
</html>`;
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
  const [selectedAnalyticsEstablishmentId, setSelectedAnalyticsEstablishmentId] =
    useState("");
  const [analyticsFilters, setAnalyticsFilters] = useState({
    startDate: getCurrentMonthStart(),
    endDate: getToday(),
  });
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
  const selectedAnalyticsEstablishment = useMemo(
    () =>
      (establishments || []).find(
        (item) => item.id === selectedAnalyticsEstablishmentId,
      ) || null,
    [establishments, selectedAnalyticsEstablishmentId],
  );
  const selectedPricingPlan = useMemo(
    () =>
      (pricingPlans || []).find(
        (plan) => plan.type === selectedAnalyticsEstablishment?.pricingPlanType,
      ) || null,
    [pricingPlans, selectedAnalyticsEstablishment],
  );
  const analyticsParams = useMemo(() => {
    if (!selectedAnalyticsEstablishmentId) {
      return undefined;
    }

    return {
      establishmentId: selectedAnalyticsEstablishmentId,
      startDate: analyticsFilters.startDate || undefined,
      endDate: analyticsFilters.endDate || undefined,
    };
  }, [analyticsFilters.endDate, analyticsFilters.startDate, selectedAnalyticsEstablishmentId]);

  const { data: analyticsMetrics, isLoading: isLoadingAnalyticsMetrics } = useQuery({
    queryKey: ["super-admin", "analytics", "metrics", analyticsParams],
    queryFn: () => establishmentApi.getMetrics(analyticsParams),
    enabled: Boolean(analyticsParams),
  });

  const { data: analyticsCharts, isLoading: isLoadingAnalyticsCharts } = useQuery({
    queryKey: ["super-admin", "analytics", "charts", analyticsParams],
    queryFn: () => establishmentApi.getCharts(analyticsParams),
    enabled: Boolean(analyticsParams),
  });

  const { data: analyticsRoi, isLoading: isLoadingAnalyticsRoi } = useQuery({
    queryKey: ["super-admin", "analytics", "roi", analyticsParams],
    queryFn: () => establishmentApi.getAnalyticsRoi(analyticsParams),
    enabled: Boolean(analyticsParams),
  });

  const { data: analyticsConversion, isLoading: isLoadingAnalyticsConversion } = useQuery({
    queryKey: ["super-admin", "analytics", "conversion", analyticsParams],
    queryFn: () => establishmentApi.getAnalyticsConversion(analyticsParams),
    enabled: Boolean(analyticsParams),
  });

  const { data: analyticsInsights, isLoading: isLoadingAnalyticsInsights } = useQuery({
    queryKey: ["super-admin", "analytics", "insights", analyticsParams],
    queryFn: () => establishmentApi.getAnalyticsInsights(analyticsParams),
    enabled: Boolean(analyticsParams),
  });
  const estimatedRedemptionCharge =
    Number(analyticsMetrics?.couponsRedeemed || 0) *
    Number(selectedPricingPlan?.redemptionFee || 0);
  const isLoadingAnalyticsPanel =
    isLoadingAnalyticsMetrics ||
    isLoadingAnalyticsCharts ||
    isLoadingAnalyticsRoi ||
    isLoadingAnalyticsConversion ||
    isLoadingAnalyticsInsights;

  function handleDownloadInvoice() {
    if (!selectedAnalyticsEstablishment) {
      return;
    }

    const generatedAt = new Date();
    const invoiceNumber = `FAT-${generatedAt
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${String(selectedAnalyticsEstablishment.id || "")
      .slice(-6)
      .toUpperCase()}`;
    const fileName = `fatura-${sanitizeFileName(
      selectedAnalyticsEstablishment.name,
    )}-${analyticsFilters.endDate || getToday()}.html`;
    const html = buildInvoiceHtml({
      invoiceNumber,
      generatedAt: formatDateTimePtBr(generatedAt),
      establishmentName: selectedAnalyticsEstablishment.name,
      establishmentEmail:
        selectedAnalyticsEstablishment.email || "Sem e-mail cadastrado",
      category: selectedAnalyticsEstablishment.category || "Sem categoria",
      planName: selectedAnalyticsEstablishment.plan,
      billingCycle:
        selectedAnalyticsEstablishment.pricingBillingCycle === "annual"
          ? "Anual"
          : "Mensal",
      periodLabel: `${formatDatePtBr(analyticsFilters.startDate)} até ${formatDatePtBr(
        analyticsFilters.endDate,
      )}`,
      redeemedCoupons: Number(analyticsMetrics?.couponsRedeemed || 0),
      issuedCoupons: Number(analyticsMetrics?.couponsIssued || 0),
      totalParticipations: Number(analyticsMetrics?.totalPosts || 0),
      conversionRate: analyticsConversion?.rate || "0%",
      approvalRate: formatPercentageValue(analyticsConversion?.approvalRate),
      roi: analyticsRoi?.roi || "0%",
      unitFee: formatCurrency(selectedPricingPlan?.redemptionFee || 0),
      totalAmount: formatCurrency(estimatedRedemptionCharge),
    });

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

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
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              <BarChart3 className="h-3.5 w-3.5" />
              Visão por estabelecimento
            </div>
            <h2 className="mt-4 font-heading font-bold text-2xl text-slate-900">
              Cobrança e performance
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Selecione um estabelecimento e um período para acompanhar resgates,
              cupons emitidos, conversão e estimativa de cobrança individual.
            </p>
          </div>

          <div className="grid w-full gap-4 md:grid-cols-2 xl:max-w-4xl xl:grid-cols-[minmax(340px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)]">
            <div className="md:col-span-2 xl:col-span-1 xl:min-w-[340px]">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Estabelecimento
              </label>
              <select
                value={selectedAnalyticsEstablishmentId}
                onChange={(event) =>
                  setSelectedAnalyticsEstablishmentId(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              >
                <option value="">Selecione um estabelecimento</option>
                {(establishments || []).map((item) => (
                  <option key={`analytics-${item.id}`} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Data inicial
              </label>
              <input
                type="date"
                value={analyticsFilters.startDate}
                onChange={(event) =>
                  setAnalyticsFilters((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Data final
              </label>
              <input
                type="date"
                value={analyticsFilters.endDate}
                min={analyticsFilters.startDate || undefined}
                onChange={(event) =>
                  setAnalyticsFilters((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleDownloadInvoice}
            disabled={!selectedAnalyticsEstablishment || isLoadingAnalyticsPanel}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Baixar fatura
          </button>
        </div>

        {!selectedAnalyticsEstablishment ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
            Escolha um estabelecimento acima para carregar o dashboard de cobrança e
            performance no período selecionado.
          </div>
        ) : isLoadingAnalyticsPanel ? (
          <div className="mt-6 flex h-56 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-primary-600" />
                  Resgates
                </div>
                <div className="mt-3 text-3xl font-black text-slate-900">
                  {analyticsMetrics?.couponsRedeemed || 0}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Cupons efetivamente utilizados no período.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Ticket className="h-4 w-4 text-primary-600" />
                  Cupons emitidos
                </div>
                <div className="mt-3 text-3xl font-black text-slate-900">
                  {analyticsMetrics?.couponsIssued || 0}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Base para comparar geração versus resgate.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <TrendingUp className="h-4 w-4 text-primary-600" />
                  Conversão
                </div>
                <div className="mt-3 text-3xl font-black text-slate-900">
                  {analyticsConversion?.rate || "0%"}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Taxa de resgate a partir das aprovações do período.
                </p>
              </div>

              <div className="rounded-2xl border border-primary-200 bg-primary-50 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary-900">
                  <BadgeDollarSign className="h-4 w-4 text-primary-700" />
                  Cobrança estimada
                </div>
                <div className="mt-3 text-3xl font-black text-primary-900">
                  {formatCurrency(estimatedRedemptionCharge)}
                </div>
                <p className="mt-2 text-xs text-primary-700">
                  {formatCurrency(selectedPricingPlan?.redemptionFee || 0)} por resgate no
                  plano {selectedAnalyticsEstablishment.plan}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Estabelecimento selecionado
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {selectedAnalyticsEstablishment.name}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedAnalyticsEstablishment.category || "Sem categoria"} •{" "}
                  {selectedAnalyticsEstablishment.email || "Sem e-mail"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Plano e ciclo
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {selectedAnalyticsEstablishment.plan}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedAnalyticsEstablishment.pricingBillingCycle === "annual"
                    ? "Anual"
                    : "Mensal"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  <CalendarRange className="h-4 w-4" />
                  Período consultado
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {formatDatePtBr(analyticsFilters.startDate)} até{" "}
                  {formatDatePtBr(analyticsFilters.endDate)}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Participações: {analyticsMetrics?.totalPosts || 0} • Aprovação:{" "}
                  {formatPercentageValue(analyticsConversion?.approvalRate)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-heading text-xl font-bold text-slate-900">
                  Evolução de postagens e resgates
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Acompanhe o comportamento diário para validar cobrança e sazonalidade.
                </p>

                <div className="mt-6 h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsCharts || []}
                      margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                        }}
                      />
                      <Bar
                        dataKey="posts"
                        name="Postagens"
                        fill="#9333ea"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="resgates"
                        name="Resgates"
                        fill="#0f766e"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-heading text-xl font-bold text-slate-900">
                  Resumo executivo
                </h3>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      ROI estimado
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900">
                      {analyticsRoi?.roi || "0%"}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Likes totais: {analyticsRoi?.totalLikes || "0"}.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Participações aprovadas e resgate
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      Aprovação {formatPercentageValue(analyticsConversion?.approvalRate)} •
                      Resgate {analyticsConversion?.rate || "0%"}.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Use esse bloco para justificar cobrança, retenção e ajuste de plano.
                    </p>
                  </div>

                  {((analyticsInsights?.cards || []) as InsightCard[]).length > 0 ? (
                    <div className="space-y-3">
                      {((analyticsInsights?.cards || []) as InsightCard[]).map(
                        (card, index) => (
                          <div
                            key={`${card.title}-${index}`}
                            className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3"
                          >
                            <p className="text-sm font-bold text-slate-900">
                              {card.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              {card.description}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      Nenhum insight automático retornado para o filtro atual.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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
