"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  FlaskConical,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  RefreshCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  MARKETPLACE_PLATFORMS,
  marketplaceApi,
  type MarketplaceIntegrationRecord,
  type MarketplacePlatform,
} from "@/services/marketplace-api";

type Props = {
  canEdit: boolean;
};

type IntegrationDraft = {
  enabled: boolean;
  shopIdentifier: string;
  shopUrl: string;
  accessToken: string;
  refreshToken: string;
  storeId: string;
  shopDomain: string;
  merchantId: string;
  clientId: string;
  clientSecret: string;
  authorizationCode: string;
  apiVersion: string;
  userAgent: string;
  itemEan: string;
  itemEans: string;
};

const PLATFORM_LABEL: Record<MarketplacePlatform, string> = {
  NUVEMSHOP: "Nuvemshop",
  SHOPIFY: "Shopify",
  IFOOD: "iFood",
};

function getShopIdentifierPlaceholder(platform: MarketplacePlatform) {
  switch (platform) {
    case "NUVEMSHOP":
      return "Ex.: 1234567";
    case "SHOPIFY":
      return "Ex.: minha-loja.myshopify.com";
    case "IFOOD":
      return "Ex.: merchant-uuid-ifood";
    default:
      return "";
  }
}

function getShopUrlPlaceholder(platform: MarketplacePlatform) {
  switch (platform) {
    case "NUVEMSHOP":
      return "Ex.: https://minha-loja.lojavirtualnuvem.com.br";
    case "SHOPIFY":
      return "Ex.: https://minha-loja.myshopify.com";
    case "IFOOD":
      return "Ex.: https://merchant.ifood.com.br";
    default:
      return "";
  }
}

function getAccessTokenPlaceholder(platform: MarketplacePlatform) {
  switch (platform) {
    case "NUVEMSHOP":
      return "Ex.: token-da-nuvemshop";
    case "SHOPIFY":
      return "Ex.: shpat_xxxxx";
    case "IFOOD":
      return "Ex.: token-ifood";
    default:
      return "";
  }
}

function getShopIdentifierHint(platform: MarketplacePlatform) {
  switch (platform) {
    case "NUVEMSHOP":
      return "Use o ID da loja no admin da Nuvemshop.";
    case "SHOPIFY":
      return "Use o dominio principal da loja no admin da Shopify.";
    case "IFOOD":
      return "Use o merchantId no portal Merchant do iFood.";
    default:
      return "";
  }
}

function getShopUrlHint(platform: MarketplacePlatform) {
  switch (platform) {
    case "NUVEMSHOP":
      return "URL publica da loja Nuvemshop (opcional).";
    case "SHOPIFY":
      return "URL da loja myshopify.com cadastrada no admin.";
    case "IFOOD":
      return "URL de referencia da operacao no iFood (opcional).";
    default:
      return "";
  }
}

function getAccessTokenHint(platform: MarketplacePlatform) {
  switch (platform) {
    case "NUVEMSHOP":
      return "Token do app privado/criado para integracao na Nuvemshop.";
    case "SHOPIFY":
      return "Admin API access token do app no painel Shopify.";
    case "IFOOD":
      return "Access token OAuth do iFood (opcional se for usar exchange-code).";
    default:
      return "";
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

function toDraft(
  platform: MarketplacePlatform,
  integration?: MarketplaceIntegrationRecord | null,
): IntegrationDraft {
  const settings = integration?.settings || {};

  return {
    enabled: Boolean(integration?.enabled),
    shopIdentifier: String(integration?.shopIdentifier || ""),
    shopUrl: String(integration?.shopUrl || ""),
    accessToken: "",
    refreshToken: "",
    storeId: platform === "NUVEMSHOP" ? String(integration?.shopIdentifier || "") : "",
    shopDomain: platform === "SHOPIFY" ? String(integration?.shopIdentifier || "") : "",
    merchantId: platform === "IFOOD" ? String(integration?.shopIdentifier || "") : "",
    clientId: "",
    clientSecret: "",
    authorizationCode: "",
    apiVersion: String(settings.apiVersion || "2026-01"),
    userAgent: String(settings.userAgent || ""),
    itemEan: String(settings.itemEan || ""),
    itemEans: Array.isArray(settings.itemEans) ? settings.itemEans.join(", ") : "",
  };
}

function buildPayload(platform: MarketplacePlatform, draft: IntegrationDraft) {
  const credentials: Record<string, string> = {};
  const settings: Record<string, string | string[]> = {};

  if (draft.accessToken.trim()) {
    credentials.accessToken = draft.accessToken.trim();
  }

  if (platform === "NUVEMSHOP") {
    if (draft.storeId.trim()) {
      credentials.storeId = draft.storeId.trim();
    }
    if (draft.userAgent.trim()) {
      settings.userAgent = draft.userAgent.trim();
    }
  }

  if (platform === "SHOPIFY") {
    if (draft.shopDomain.trim()) {
      credentials.shopDomain = draft.shopDomain.trim();
    }
    settings.apiVersion = draft.apiVersion.trim() || "2026-01";
  }

  if (platform === "IFOOD") {
    if (draft.clientId.trim()) {
      credentials.clientId = draft.clientId.trim();
    }
    if (draft.clientSecret.trim()) {
      credentials.clientSecret = draft.clientSecret.trim();
    }
    if (draft.merchantId.trim()) {
      credentials.merchantId = draft.merchantId.trim();
    }
    if (draft.accessToken.trim()) {
      credentials.accessToken = draft.accessToken.trim();
    }
    if (draft.refreshToken.trim()) {
      credentials.refreshToken = draft.refreshToken.trim();
    }
    if (draft.itemEan.trim()) {
      settings.itemEan = draft.itemEan.trim();
    }
    const itemEans = draft.itemEans
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (itemEans.length > 0) {
      settings.itemEans = itemEans;
    }
  }

  return {
    platform,
    enabled: draft.enabled,
    shopIdentifier: draft.shopIdentifier.trim(),
    shopUrl: draft.shopUrl.trim(),
    credentials,
    settings,
  };
}

function buildIfoodSettingsPayload(draft: IntegrationDraft) {
  const settings: Record<string, string | string[]> = {};
  if (draft.itemEan.trim()) {
    settings.itemEan = draft.itemEan.trim();
  }
  const itemEans = draft.itemEans
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (itemEans.length > 0) {
    settings.itemEans = itemEans;
  }
  return settings;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Nao testado";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Nao testado" : date.toLocaleString("pt-BR");
}

export default function MarketplaceIntegrationsSection({ canEdit }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedPlatform, setExpandedPlatform] = useState<MarketplacePlatform | null>(null);
  const [drafts, setDrafts] = useState<Record<MarketplacePlatform, IntegrationDraft>>({
    NUVEMSHOP: toDraft("NUVEMSHOP", null),
    SHOPIFY: toDraft("SHOPIFY", null),
    IFOOD: toDraft("IFOOD", null),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-integrations"],
    queryFn: marketplaceApi.getIntegrations,
    enabled: canEdit,
  });

  const integrationsByPlatform = useMemo(() => {
    const map = new Map<MarketplacePlatform, MarketplaceIntegrationRecord>();
    for (const integration of data?.integrations || []) {
      map.set(integration.platform, integration);
    }
    return map;
  }, [data]);

  useEffect(() => {
    setDrafts({
      NUVEMSHOP: toDraft("NUVEMSHOP", integrationsByPlatform.get("NUVEMSHOP")),
      SHOPIFY: toDraft("SHOPIFY", integrationsByPlatform.get("SHOPIFY")),
      IFOOD: toDraft("IFOOD", integrationsByPlatform.get("IFOOD")),
    });
  }, [integrationsByPlatform]);

  const saveMutation = useMutation({
    mutationFn: ({ platform, draft }: { platform: MarketplacePlatform; draft: IntegrationDraft }) =>
      marketplaceApi.upsertIntegration(platform, buildPayload(platform, draft)),
    onSuccess: () => {
      setError("");
      setSuccess("Integracao salva com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["marketplace-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nao foi possivel salvar a integracao."));
    },
  });

  const testMutation = useMutation({
    mutationFn: (platform: MarketplacePlatform) => marketplaceApi.testIntegration(platform),
    onSuccess: (response) => {
      setError("");
      setSuccess(
        response.success
          ? "Conexao validada com sucesso."
          : response.error || "Falha na validacao da integracao.",
      );
      queryClient.invalidateQueries({ queryKey: ["marketplace-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nao foi possivel testar a integracao."));
    },
  });

  const clearCredentialsMutation = useMutation({
    mutationFn: (platform: MarketplacePlatform) =>
      marketplaceApi.upsertIntegration(platform, {
        platform,
        clearCredentials: true,
      }),
    onSuccess: () => {
      setError("");
      setSuccess("Credenciais removidas com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["marketplace-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nao foi possivel limpar as credenciais."));
    },
  });

  const ifoodLinkMutation = useMutation({
    mutationFn: (draft: IntegrationDraft) =>
      marketplaceApi.linkIfoodIntegration({
        enabled: draft.enabled,
        shopIdentifier: draft.shopIdentifier.trim(),
        clientId: draft.clientId.trim() || undefined,
        clientSecret: draft.clientSecret.trim() || undefined,
        merchantId: draft.merchantId.trim() || undefined,
        settings: buildIfoodSettingsPayload(draft),
      }),
    onSuccess: (response) => {
      setError("");
      setSuccess(
        response?.link?.userCode
          ? `Vinculo iniciado. User code: ${response.link.userCode}`
          : "Vinculo iFood iniciado com sucesso.",
      );
      queryClient.invalidateQueries({ queryKey: ["marketplace-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nao foi possivel iniciar o vinculo do iFood."));
    },
  });

  const ifoodExchangeCodeMutation = useMutation({
    mutationFn: (draft: IntegrationDraft) =>
      marketplaceApi.exchangeIfoodCode({
        authorizationCode: draft.authorizationCode.trim(),
        merchantId: draft.merchantId.trim() || undefined,
        shopIdentifier: draft.shopIdentifier.trim() || undefined,
        clientId: draft.clientId.trim() || undefined,
        clientSecret: draft.clientSecret.trim() || undefined,
      }),
    onSuccess: (response) => {
      setError("");
      setSuccess(
        response.success
          ? "Authorization code trocado por token com sucesso."
          : "Exchange executado. Confira o status do token.",
      );
      queryClient.invalidateQueries({ queryKey: ["marketplace-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nao foi possivel trocar o authorization code."));
    },
  });

  const ifoodRefreshTokenMutation = useMutation({
    mutationFn: (draft: IntegrationDraft) =>
      marketplaceApi.refreshIfoodToken({
        refreshToken: draft.refreshToken.trim() || undefined,
      }),
    onSuccess: (response) => {
      setError("");
      setSuccess(
        response.success
          ? "Token iFood renovado com sucesso."
          : "Refresh executado. Confira o status do token.",
      );
      queryClient.invalidateQueries({ queryKey: ["marketplace-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nao foi possivel renovar o token do iFood."));
    },
  });

  const updateDraft = (
    platform: MarketplacePlatform,
    field: keyof IntegrationDraft,
    value: string | boolean,
  ) => {
    if (!canEdit) {
      return;
    }

    setDrafts((current) => ({
      ...current,
      [platform]: {
        ...current[platform],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex h-52 items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Cadastre as credenciais por estabelecimento e valide a conexao antes de sincronizar cupons.
        Plataformas suportadas: <span className="font-bold">NUVEMSHOP, SHOPIFY e IFOOD</span>.
      </div>

      {!canEdit ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900">
          Apenas o perfil <span className="font-bold">owner</span> pode cadastrar e testar
          integracoes de marketplace.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm font-medium text-green-700">
          {success}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5">
        {(data?.availablePlatforms || [...MARKETPLACE_PLATFORMS]).map((platform) => {
          const integration = integrationsByPlatform.get(platform);
          const draft = drafts[platform];
          const isBusy =
            saveMutation.isPending || testMutation.isPending || clearCredentialsMutation.isPending;
          const isIfoodBusy =
            ifoodLinkMutation.isPending ||
            ifoodExchangeCodeMutation.isPending ||
            ifoodRefreshTokenMutation.isPending;
          const isExpanded = expandedPlatform === platform;

          return (
            <article
              key={platform}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedPlatform((current) => (current === platform ? null : platform))
                }
                className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
              >
                <div>
                  <h3 className="font-heading text-xl font-bold text-slate-900">
                    {PLATFORM_LABEL[platform]}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ultimo teste: {formatDateTime(integration?.lastTestedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {integration?.connected ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Nao conectado
                    </span>
                  )}
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                    Teste: {integration?.lastTestStatus || "NEVER_TESTED"}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {isExpanded ? (
                <>
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="block">
                        <span className="text-sm font-bold text-slate-700">Identificador da loja</span>
                        <span className="block text-xs text-slate-500">
                          {getShopIdentifierHint(platform)}
                        </span>
                      </span>
                      <input
                        type="text"
                        value={draft?.shopIdentifier || ""}
                        disabled={!canEdit}
                        onChange={(event) =>
                          updateDraft(platform, "shopIdentifier", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                        placeholder={getShopIdentifierPlaceholder(platform)}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="block">
                        <span className="text-sm font-bold text-slate-700">URL da loja (opcional)</span>
                        <span className="block text-xs text-slate-500">
                          {getShopUrlHint(platform)}
                        </span>
                      </span>
                      <input
                        type="text"
                        value={draft?.shopUrl || ""}
                        disabled={!canEdit}
                        onChange={(event) => updateDraft(platform, "shopUrl", event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                        placeholder={getShopUrlPlaceholder(platform)}
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="block">
                        <span className="text-sm font-bold text-slate-700">Access token</span>
                        <span className="block text-xs text-slate-500">
                          {getAccessTokenHint(platform)}
                        </span>
                      </span>
                      <input
                        type="password"
                        value={draft?.accessToken || ""}
                        disabled={!canEdit}
                        onChange={(event) => updateDraft(platform, "accessToken", event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                        placeholder={getAccessTokenPlaceholder(platform)}
                      />
                    </label>

                    {platform === "NUVEMSHOP" ? (
                      <>
                        <label className="space-y-2">
                          <span className="block">
                            <span className="text-sm font-bold text-slate-700">Store ID</span>
                            <span className="block text-xs text-slate-500">
                              Pegue no admin da Nuvemshop (identificador numerico da loja).
                            </span>
                          </span>
                          <input
                            type="text"
                            value={draft?.storeId || ""}
                            disabled={!canEdit}
                            onChange={(event) => updateDraft(platform, "storeId", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                            placeholder="1234567"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="block">
                            <span className="text-sm font-bold text-slate-700">User-Agent</span>
                            <span className="block text-xs text-slate-500">
                              Defina o identificador do seu app/contato para a Nuvemshop.
                            </span>
                          </span>
                          <input
                            type="text"
                            value={draft?.userAgent || ""}
                            disabled={!canEdit}
                            onChange={(event) => updateDraft(platform, "userAgent", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                            placeholder="SlotFlow (contato@slotflow.com.br)"
                          />
                        </label>
                      </>
                    ) : null}

                    {platform === "SHOPIFY" ? (
                      <>
                        <label className="space-y-2">
                          <span className="block">
                            <span className="text-sm font-bold text-slate-700">Shop domain</span>
                            <span className="block text-xs text-slate-500">
                              Use o dominio exibido em Settings &gt; Domains no admin Shopify.
                            </span>
                          </span>
                          <input
                            type="text"
                            value={draft?.shopDomain || ""}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateDraft(platform, "shopDomain", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                            placeholder="minha-loja.myshopify.com"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="block">
                            <span className="text-sm font-bold text-slate-700">API version</span>
                            <span className="block text-xs text-slate-500">
                              Versao da Admin API escolhida no app Shopify.
                            </span>
                          </span>
                          <input
                            type="text"
                            value={draft?.apiVersion || ""}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateDraft(platform, "apiVersion", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                          />
                        </label>
                      </>
                    ) : null}

                    {platform === "IFOOD" ? (
                      <>
                        <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                          Fluxo distribuido iFood: salve <span className="font-bold">clientId</span>{" "}
                          e <span className="font-bold">clientSecret</span>, inicie o vinculo, autorize
                          no portal iFood e troque o <span className="font-bold">authorizationCode</span>{" "}
                          por tokens.
                        </div>

                        <label className="space-y-2">
                          <span className="block">
                            <span className="text-sm font-bold text-slate-700">Client ID</span>
                            <span className="block text-xs text-slate-500">
                              Gerado no app distribuido criado no portal iFood Developer.
                            </span>
                          </span>
                          <input
                            type="text"
                            value={draft?.clientId || ""}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateDraft(platform, "clientId", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                            placeholder="Ex.: 59b26b8d-3837-4ced-89c3-2891737be6c2"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="block">
                            <span className="text-sm font-bold text-slate-700">Client Secret</span>
                            <span className="block text-xs text-slate-500">
                              Segredo do app distribuido no portal iFood Developer.
                            </span>
                          </span>
                          <input
                            type="password"
                            value={draft?.clientSecret || ""}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateDraft(platform, "clientSecret", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                            placeholder="Ex.: seu-client-secret"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="block">
                            <span className="text-sm font-bold text-slate-700">Merchant ID</span>
                            <span className="block text-xs text-slate-500">
                              Copie o merchantId no portal Merchant/API do iFood.
                            </span>
                          </span>
                          <input
                            type="text"
                            value={draft?.merchantId || ""}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateDraft(platform, "merchantId", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                            placeholder="merchant-uuid-ifood"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="block">
                            <span className="text-sm font-bold text-slate-700">Refresh token</span>
                            <span className="block text-xs text-slate-500">
                              Opcional no cadastro manual. Normalmente vem do exchange-code.
                            </span>
                          </span>
                          <input
                            type="password"
                            value={draft?.refreshToken || ""}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateDraft(platform, "refreshToken", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                            placeholder="Ex.: refresh-token-ifood"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <span className="block">
                            <span className="text-sm font-bold text-slate-700">Authorization code</span>
                            <span className="block text-xs text-slate-500">
                              Codigo retornado pelo iFood apos o lojista concluir a autorizacao.
                            </span>
                          </span>
                          <input
                            type="text"
                            value={draft?.authorizationCode || ""}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateDraft(platform, "authorizationCode", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                            placeholder="Ex.: codigo-retornado-pelo-ifood"
                          />
                        </label>

                        <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-800">
                          Para promocao por item, preencha <span className="font-bold">itemEan</span>{" "}
                          ou <span className="font-bold">itemEans</span>. Nao e obrigatorio preencher os
                          dois.
                        </div>

                        <label className="space-y-2">
                          <span className="block">
                            <span className="text-sm font-bold text-slate-700">itemEan</span>
                            <span className="block text-xs text-slate-500">
                              EAN do item promocional no catalogo do iFood.
                            </span>
                          </span>
                          <input
                            type="text"
                            value={draft?.itemEan || ""}
                            disabled={!canEdit}
                            onChange={(event) => updateDraft(platform, "itemEan", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                            placeholder="7891234567890"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <span className="block">
                            <span className="text-sm font-bold text-slate-700">
                              itemEans (separados por virgula)
                            </span>
                            <span className="block text-xs text-slate-500">
                              Lista de EANs do catalogo iFood que participam da promocao.
                            </span>
                          </span>
                          <input
                            type="text"
                            value={draft?.itemEans || ""}
                            disabled={!canEdit}
                            onChange={(event) => updateDraft(platform, "itemEans", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                            placeholder="7891234567890, 7891234567891"
                          />
                        </label>

                        <div className="md:col-span-2 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                          <button
                            type="button"
                            disabled={!canEdit || isBusy || isIfoodBusy}
                            onClick={() => ifoodLinkMutation.mutate(draft)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {ifoodLinkMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <LinkIcon className="h-3.5 w-3.5" />
                            )}
                            Iniciar vinculo
                          </button>

                          <button
                            type="button"
                            disabled={
                              !canEdit ||
                              isBusy ||
                              isIfoodBusy ||
                              !draft.authorizationCode.trim()
                            }
                            onClick={() => ifoodExchangeCodeMutation.mutate(draft)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {ifoodExchangeCodeMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <KeyRound className="h-3.5 w-3.5" />
                            )}
                            Trocar codigo
                          </button>

                          <button
                            type="button"
                            disabled={!canEdit || isBusy || isIfoodBusy}
                            onClick={() => ifoodRefreshTokenMutation.mutate(draft)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {ifoodRefreshTokenMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCcw className="h-3.5 w-3.5" />
                            )}
                            Renovar token
                          </button>
                        </div>

                        {integration?.token ? (
                          <div className="md:col-span-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-xs text-green-800">
                            <div className="font-bold">Status de token iFood</div>
                            <div className="mt-1">
                              Access token: {integration.token.hasAccessToken ? "sim" : "nao"} •
                              Refresh token: {integration.token.hasRefreshToken ? "sim" : "nao"}
                            </div>
                            {integration.token.expiresAt ? (
                              <div className="mt-1">Expira em: {formatDateTime(integration.token.expiresAt)}</div>
                            ) : null}
                          </div>
                        ) : null}

                        {integration?.ifoodLink?.hasPendingUserCode ? (
                          <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                            <div className="font-bold">Vinculo pendente no iFood</div>
                            <div className="mt-1">
                              User code:{" "}
                              <span className="font-mono font-bold">
                                {integration.ifoodLink.pendingUserCode || "Nao informado"}
                              </span>
                            </div>
                            {integration.ifoodLink.verificationUrlComplete ? (
                              <a
                                href={integration.ifoodLink.verificationUrlComplete}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 font-bold underline"
                              >
                                Abrir pagina de autorizacao
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                            {integration.ifoodLink.pendingUserCodeExpiresAt ? (
                              <div className="mt-1">
                                Expira em:{" "}
                                {formatDateTime(integration.ifoodLink.pendingUserCodeExpiresAt)}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(draft?.enabled)}
                        disabled={!canEdit}
                        onChange={(event) => updateDraft(platform, "enabled", event.target.checked)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      Integracao habilitada
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!canEdit || isBusy}
                        onClick={() => saveMutation.mutate({ platform, draft })}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Salvar
                      </button>

                      <button
                        type="button"
                        disabled={!canEdit || isBusy}
                        onClick={() => testMutation.mutate(platform)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {testMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FlaskConical className="h-4 w-4" />
                        )}
                        Testar conexao
                      </button>

                      <button
                        type="button"
                        disabled={!canEdit || isBusy}
                        onClick={() => clearCredentialsMutation.mutate(platform)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {clearCredentialsMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Limpar credenciais
                      </button>
                    </div>
                  </div>

                  {integration?.lastTestError ? (
                    <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                      Erro do ultimo teste: {integration.lastTestError}
                    </div>
                  ) : null}

                  {integration?.hasCredentials ? (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                      Credenciais salvas com seguranca. Para atualizar, preencha somente os campos
                      desejados e salve novamente.
                    </div>
                  ) : null}
                </>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
