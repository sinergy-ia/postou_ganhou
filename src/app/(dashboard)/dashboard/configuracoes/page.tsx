"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { establishmentApi } from "@/services/establishment-api";
import PricingAdminSection from "@/components/dashboard/PricingAdminSection";
import TeamManagementSection from "@/components/dashboard/TeamManagementSection";
import {
  BadgeDollarSign,
  CheckCircle2,
  Globe,
  Instagram,
  Link2,
  Loader2,
  MapPin,
  Save,
  Store,
  UploadCloud,
} from "lucide-react";

type ConfigSectionId =
  | "profile"
  | "address"
  | "social"
  | "team"
  | "hours"
  | "notifications"
  | "billing";

const baseConfigSections: Array<{
  id: ConfigSectionId;
  label: string;
  description: string;
  available: boolean;
}> = [
  {
    id: "profile",
    label: "Perfil da Loja",
    description: "Capa, logo, nome, categoria, CNPJ e descricao.",
    available: true,
  },
  {
    id: "address",
    label: "Endereço",
    description: "Endereco publico exibido no catalogo.",
    available: true,
  },
  {
    id: "social",
    label: "Redes Sociais",
    description: "Instagram e website do estabelecimento.",
    available: true,
  },
  {
    id: "team",
    label: "Equipe",
    description: "Usuários da mesma conta com perfis owner, manager e viewer.",
    available: true,
  },
  {
    id: "hours",
    label: "Horário de Funcionamento",
    description: "Ainda nao existe campo dessa secao na API atual.",
    available: false,
  },
  {
    id: "notifications",
    label: "Preferências de Notificação",
    description: "Ainda nao existe campo dessa secao na API atual.",
    available: false,
  },
  {
    id: "billing",
    label: "Faturamento",
    description: "Plano atual, limites e informações de cobrança.",
    available: true,
  },
];

const INSTAGRAM_PROFESSIONAL_CONNECT_URL =
  (() => {
    const clientId = process.env.NEXT_PUBLIC_META_APP_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_META_AUTH_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return null;
    }

    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.searchParams.set("force_reauth", "true");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights",
    );

    return url.toString();
  })();

function resolvePlanUserLimit(planType?: "free" | "start" | "pro" | "scale") {
  switch (planType) {
    case "start":
      return 2;
    case "pro":
      return 3;
    case "scale":
      return null;
    case "free":
    default:
      return 1;
  }
}

function normalizeCategoryValue(value?: string | null) {
  const normalized = String(value || "").trim();
  return normalized === "Sem categoria" ? "" : normalized;
}

type ConfigFormData = {
  name: string;
  category: string;
  cnpj: string;
  description: string;
  address: string;
  instagramHandle: string;
  website: string;
  coverUrl: string;
  avatarUrl: string;
};

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

function buildInitialFormData(current: Record<string, unknown> | null | undefined): ConfigFormData {
  return {
    name: String(current?.name || ""),
    category: normalizeCategoryValue(String(current?.category || "")),
    cnpj: String(current?.cnpj || ""),
    description: String(current?.description || ""),
    address: String(current?.address || ""),
    instagramHandle: String(current?.instagramHandle || ""),
    website: String(current?.website || ""),
    coverUrl: String(current?.coverUrl || ""),
    avatarUrl: String(current?.avatarUrl || ""),
  };
}

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<ConfigSectionId>(() => {
    if (typeof window === "undefined") {
      return "profile";
    }

    const savedSection = window.sessionStorage.getItem("marque_e_ganhe_config_section");
    return baseConfigSections.some((section) => section.id === savedSection)
      ? (savedSection as ConfigSectionId)
      : "profile";
  });
  const [draftFormData, setDraftFormData] = useState<ConfigFormData | null>(null);
  const [error, setError] = useState("");

  const [draftCoverPreview, setDraftCoverPreview] = useState<string | null>(null);
  const [draftAvatarPreview, setDraftAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("marque_e_ganhe_config_section");
    }
  }, []);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem."));
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "cover" | "avatar",
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);

      if (type === "cover") {
        setDraftCoverPreview(dataUrl);
        setDraftFormData((prev) => ({
          ...(prev ?? initialFormData),
          coverUrl: dataUrl,
        }));
      } else {
        setDraftAvatarPreview(dataUrl);
        setDraftFormData((prev) => ({
          ...(prev ?? initialFormData),
          avatarUrl: dataUrl,
        }));
      }
    } catch (fileError) {
      setError(
        fileError instanceof Error
          ? fileError.message
          : "Nao foi possivel carregar a imagem.",
      );
    }
  };

  const { data: me } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => establishmentApi.getSettings(),
  });
  const establishment = settings || me;
  const isMetaConnected = Boolean(establishment?.metaConnected);
  const establishmentId = establishment?.id || establishment?._id;
  const canEditSettings = (establishment?.currentUserRole || "owner") === "owner";
  const configSections = useMemo(
    () => baseConfigSections,
    [],
  );
  const activeSectionMeta =
    configSections.find((section) => section.id === activeSection) ||
    configSections[0];
  const initialFormData = buildInitialFormData(establishment);
  const formData = draftFormData ?? initialFormData;
  const coverPreview = draftCoverPreview ?? formData.coverUrl ?? null;
  const avatarPreview = draftAvatarPreview ?? formData.avatarUrl ?? null;
  const canSaveCurrentSection =
    canEditSettings &&
    (activeSection === "profile" ||
      activeSection === "address" ||
      activeSection === "social");

  const updateMutation = useMutation({
    mutationFn: (payload: ConfigFormData) =>
      establishmentApi.updateSettings({
        ...payload,
        category: normalizeCategoryValue(payload.category),
      }),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["establishment-me"] });
      alert("Configuracoes salvas com sucesso!");
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nao foi possivel salvar as configuracoes."));
    },
  });

  const connectInstagramMutation = useMutation({
    mutationFn: async () => {
      if (!INSTAGRAM_PROFESSIONAL_CONNECT_URL) {
        throw new Error(
          "Defina NEXT_PUBLIC_META_APP_CLIENT_ID e NEXT_PUBLIC_META_AUTH_REDIRECT_URI no arquivo .env.",
        );
      }

      const url = new URL(INSTAGRAM_PROFESSIONAL_CONNECT_URL);
      const frontendOrigin =
        typeof window !== 'undefined' ? window.location.origin : '';

      if (establishmentId) {
        url.searchParams.set(
          "state",
          `instagram:${String(establishmentId)}:${encodeURIComponent(frontendOrigin)}`,
        );
      } else {
        url.searchParams.set(
          "state",
          `instagram::${encodeURIComponent(frontendOrigin)}`,
        );
      }

      return url.toString();
    },
    onSuccess: (url) => {
      setError("");

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "marque_e_ganhe_after_meta_connect",
          "/dashboard/configuracoes",
        );
        window.sessionStorage.setItem(
          "marque_e_ganhe_config_section",
          "social",
        );
        window.location.href = url;
      }
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(
          mutationError,
          "Nao foi possivel iniciar a conexao com o Instagram profissional.",
        ),
      );
    },
  });

  const handleTextFieldChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    setError("");
    setDraftFormData((prev) => ({ ...(prev ?? initialFormData), [name]: value }));

    if (name === "coverUrl") {
      setDraftCoverPreview(value || null);
    }

    if (name === "avatarUrl") {
      setDraftAvatarPreview(value || null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-3xl text-slate-900">
            Configurações da Loja
          </h1>
          <p className="text-slate-500 mt-1">
            Atualize as informações públicas do seu estabelecimento.
          </p>
        </div>
        <button
          disabled={updateMutation.isPending || !canSaveCurrentSection}
          onClick={() => updateMutation.mutate(formData)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md shadow-primary-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}{" "}
          Salvar Alterações
        </button>
      </div>

      {!canEditSettings ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900">
          Apenas o perfil <span className="font-bold">owner</span> pode alterar as configurações da loja. Seu acesso atual é somente leitura nesta área.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {configSections.map((section) => {
            const isActive = section.id === activeSection;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-5 py-3 rounded-xl font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{section.label}</span>
                  {!section.available ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      em breve
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="font-heading font-bold text-xl text-slate-900 mb-2">
              {activeSectionMeta.label}
            </h2>
            <p className="text-sm text-slate-500">
              {activeSectionMeta.description}
            </p>
          </section>

          {activeSection === "profile" ? (
            <>
              <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h2 className="font-heading font-bold text-xl text-slate-900 mb-6">
                  Imagens Principais
                </h2>

                <div className="space-y-6">
                  <div>
                    <span className="block text-sm font-bold text-slate-700 mb-2">
                      Capa do Estabelecimento
                    </span>
                    <label className="h-48 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors cursor-pointer group relative overflow-hidden">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, "cover")}
                      />
                      {coverPreview ? (
                        <img
                          src={coverPreview}
                          alt="Capa"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-6 h-6 text-primary-600" />
                          </div>
                          <span className="text-sm font-medium">
                            Clique para enviar imagem de capa
                          </span>
                          <span className="text-xs">
                            1200 x 800px recomendado (JPG, PNG)
                          </span>
                        </>
                      )}
                    </label>
                    <input
                      type="url"
                      name="coverUrl"
                      value={formData.coverUrl}
                      onChange={handleTextFieldChange}
                      placeholder="Ou cole a URL da capa"
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <span className="block text-sm font-bold text-slate-700 mb-2">
                      Logo / Avatar
                    </span>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 overflow-hidden">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Store className="w-8 h-8" />
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <label className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl px-4 py-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors cursor-pointer group relative">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleImageChange(e, "avatar")}
                          />
                          <span className="text-sm font-medium">
                            Avatar ou Logo quadrada
                          </span>
                          <span className="text-xs">400 x 400px mínimo</span>
                        </label>
                        <input
                          type="url"
                          name="avatarUrl"
                          value={formData.avatarUrl}
                          onChange={handleTextFieldChange}
                          placeholder="Ou cole a URL da logo"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h2 className="font-heading font-bold text-xl text-slate-900 mb-6">
                  Informações Básicas
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Nome do Estabelecimento *
                    </label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleTextFieldChange}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Categoria
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleTextFieldChange}
                      className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                    >
                      <option value="" disabled className="text-slate-500">
                        Selecione uma categoria...
                      </option>
                      <option value="Restaurantes" className="text-slate-900">
                        Restaurantes
                      </option>
                      <option value="Cafeterias" className="text-slate-900">
                        Cafeterias
                      </option>
                      <option value="Moda" className="text-slate-900">
                        Moda
                      </option>
                      <option value="Serviços" className="text-slate-900">
                        Serviços
                      </option>
                      <option value="Outros" className="text-slate-900">
                        Outros
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      name="cnpj"
                      value={formData.cnpj}
                      onChange={handleTextFieldChange}
                      placeholder="00.000.000/0000-00"
                      className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Descrição curta Comercial
                    </label>
                    <textarea
                      rows={3}
                      name="description"
                      value={formData.description}
                      onChange={handleTextFieldChange}
                      className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none resize-none"
                    ></textarea>
                    <p className="text-xs text-slate-500 mt-1">
                      Essa descrição aparecerá no app para os clientes na área
                      de descoberta.
                    </p>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {activeSection === "address" ? (
            <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="font-heading font-bold text-xl text-slate-900 mb-6">
                Localização
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Endereço Completo
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleTextFieldChange}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Esse endereço é o que aparece para os clientes no catálogo e
                  nas páginas públicas.
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === "social" ? (
            <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="font-heading font-bold text-xl text-slate-900 mb-6">
                Presença Digital
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  className={`md:col-span-2 rounded-2xl border p-5 ${
                    isMetaConnected
                      ? "border-green-200 bg-green-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {isMetaConnected ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Link2 className="h-5 w-5 text-slate-500" />
                        )}
                        <span className="font-bold text-slate-900">
                          {isMetaConnected
                            ? "Instagram profissional conectado"
                            : "Instagram profissional desconectado"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Conecte via Meta para rastrear marcacoes no lugar,
                        mentions e postagens das campanhas.
                      </p>
                      {isMetaConnected ? (
                        <div className="mt-3 space-y-1 text-xs text-slate-600">
                          <div>
                            <span className="font-bold text-slate-800">
                              Instagram:
                            </span>{" "}
                            {establishment?.instagramHandle || "Conectado"}
                          </div>
                          {establishment?.facebookPageId ? (
                            <div>
                              <span className="font-bold text-slate-800">
                                Página Facebook:
                              </span>{" "}
                              {establishment.facebookPageId}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => connectInstagramMutation.mutate()}
                      disabled={
                        connectInstagramMutation.isPending || !establishmentId
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {connectInstagramMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {isMetaConnected
                        ? "Reconectar Instagram Profissional"
                        : "Conectar Instagram Profissional"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Instagram
                  </label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="instagramHandle"
                      value={formData.instagramHandle}
                      onChange={handleTextFieldChange}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleTextFieldChange}
                      placeholder="https://..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === "team" ? <TeamManagementSection /> : null}

          {activeSection === "billing" && establishment?.superAdmin ? (
            <PricingAdminSection />
          ) : null}

          {activeSection === "billing" && !establishment?.superAdmin ? (
            <section className="space-y-6">
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-700">
                      <BadgeDollarSign className="h-3.5 w-3.5" />
                      Plano atual
                    </div>
                    <h2 className="mt-4 font-heading font-bold text-2xl text-slate-900">
                      {establishment?.plan || "Free"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Ciclo{" "}
                      {establishment?.pricingBillingCycle === "annual"
                        ? "anual"
                        : "mensal"}{" "}
                      • até{" "}
                      {establishment?.planAccess?.limits?.maxActiveCampaigns ??
                        "campanhas ilimitadas"}{" "}
                      campanhas ativas
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                    <div className="font-semibold text-slate-900">
                      Limite mensal de participações
                    </div>
                    <div className="mt-2">
                      {establishment?.planAccess?.limits?.maxMonthlyParticipations ??
                        "Ilimitado"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                    <div className="font-semibold text-slate-900">
                      Limite de usuários
                    </div>
                    <div className="mt-2">
                      {resolvePlanUserLimit(establishment?.planAccess?.planType) === null
                        ? "Ilimitado"
                        : resolvePlanUserLimit(establishment?.planAccess?.planType)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h2 className="font-heading font-bold text-xl text-slate-900 mb-4">
                  Recursos liberados no seu plano
                </h2>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(establishment?.planAccess?.features || {})
                    .filter(([, enabled]) => Boolean(enabled))
                    .map(([feature]) => (
                      <span
                        key={feature}
                        className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
                      >
                        {feature}
                      </span>
                    ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-3xl px-6 py-5 text-sm text-amber-900 shadow-sm">
                A alteração de plano é uma ação restrita ao super admin da plataforma.
                Se você precisa de upgrade, downgrade ou white-label, entre em contato
                com a equipe responsável pelo Marque &amp; Ganhe.
              </div>
            </section>
          ) : null}

          {!activeSectionMeta.available ? (
            <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="font-heading font-bold text-xl text-slate-900 mb-4">
                {activeSectionMeta.label}
              </h2>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                Essa seção ainda não tem campos expostos pela API atual do
                Marque &amp; Ganhe. Por enquanto, a tela já permite editar perfil,
                endereço e redes sociais normalmente.
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
