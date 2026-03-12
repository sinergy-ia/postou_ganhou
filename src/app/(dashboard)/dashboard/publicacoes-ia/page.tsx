"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PaginationControls from "@/components/dashboard/PaginationControls";
import FeatureUpgradeNotice from "@/components/dashboard/FeatureUpgradeNotice";
import {
  establishmentApi,
  type AiPostMode,
  type AiPostRecord,
  type AiPostType,
  type AiVideoDurationSeconds,
} from "@/services/establishment-api";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  RefreshCw,
  Save,
  Send,
  Sparkles,
} from "lucide-react";

type GenerateFormState = {
  mode: AiPostMode;
  campaignId: string;
  postType: AiPostType;
  prompt: string;
  topic: string;
  briefing: string;
  targetAudience: string;
  callToAction: string;
  timezone: string;
  generateImage: boolean;
  generateVideo: boolean;
  durationSeconds: AiVideoDurationSeconds;
  videoLanguage: VideoLanguageOption;
  imagePrompt: string;
  videoPrompt: string;
};

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

type DraftState = {
  postId: string;
  mode: AiPostMode;
  campaignId: string;
  postType: AiPostType;
  prompt: string;
  topic: string;
  briefing: string;
  targetAudience: string;
  callToAction: string;
  generateImage: boolean;
  generateVideo: boolean;
  durationSeconds: AiVideoDurationSeconds;
  videoLanguage: VideoLanguageOption;
  imagePrompt: string;
  videoPrompt: string;
  caption: string;
  hashtags: string;
  timezone: string;
  schedule: string;
};

type CampaignSelectorItem = {
  id?: string;
  _id?: string;
  title?: string;
  hashtagRequired?: string;
};

type VideoLanguageOption = "pt-BR" | "en";
type AiPostsSection = "generate" | "library";
type FieldSuggestion = {
  label: string;
  value: string;
};

const DEFAULT_TIMEZONE = "America/Sao_Paulo";
const VIDEO_DURATION_OPTIONS: AiVideoDurationSeconds[] = [4, 6, 8];
const LIBRARY_PAGE_SIZE = 20;
const VIDEO_LANGUAGE_OPTIONS: Array<{
  value: VideoLanguageOption;
  label: string;
}> = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en", label: "Inglês" },
];

const VIDEO_LANGUAGE_SUFFIXES: Record<VideoLanguageOption, string> = {
  "pt-BR": "Idioma do vídeo: Português do Brasil.",
  en: "Idioma do vídeo: Inglês.",
};

function parseVideoPromptWithLanguage(rawValue?: string | null) {
  const rawPrompt = String(rawValue || "").trim();

  for (const [language, suffix] of Object.entries(
    VIDEO_LANGUAGE_SUFFIXES,
  ) as Array<[VideoLanguageOption, string]>) {
    if (rawPrompt.endsWith(suffix)) {
      return {
        videoLanguage: language,
        videoPrompt: rawPrompt.slice(0, -suffix.length).trim(),
      };
    }
  }

  return {
    videoLanguage: "pt-BR" as VideoLanguageOption,
    videoPrompt: rawPrompt,
  };
}

function buildVideoPromptWithLanguage(
  videoPrompt: string,
  videoLanguage: VideoLanguageOption,
) {
  const basePrompt = videoPrompt.trim();
  const languageSuffix = VIDEO_LANGUAGE_SUFFIXES[videoLanguage];

  return basePrompt ? `${basePrompt}\n\n${languageSuffix}` : languageSuffix;
}

function createEmptyDraftState(): DraftState {
  return {
    postId: "",
    mode: "EDITORIAL",
    campaignId: "",
    postType: "FEED",
    prompt: "",
    topic: "",
    briefing: "",
    targetAudience: "",
    callToAction: "",
    generateImage: true,
    generateVideo: false,
    durationSeconds: 6,
    videoLanguage: "pt-BR",
    imagePrompt: "",
    videoPrompt: "",
    caption: "",
    hashtags: "",
    timezone: DEFAULT_TIMEZONE,
    schedule: "",
  };
}

function createDraftStateFromPost(post?: AiPostRecord | null): DraftState {
  if (!post) {
    return createEmptyDraftState();
  }

  const parsedVideoPrompt = parseVideoPromptWithLanguage(post.videoPrompt);
  const mediaConfig = normalizeMediaSelection(
    String(post.postType || "FEED").toUpperCase() as AiPostType,
    Boolean(post.generateImage),
    Boolean(post.generateVideo),
  );

  return {
    postId: post.id,
    mode: (String(post.mode || "EDITORIAL").toUpperCase() === "CAMPAIGN"
      ? "CAMPAIGN"
      : "EDITORIAL") as AiPostMode,
    campaignId: String(post.campaignId || post.campaign?.id || post.campaign?._id || ""),
    postType: String(post.postType || "FEED").toUpperCase() as AiPostType,
    prompt: post.prompt || "",
    topic: post.topic || "",
    briefing: post.briefing || "",
    targetAudience: post.targetAudience || "",
    callToAction: post.callToAction || "",
    generateImage: mediaConfig.generateImage,
    generateVideo: mediaConfig.generateVideo,
    durationSeconds: post.durationSeconds || 6,
    videoLanguage: parsedVideoPrompt.videoLanguage,
    imagePrompt: post.imagePrompt || "",
    videoPrompt: parsedVideoPrompt.videoPrompt,
    caption: post.caption || post.publishPreview || "",
    hashtags: (post.hashtags || []).join(", "),
    timezone: post.timezone || DEFAULT_TIMEZONE,
    schedule: toDatetimeLocalValue(post.scheduledAt),
  };
}

function getDefaultMediaConfig(postType: AiPostType) {
  switch (postType) {
    case "REELS":
      return {
        generateImage: false,
        generateVideo: true,
      };
    case "STORY":
      return {
        generateImage: true,
        generateVideo: false,
      };
    case "FEED":
    default:
      return {
        generateImage: true,
        generateVideo: false,
      };
  }
}

function normalizeMediaSelection(
  postType: AiPostType,
  generateImage: boolean,
  generateVideo: boolean,
) {
  if (postType === "REELS") {
    return {
      generateImage: false,
      generateVideo: true,
    };
  }

  if (generateImage && generateVideo) {
    return {
      generateImage: true,
      generateVideo: false,
    };
  }

  if (!generateImage && !generateVideo) {
    return getDefaultMediaConfig(postType);
  }

  return {
    generateImage,
    generateVideo,
  };
}

const defaultGenerateForm: GenerateFormState = {
  mode: "EDITORIAL",
  campaignId: "",
  postType: "FEED",
  prompt: "",
  topic: "",
  briefing: "",
  targetAudience: "",
  callToAction: "",
  timezone: DEFAULT_TIMEZONE,
  generateImage: true,
  generateVideo: false,
  durationSeconds: 6,
  videoLanguage: "pt-BR",
  imagePrompt: "",
  videoPrompt: "",
};

const PROMPT_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Captar clientes",
    value:
      "Crie uma campanha para atrair novos clientes da regiao, destacar o principal beneficio do servico e fechar com CTA forte para WhatsApp ou agendamento.",
  },
  {
    label: "Oferta limitada",
    value:
      "Crie uma campanha promocional com senso de urgencia, valor claro, quebra de objecao e chamada direta para aproveitar a oferta hoje.",
  },
  {
    label: "Prova social",
    value:
      "Crie uma campanha baseada em resultado real de cliente, reforcando confianca, transformacao percebida e convite para entrar em contato.",
  },
  {
    label: "Gerar autoridade",
    value:
      "Crie uma campanha educativa que mostre autoridade no segmento, entregue valor rapido e leve o publico a pedir mais informacoes.",
  },
];

const IMAGE_PROMPT_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Arte de conversao",
    value:
      "Crie uma arte vertical para Instagram com titulo curto de alto impacto, hierarquia visual forte, contraste alto, cores da marca e CTA bem visivel.",
  },
  {
    label: "Oferta premium",
    value:
      "Crie uma arte promocional premium com foco total na oferta, selo de urgencia, composicao limpa e acabamento profissional para gerar clique e contato.",
  },
  {
    label: "Prova social",
    value:
      "Crie uma arte com prova social, visual confiavel, destaque para resultado do cliente e frase curta que transmita credibilidade imediata.",
  },
  {
    label: "Carrossel forte",
    value:
      "Crie um layout de carrossel moderno com capa chamativa, blocos de leitura facil no mobile e fechamento visual com chamada para acao.",
  },
];

const TOPIC_SUGGESTIONS: FieldSuggestion[] = [
  { label: "Captacao", value: "captacao de novos clientes na regiao" },
  { label: "Promocao", value: "oferta limitada com beneficio imediato" },
  { label: "Autoridade", value: "dica especializada que gera confianca" },
  { label: "Resultado", value: "resultado real e prova social" },
];

const CTA_SUGGESTIONS: FieldSuggestion[] = [
  { label: "WhatsApp", value: "Chame no WhatsApp para agendar agora" },
  { label: "Vaga", value: "Garanta sua vaga hoje" },
  { label: "Orcamento", value: "Peca seu orcamento agora" },
  { label: "Direct", value: "Fale com nossa equipe no direct" },
];

const TARGET_AUDIENCE_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Novos clientes",
    value: "pessoas da regiao prontas para contratar nas proximas semanas",
  },
  {
    label: "Seguidores mornos",
    value: "seguidores que demonstraram interesse, mas ainda nao converteram",
  },
  {
    label: "Comparando opcoes",
    value: "pessoas que estao comparando opcoes e buscam seguranca para decidir",
  },
  {
    label: "Publico premium",
    value: "publico que valoriza qualidade, praticidade e atendimento confiavel",
  },
];

const BRIEFING_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Conversao",
    value:
      "Tom persuasivo, humano e direto, com foco em beneficio claro, baixa friccao e CTA forte no fechamento.",
  },
  {
    label: "Premium",
    value:
      "Tom premium e confiavel, destacando valor percebido, exclusividade e atendimento diferenciado.",
  },
  {
    label: "Acolhedor",
    value:
      "Tom acolhedor com prova social, reduzindo objecoes e transmitindo seguranca para o primeiro contato.",
  },
  {
    label: "Autoridade",
    value:
      "Tom didatico e estrategico, informando com clareza, gerando autoridade e convertendo sem parecer venda agressiva.",
  },
];

const VIDEO_PROMPT_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Alta conversao",
    value:
      "Crie um video vertical de alta conversao com gancho forte nos primeiros segundos, cenas dinamicas, texto na tela, beneficio principal bem claro e CTA final para contato.",
  },
  {
    label: "Antes e depois",
    value:
      "Crie um video estilo antes e depois com abertura emocional, evidencia visual do resultado e encerramento convidando a chamar no WhatsApp.",
  },
  {
    label: "Oferta urgente",
    value:
      "Crie um video promocional com ritmo acelerado, destaque da oferta, reforco de valor percebido, urgencia elegante e fechamento com CTA direto.",
  },
  {
    label: "Video educativo",
    value:
      "Crie um video educativo com 3 pontos curtos, legendas claras, cortes limpos, visual profissional e CTA final para pedir mais informacoes.",
  },
];

function SuggestionButtons({
  suggestions,
  onSelect,
}: {
  suggestions: FieldSuggestion[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={`${suggestion.label}-${suggestion.value}`}
          type="button"
          onClick={() => onSelect(suggestion.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

const statusFilters = [
  { label: "Todos", value: "" },
  { label: "Prontos", value: "READY" },
  { label: "Agendados", value: "SCHEDULED" },
  { label: "Publicados", value: "PUBLISHED" },
  { label: "Com erro", value: "FAILED" },
  { label: "Cancelados", value: "CANCELLED" },
] as const;

const modeFilters = [
  { label: "Todos", value: "" },
  { label: "Campanha", value: "CAMPAIGN" },
  { label: "Editorial", value: "EDITORIAL" },
] as const;

const postTypeFilters = [
  { label: "Todos", value: "" },
  { label: "Story", value: "STORY" },
  { label: "Feed", value: "FEED" },
  { label: "Reels", value: "REELS" },
] as const;

const aiPostsSections: Array<{
  id: AiPostsSection;
  label: string;
  description: string;
}> = [
  {
    id: "generate",
    label: "Gerar novo rascunho",
    description: "Configure briefing, formato, mídia e prompts para criar um novo rascunho com IA.",
  },
  {
    id: "library",
    label: "Rascunhos e publicações",
    description: "Revise rascunhos gerados, publique agora ou agende no Instagram conectado.",
  },
];

function canUseAiPostsPlan(planType?: string | null) {
  return planType === "pro" || planType === "scale";
}

function getAiPostsGenerationLimit(planType?: string | null) {
  if (planType === "pro") {
    return 20;
  }

  if (planType === "scale") {
    return 40;
  }

  return 0;
}

function getAiPostsVideoGenerationLimit(planType?: string | null) {
  if (planType === "pro") {
    return 5;
  }

  if (planType === "scale") {
    return 10;
  }

  return 0;
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

    if (Array.isArray(message) && message.length > 0) {
      return String(message[0]);
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function getStatusMeta(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "PUBLISHED":
      return {
        label: "Publicado",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "SCHEDULED":
      return {
        label: "Agendado",
        className: "border-blue-200 bg-blue-50 text-blue-700",
      };
    case "FAILED":
      return {
        label: "Com erro",
        className: "border-red-200 bg-red-50 text-red-700",
      };
    case "CANCELLED":
      return {
        label: "Cancelado",
        className: "border-slate-200 bg-slate-100 text-slate-700",
      };
    case "GENERATING":
    case "PUBLISHING":
      return {
        label: "Processando",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "READY":
    default:
      return {
        label: "Pronto",
        className: "border-primary-200 bg-primary-50 text-primary-700",
      };
  }
}

function getModeLabel(mode?: string | null) {
  return String(mode || "").toUpperCase() === "CAMPAIGN" ? "Campanha" : "Editorial";
}

function getPostTypeLabel(postType?: string | null) {
  switch (String(postType || "").toUpperCase()) {
    case "STORY":
      return "Story";
    case "REELS":
      return "Reels";
    case "FEED":
    default:
      return "Feed";
  }
}

function getMediaRecommendation(postType: AiPostType) {
  switch (postType) {
    case "STORY":
      return "Story costuma performar melhor com arte vertical ou vídeo curto.";
    case "REELS":
      return "Reels exige vídeo, então mantenha a geração de vídeo ativa.";
    case "FEED":
    default:
      return "Feed pode sair como imagem ou video, de acordo com a estrategia.";
  }
}

function toDatetimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (!Number.isNaN(parsedDate.getTime())) {
    const localDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  return String(value).replace(" ", "T").slice(0, 16);
}

function toSchedulePayload(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

function parseHashtagsInput(value: string) {
  return value
    .split(/[\n,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith("#") ? item : `#${item}`));
}

function hasRequiredCampaignHashtag(
  caption: string,
  hashtags: string[],
  requiredHashtag?: string | null,
) {
  const normalizedRequired = String(requiredHashtag || "").trim();

  if (!normalizedRequired) {
    return true;
  }

  return caption.includes(normalizedRequired) || hashtags.includes(normalizedRequired);
}

function isVideoMedia(item?: AiPostRecord["media"][number]) {
  const type = String(item?.type || "").toUpperCase();
  const mimeType = String(item?.mimeType || "").toLowerCase();
  const url = String(item?.url || "").toLowerCase();

  return (
    type.includes("VIDEO") ||
    mimeType.startsWith("video/") ||
    url.endsWith(".mp4") ||
    url.endsWith(".mov") ||
    url.endsWith(".webm")
  );
}

function isVideoGenerationPost(post?: AiPostRecord | null) {
  if (!post) {
    return false;
  }

  return (
    Boolean(post.generateVideo) ||
    post.postType === "REELS" ||
    Boolean(post.durationSeconds) ||
    Boolean(String(post.videoPrompt || "").trim()) ||
    post.media.some((item) => isVideoMedia(item))
  );
}

function isScheduledWithinOneHour(value?: string | null) {
  if (!value) {
    return false;
  }

  const scheduledTime = new Date(value).getTime();

  if (Number.isNaN(scheduledTime)) {
    return false;
  }

  const now = Date.now();
  const diffMs = scheduledTime - now;

  return diffMs > 0 && diffMs <= 60 * 60 * 1000;
}

export default function PublicacoesIaPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [activeSection, setActiveSection] = useState<AiPostsSection>("generate");
  const [statusFilter, setStatusFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [postTypeFilter, setPostTypeFilter] = useState("");
  const [libraryPage, setLibraryPage] = useState(1);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [generateForm, setGenerateForm] = useState<GenerateFormState>(defaultGenerateForm);
  const [draftState, setDraftState] = useState<DraftState>(createEmptyDraftState());

  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });

  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns", "ai-posts-selector"],
    queryFn: () =>
      establishmentApi.getCampaigns({
        limit: 100,
      }),
    enabled: canUseAiPostsPlan(me?.planAccess?.planType),
  });

  const planType = me?.planAccess?.planType || "free";
  const isAiPostsPlanEligible = canUseAiPostsPlan(planType);
  const aiPostsGenerationLimit = getAiPostsGenerationLimit(planType);
  const canEditAiPosts = isAiPostsPlanEligible && (me?.currentUser?.role || "owner") !== "viewer";

  const { data: aiPostsData, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["ai-posts", statusFilter, modeFilter, postTypeFilter, libraryPage],
    queryFn: () =>
      establishmentApi.getAiPosts({
        page: libraryPage,
        limit: LIBRARY_PAGE_SIZE,
        status: statusFilter || undefined,
        mode: modeFilter || undefined,
        postType: postTypeFilter || undefined,
      }),
    enabled: isAiPostsPlanEligible,
  });

  const { data: aiPostsUsageData } = useQuery({
    queryKey: ["ai-posts", "usage"],
    queryFn: () =>
      establishmentApi.getAiPosts({
        page: 1,
        limit: 100,
      }),
    enabled: isAiPostsPlanEligible,
  });

  const aiPosts = useMemo(
    () => (Array.isArray(aiPostsData?.items) ? (aiPostsData.items as AiPostRecord[]) : []),
    [aiPostsData],
  );
  const resolvedSelectedPostId =
    selectedPostId && aiPosts.some((post) => post.id === selectedPostId)
      ? selectedPostId
      : aiPosts[0]?.id || null;

  const { data: selectedPostData, isLoading: isLoadingSelectedPost } = useQuery({
    queryKey: ["ai-post", resolvedSelectedPostId],
    queryFn: () => establishmentApi.getAiPost(resolvedSelectedPostId as string),
    enabled: isAiPostsPlanEligible && Boolean(resolvedSelectedPostId),
  });

  const selectedPost =
    selectedPostData || aiPosts.find((post) => post.id === resolvedSelectedPostId) || null;
  const currentDraft = useMemo<DraftState>(() => {
    if (!selectedPost) {
      return createEmptyDraftState();
    }

    if (draftState.postId === selectedPost.id) {
      return draftState;
    }

    return createDraftStateFromPost(selectedPost);
  }, [draftState, selectedPost]);

  const isMetaConnected = Boolean(me?.metaConnected);
  const campaigns = Array.isArray(campaignsData?.items)
    ? (campaignsData.items as CampaignSelectorItem[])
    : [];
  const totalAiGenerations = Number(aiPostsUsageData?.total || 0);
  const totalAiVideoGenerations = Array.isArray(aiPostsUsageData?.items)
    ? (aiPostsUsageData.items as AiPostRecord[]).filter((post) =>
        isVideoGenerationPost(post),
      ).length
    : 0;
  const aiPostsVideoGenerationLimit = getAiPostsVideoGenerationLimit(planType);
  const hasReachedAiPostsGenerationLimit = Boolean(
    isAiPostsPlanEligible &&
      aiPostsGenerationLimit > 0 &&
      totalAiGenerations >= aiPostsGenerationLimit,
  );
  const hasReachedAiPostsVideoGenerationLimit = Boolean(
    isAiPostsPlanEligible &&
      aiPostsVideoGenerationLimit > 0 &&
      totalAiVideoGenerations >= aiPostsVideoGenerationLimit,
  );
  const draftCampaign =
    currentDraft.mode === "CAMPAIGN"
      ? campaigns.find(
          (campaign) =>
            String(campaign.id || campaign._id || "") === currentDraft.campaignId,
        ) || selectedPost?.campaign || null
      : null;
  const requiredCampaignHashtag = String(draftCampaign?.hashtagRequired || "").trim();
  const parsedHashtags = parseHashtagsInput(currentDraft.hashtags);

  const updateDraft = (partial: Partial<DraftState>) => {
    setDraftState({
      ...currentDraft,
      ...partial,
      postId: selectedPost?.id || "",
    });
  };

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!isAiPostsPlanEligible) {
        throw new Error("Publicações IA estão disponíveis apenas nos planos Pro e Scale.");
      }

      if (hasReachedAiPostsGenerationLimit) {
        throw new Error(
          `Seu plano atingiu o limite de ${aiPostsGenerationLimit} gerações de publicação.`,
        );
      }

      if (generateForm.generateVideo && hasReachedAiPostsVideoGenerationLimit) {
        throw new Error(
          `Seu plano atingiu o limite de ${aiPostsVideoGenerationLimit} gerações de vídeo.`,
        );
      }

      if (generateForm.mode === "CAMPAIGN" && !generateForm.campaignId) {
        throw new Error("Selecione uma campanha para gerar uma publicação vinculada.");
      }

      if (!generateForm.prompt.trim()) {
        throw new Error("Descreva o que a IA deve gerar antes de continuar.");
      }

      if (generateForm.generateImage === generateForm.generateVideo) {
        throw new Error(
          "Selecione apenas um formato de mídia para gerar: imagem ou vídeo.",
        );
      }

      if (generateForm.postType === "REELS" && !generateForm.generateVideo) {
        throw new Error("Publicações do tipo reels precisam de geração de vídeo.");
      }

      return establishmentApi.generateAiPost({
        mode: generateForm.mode,
        campaignId:
          generateForm.mode === "CAMPAIGN" ? generateForm.campaignId : undefined,
        postType: generateForm.postType,
        prompt: generateForm.prompt.trim(),
        topic: generateForm.topic.trim() || undefined,
        briefing: generateForm.briefing.trim() || undefined,
        targetAudience: generateForm.targetAudience.trim() || undefined,
        callToAction: generateForm.callToAction.trim() || undefined,
        timezone: generateForm.timezone.trim() || DEFAULT_TIMEZONE,
        generateImage: generateForm.generateImage,
        generateVideo: generateForm.generateVideo,
        durationSeconds: generateForm.generateVideo ? generateForm.durationSeconds : undefined,
        imagePrompt: generateForm.imagePrompt.trim() || undefined,
        videoPrompt: generateForm.generateVideo
          ? buildVideoPromptWithLanguage(
              generateForm.videoPrompt,
              generateForm.videoLanguage,
            )
          : undefined,
      });
    },
    onSuccess: (post) => {
      setFeedback({
        type: "success",
        message:
          "Rascunho gerado com sucesso. Revise legenda, hashtags e mídia antes de publicar.",
      });
      queryClient.invalidateQueries({ queryKey: ["ai-posts"] });

      if (post?.id) {
        setSelectedPostId(post.id);
        setActiveSection("library");
        queryClient.invalidateQueries({ queryKey: ["ai-post", post.id] });
      }

      setGenerateForm((current) => ({
        ...current,
        prompt: "",
        topic: "",
        briefing: "",
        targetAudience: "",
        callToAction: "",
        imagePrompt: "",
        videoPrompt: "",
      }));
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getErrorMessage(error, "Não foi possível gerar o rascunho com IA."),
      });
    },
  });

  useEffect(() => {
    if (!generateMutation.isPending) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [generateMutation.isPending]);

  const updateMutation = useMutation({
    mutationFn: (postId: string) =>
      establishmentApi.updateAiPost(postId, {
        mode: currentDraft.mode,
        campaignId:
          currentDraft.mode === "CAMPAIGN" ? currentDraft.campaignId || undefined : undefined,
        postType: currentDraft.postType,
        prompt: currentDraft.prompt.trim(),
        topic: currentDraft.topic.trim() || undefined,
        briefing: currentDraft.briefing.trim() || undefined,
        targetAudience: currentDraft.targetAudience.trim() || undefined,
        callToAction: currentDraft.callToAction.trim() || undefined,
        generateImage: currentDraft.generateImage,
        generateVideo: currentDraft.generateVideo,
        durationSeconds:
          currentDraft.generateVideo ? currentDraft.durationSeconds : undefined,
        imagePrompt: currentDraft.imagePrompt.trim() || undefined,
        videoPrompt: currentDraft.generateVideo
          ? buildVideoPromptWithLanguage(
              currentDraft.videoPrompt,
              currentDraft.videoLanguage,
            )
          : undefined,
        caption: currentDraft.caption.trim(),
        hashtags: parsedHashtags,
        timezone: currentDraft.timezone.trim() || DEFAULT_TIMEZONE,
      }),
    onSuccess: (post) => {
      setFeedback({
        type: "success",
        message: "Rascunho atualizado com sucesso.",
      });
      setDraftState(createEmptyDraftState());
      queryClient.invalidateQueries({ queryKey: ["ai-posts"] });

      if (post?.id) {
        queryClient.setQueryData(["ai-post", post.id], post);
      }
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getErrorMessage(error, "Não foi possível salvar as alterações."),
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (postId: string) => establishmentApi.publishAiPostNow(postId),
    onSuccess: (post) => {
      setFeedback({
        type: "success",
        message: "Publicação enviada para o Instagram da conta conectada.",
      });
      queryClient.invalidateQueries({ queryKey: ["ai-posts"] });

      if (post?.id) {
        queryClient.setQueryData(["ai-post", post.id], post);
      }
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getErrorMessage(error, "Não foi possível publicar agora."),
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (postId: string) =>
      establishmentApi.scheduleAiPost(postId, {
        scheduledAt: toSchedulePayload(currentDraft.schedule),
        timezone: currentDraft.timezone.trim() || DEFAULT_TIMEZONE,
      }),
    onSuccess: (post) => {
      setFeedback({
        type: "success",
        message: "Publicação agendada com sucesso.",
      });
      setDraftState(createEmptyDraftState());
      queryClient.invalidateQueries({ queryKey: ["ai-posts"] });

      if (post?.id) {
        queryClient.setQueryData(["ai-post", post.id], post);
      }
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getErrorMessage(error, "Não foi possível agendar a publicação."),
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (postId: string) => establishmentApi.cancelAiPost(postId),
    onSuccess: (post) => {
      setFeedback({
        type: "info",
        message: "Agendamento cancelado com sucesso.",
      });
      setDraftState(createEmptyDraftState());
      queryClient.invalidateQueries({ queryKey: ["ai-posts"] });

      if (post?.id) {
        queryClient.setQueryData(["ai-post", post.id], post);
      }
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getErrorMessage(error, "Não foi possível cancelar a publicação."),
      });
    },
  });

  const validateCampaignHashtag = () => {
    if (currentDraft.mode === "CAMPAIGN" && !currentDraft.campaignId) {
      setFeedback({
        type: "error",
        message: "Selecione uma campanha para manter o rascunho vinculado.",
      });
      return false;
    }

    if (currentDraft.generateImage === currentDraft.generateVideo) {
      setFeedback({
        type: "error",
        message: "Selecione apenas um formato de mídia no rascunho: imagem ou vídeo.",
      });
      return false;
    }

    if (currentDraft.postType === "REELS" && !currentDraft.generateVideo) {
      setFeedback({
        type: "error",
        message: "Rascunhos do tipo reels precisam de geração de vídeo.",
      });
      return false;
    }

    if (
      !hasRequiredCampaignHashtag(
        currentDraft.caption,
        parsedHashtags,
        requiredCampaignHashtag,
      )
    ) {
      setFeedback({
        type: "error",
        message: `Essa publicação está vinculada a uma campanha e precisa manter a hashtag ${requiredCampaignHashtag}.`,
      });
      return false;
    }

    return true;
  };

  const handleSaveDraft = () => {
    if (!selectedPost?.id) {
      return;
    }

    if (!validateCampaignHashtag()) {
      return;
    }

    setFeedback(null);
    updateMutation.mutate(selectedPost.id);
  };

  const handlePublishNow = () => {
    if (!selectedPost?.id) {
      return;
    }

    if (!validateCampaignHashtag()) {
      return;
    }

    setFeedback(null);
    publishMutation.mutate(selectedPost.id);
  };

  const handleSchedule = () => {
    if (!selectedPost?.id) {
      return;
    }

    if (!currentDraft.schedule) {
      setFeedback({
        type: "error",
        message: "Escolha data e hora antes de agendar.",
      });
      return;
    }

    if (!validateCampaignHashtag()) {
      return;
    }

    setFeedback(null);
    scheduleMutation.mutate(selectedPost.id);
  };

  if (isLoadingMe) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!isAiPostsPlanEligible) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">
              Publicações IA
            </h1>
            <p className="mt-1 text-slate-500">
              Gere rascunhos com IA e publique direto no Instagram conectado do
              estabelecimento.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">
              Plano atual: {me?.plan || "Free"}
            </div>
            <div className="mt-1">
              Disponível apenas nos planos Pro e Scale.
            </div>
          </div>
        </div>

        <FeatureUpgradeNotice
          badge="Recurso Pro e Scale"
          title="Publicações IA disponíveis apenas nos planos Pro e Scale"
          description="O plano Pro libera até 20 gerações de publicação com IA, sendo até 5 vídeos. O plano Scale libera até 40 gerações, sendo até 10 vídeos. Faça upgrade para gerar, revisar, publicar e agendar conteúdos no Instagram conectado."
          ctaLabel="Ver planos"
          ctaHref="/para-estabelecimentos#planos"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">
            Publicações IA
          </h1>
          <p className="mt-1 text-slate-500">
            Gere rascunhos com IA e publique direto no Instagram conectado do
            estabelecimento.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">
              Conta conectada: {isMetaConnected ? "sim" : "nao"}
            </div>
            <div className="mt-1">
              {me?.instagramHandle || "Conecte o Instagram profissional para publicar."}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">
              Gerações do plano
            </div>
            <div className="mt-1">
              {totalAiGenerations} / {aiPostsGenerationLimit} utilizadas no plano{" "}
              {me?.plan || (planType === "pro" ? "Pro" : "Scale")}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">
              Videos do plano
            </div>
            <div className="mt-1">
              {totalAiVideoGenerations} / {aiPostsVideoGenerationLimit} utilizadas no
              plano {me?.plan || (planType === "pro" ? "Pro" : "Scale")}
            </div>
          </div>
        </div>
      </div>

      {!canEditAiPosts ? (
        <FeatureUpgradeNotice
          badge="Perfil viewer"
          title="Seu acesso nesta área é somente leitura"
          description="Você pode acompanhar os rascunhos gerados pela IA, mas apenas owner e manager podem editar, publicar e agendar."
          ctaLabel="Voltar ao dashboard"
          ctaHref="/dashboard"
        />
      ) : null}

      {!isMetaConnected ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">
                Conecte o Instagram profissional para publicar e agendar.
              </div>
              <div className="mt-1">
                A geração do rascunho já funciona, mas a postagem direta depende da
                permissão de publicação na conta conectada.{" "}
                <Link
                  href="/dashboard/configuracoes"
                  className="font-bold text-amber-950 underline"
                >
                  Ir para configuracoes
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {hasReachedAiPostsGenerationLimit ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          O plano atual atingiu o limite de {aiPostsGenerationLimit} gerações de
          publicação com IA. Você ainda pode revisar os rascunhos existentes, mas
          novas gerações exigem upgrade de plano.
        </div>
      ) : null}

      {generateForm.generateVideo && hasReachedAiPostsVideoGenerationLimit ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          O plano atual atingiu o limite de {aiPostsVideoGenerationLimit} gerações de
          vídeo. Você ainda pode gerar publicações com imagem, mas novos vídeos
          exigem upgrade de plano.
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : feedback.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-24 xl:self-start">
          <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {aiPostsSections.map((section) => {
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="font-medium text-sm">{section.label}</div>
                  <div
                    className={`mt-1 text-xs leading-5 ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {section.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
      {activeSection === "generate" ? (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Gerar novo rascunho
            </h2>
            <p className="text-sm text-slate-500">
              Escolha se a IA deve criar um conteúdo editorial ou vinculado a uma
              campanha.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Modo
            </label>
            <select
              value={generateForm.mode}
              onChange={(event) =>
                setGenerateForm((current) => ({
                  ...current,
                  mode: event.target.value as AiPostMode,
                  campaignId:
                    event.target.value === "CAMPAIGN" ? current.campaignId : "",
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              <option value="EDITORIAL">Editorial</option>
              <option value="CAMPAIGN">Campanha</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Tipo da publicação
            </label>
            <select
              value={generateForm.postType}
              onChange={(event) =>
                setGenerateForm((current) => ({
                  ...current,
                  postType: event.target.value as AiPostType,
                  ...getDefaultMediaConfig(event.target.value as AiPostType),
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              <option value="FEED">Feed</option>
              <option value="STORY">Story</option>
              <option value="REELS">Reels</option>
            </select>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3">
              <div className="text-sm font-bold text-slate-900">Mídia a gerar</div>
              <div className="mt-1 text-xs text-slate-500">
                {getMediaRecommendation(generateForm.postType)} Escolha apenas um
                formato por vez.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <input
                  type="radio"
                  name="generate-media-type"
                  checked={generateForm.generateImage}
                  onChange={() =>
                    setGenerateForm((current) => ({
                      ...current,
                      generateImage: true,
                      generateVideo: false,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">
                  <span className="block font-bold text-slate-900">Gerar imagem</span>
                  Use quando quiser uma arte fixa para feed ou story.
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <input
                  type="radio"
                  name="generate-media-type"
                  checked={generateForm.generateVideo}
                  onChange={() =>
                    setGenerateForm((current) => ({
                      ...current,
                      generateImage: false,
                      generateVideo: true,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">
                  <span className="block font-bold text-slate-900">Gerar vídeo</span>
                  Ative para reels ou quando quiser motion no feed ou story.
                </span>
              </label>
            </div>
          </div>

          {generateForm.mode === "CAMPAIGN" ? (
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Campanha vinculada
              </label>
              <select
                value={generateForm.campaignId}
                onChange={(event) =>
                  setGenerateForm((current) => ({
                    ...current,
                    campaignId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione uma campanha</option>
                {campaigns.map((campaign) => (
                  <option key={String(campaign.id || campaign._id)} value={String(campaign.id || campaign._id)}>
                    {campaign.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Prompt principal
            </label>
            <SuggestionButtons
              suggestions={PROMPT_SUGGESTIONS}
              onSelect={(value) =>
                setGenerateForm((current) => ({
                  ...current,
                  prompt: value,
                }))
              }
            />
            <textarea
              rows={3}
              value={generateForm.prompt}
              onChange={(event) =>
                setGenerateForm((current) => ({
                  ...current,
                  prompt: event.target.value,
                }))
              }
              placeholder="Ex: campanha para atrair novos clientes com CTA no WhatsApp"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {generateForm.generateImage ? (
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Prompt da imagem
              </label>
              <SuggestionButtons
                suggestions={IMAGE_PROMPT_SUGGESTIONS}
                onSelect={(value) =>
                  setGenerateForm((current) => ({
                    ...current,
                    imagePrompt: value,
                  }))
                }
              />
              <textarea
                rows={2}
                value={generateForm.imagePrompt}
                onChange={(event) =>
                  setGenerateForm((current) => ({
                    ...current,
                    imagePrompt: event.target.value,
                  }))
                }
                placeholder="Ex: Arte clean para academia premium, tons escuros e dourado"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ) : null}

          {generateForm.generateVideo ? (
            <div className="md:col-span-2">
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  Duração do vídeo
                </label>
                <select
                  value={String(generateForm.durationSeconds)}
                  onChange={(event) =>
                    setGenerateForm((current) => ({
                      ...current,
                      durationSeconds: Number(event.target.value) as AiVideoDurationSeconds,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                >
                  {VIDEO_DURATION_OPTIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration} segundos
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  O backend aceita apenas 4, 6 ou 8 segundos.
                </p>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  Idioma do vídeo
                </label>
                <select
                  value={generateForm.videoLanguage}
                  onChange={(event) =>
                    setGenerateForm((current) => ({
                      ...current,
                      videoLanguage: event.target.value as VideoLanguageOption,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                >
                  {VIDEO_LANGUAGE_OPTIONS.map((languageOption) => (
                    <option key={languageOption.value} value={languageOption.value}>
                      {languageOption.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  O idioma escolhido será anexado ao final do prompt do vídeo.
                </p>
              </div>

              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Prompt do vídeo
              </label>
              <SuggestionButtons
                suggestions={VIDEO_PROMPT_SUGGESTIONS}
                onSelect={(value) =>
                  setGenerateForm((current) => ({
                    ...current,
                    videoPrompt: value,
                  }))
                }
              />
              <textarea
                rows={2}
                value={generateForm.videoPrompt}
                onChange={(event) =>
                  setGenerateForm((current) => ({
                    ...current,
                    videoPrompt: event.target.value,
                  }))
                }
                placeholder="Ex: Video dinamico de 8 segundos mostrando treino funcional com cortes rapidos"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Tópico
            </label>
            <SuggestionButtons
              suggestions={TOPIC_SUGGESTIONS}
              onSelect={(value) =>
                setGenerateForm((current) => ({
                  ...current,
                  topic: value,
                }))
              }
            />
            <input
              type="text"
              value={generateForm.topic}
              onChange={(event) =>
                setGenerateForm((current) => ({
                  ...current,
                  topic: event.target.value,
                }))
              }
              placeholder="Ex: academia"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Chamada para ação
            </label>
            <SuggestionButtons
              suggestions={CTA_SUGGESTIONS}
              onSelect={(value) =>
                setGenerateForm((current) => ({
                  ...current,
                  callToAction: value,
                }))
              }
            />
            <input
              type="text"
              value={generateForm.callToAction}
              onChange={(event) =>
                setGenerateForm((current) => ({
                  ...current,
                  callToAction: event.target.value,
                }))
              }
              placeholder="Ex: Agende sua aula"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Público alvo
            </label>
            <SuggestionButtons
              suggestions={TARGET_AUDIENCE_SUGGESTIONS}
              onSelect={(value) =>
                setGenerateForm((current) => ({
                  ...current,
                  targetAudience: value,
                }))
              }
            />
            <input
              type="text"
              value={generateForm.targetAudience}
              onChange={(event) =>
                setGenerateForm((current) => ({
                  ...current,
                  targetAudience: event.target.value,
                }))
              }
              placeholder="Ex: mulheres de 25 a 45 anos"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Timezone
            </label>
            <input
              type="text"
              value={generateForm.timezone}
              onChange={(event) =>
                setGenerateForm((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Briefing
            </label>
            <SuggestionButtons
              suggestions={BRIEFING_SUGGESTIONS}
              onSelect={(value) =>
                setGenerateForm((current) => ({
                  ...current,
                  briefing: value,
                }))
              }
            />
            <textarea
              rows={3}
              value={generateForm.briefing}
              onChange={(event) =>
                setGenerateForm((current) => ({
                  ...current,
                  briefing: event.target.value,
                }))
              }
              placeholder="Ex: foco em conversao para novos alunos e linguagem acolhedora"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>

        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              generateMutation.mutate();
            }}
            disabled={
              generateMutation.isPending ||
              !canEditAiPosts ||
              hasReachedAiPostsGenerationLimit ||
              (generateForm.generateVideo && hasReachedAiPostsVideoGenerationLimit)
            }
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            Gerar com IA
          </button>
        </div>

        {generateMutation.isPending ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            A IA está gerando sua publicação agora. Não atualize a página e
            permaneça nesta tela até a geração terminar.
          </div>
        ) : null}
      </section>
      ) : null}

      {activeSection === "library" ? (
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Rascunhos e publicações
              </h2>
              <p className="text-sm text-slate-500">
                {aiPostsData?.total || aiPosts.length} itens encontrados
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setLibraryPage(1);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    statusFilter === filter.value
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {modeFilters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => {
                  setModeFilter(filter.value);
                  setLibraryPage(1);
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  modeFilter === filter.value
                    ? "border-primary-200 bg-primary-50 text-primary-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}

            {postTypeFilters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => {
                  setPostTypeFilter(filter.value);
                  setLibraryPage(1);
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  postTypeFilter === filter.value
                    ? "border-primary-200 bg-primary-50 text-primary-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          <div className="w-full border-b border-slate-100 lg:h-[760px] lg:w-[360px] lg:border-b-0 lg:border-r">
            <div className="max-h-[420px] overflow-y-auto lg:h-full lg:max-h-none">
              {isLoadingPosts ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
                </div>
              ) : aiPosts.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Nenhum rascunho encontrado com os filtros atuais.
                </div>
              ) : (
                aiPosts.map((post) => {
                  const statusMeta = getStatusMeta(post.status);
                  const isSelected = selectedPost?.id === post.id;
                  const isScheduledSoon =
                    String(post.status || "").toUpperCase() === "SCHEDULED" &&
                    isScheduledWithinOneHour(post.scheduledAt);

                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedPostId(post.id)}
                      className={`w-full border-b border-slate-100 p-4 text-left transition-colors ${
                        isSelected
                          ? "bg-primary-50"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {getPostTypeLabel(post.postType)}
                        </span>
                      </div>

                      <div className="line-clamp-2 font-semibold text-slate-900">
                        {post.caption || post.publishPreview || post.prompt || "Sem texto"}
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Megaphone className="h-3.5 w-3.5" />
                          {getModeLabel(post.mode)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {post.media.length}
                        </span>
                      </div>

                      {post.campaign?.title ? (
                        <div className="mt-2 text-xs font-medium text-primary-700">
                          {post.campaign.title}
                        </div>
                      ) : null}

                      {post.scheduledAt ? (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                          {isScheduledSoon ? (
                            <span title="Publicação agendada para menos de 1 hora">
                              <Clock3 className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          ) : null}
                          <span>
                            Agendado para{" "}
                            {new Date(post.scheduledAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 bg-slate-50/50 p-6">
            {selectedPost ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusMeta(selectedPost.status).className}`}
                      >
                        {getStatusMeta(selectedPost.status).label}
                      </span>
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {getModeLabel(currentDraft.mode)}
                      </span>
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {getPostTypeLabel(currentDraft.postType)}
                      </span>
                    </div>

                    <h3 className="mt-3 font-heading text-2xl font-bold text-slate-900">
                      Revisar publicação
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Ajuste legenda, hashtags e agendamento antes de enviar ao
                      Instagram.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      queryClient.invalidateQueries({ queryKey: ["ai-post", selectedPost.id] });
                      queryClient.invalidateQueries({ queryKey: ["ai-posts"] });
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Atualizar
                  </button>
                </div>

                {draftCampaign?.title ? (
                  <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-800">
                    <div className="font-semibold">
                      Vinculado a campanha: {draftCampaign.title}
                    </div>
                    {requiredCampaignHashtag ? (
                      <div className="mt-1">
                        A hashtag obrigatória {requiredCampaignHashtag} precisa
                        permanecer na legenda final ou na lista de hashtags.
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 font-bold text-slate-900">
                        Configuração do rascunho
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Modo
                          </label>
                          <select
                            value={currentDraft.mode}
                            onChange={(event) =>
                              updateDraft({
                                mode: event.target.value as AiPostMode,
                                campaignId:
                                  event.target.value === "CAMPAIGN"
                                    ? currentDraft.campaignId
                                    : "",
                              })
                            }
                            disabled={!canEditAiPosts}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            <option value="EDITORIAL">Editorial</option>
                            <option value="CAMPAIGN">Campanha</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Tipo da publicação
                          </label>
                          <select
                            value={currentDraft.postType}
                            onChange={(event) =>
                              updateDraft({
                                postType: event.target.value as AiPostType,
                                ...getDefaultMediaConfig(event.target.value as AiPostType),
                              })
                            }
                            disabled={!canEditAiPosts}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            <option value="FEED">Feed</option>
                            <option value="STORY">Story</option>
                            <option value="REELS">Reels</option>
                          </select>
                        </div>

                        {currentDraft.mode === "CAMPAIGN" ? (
                          <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-bold text-slate-700">
                              Campanha vinculada
                            </label>
                            <select
                              value={currentDraft.campaignId}
                              onChange={(event) =>
                                updateDraft({ campaignId: event.target.value })
                              }
                              disabled={!canEditAiPosts}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              <option value="">Selecione uma campanha</option>
                              {campaigns.map((campaign) => (
                                <option
                                  key={String(campaign.id || campaign._id)}
                                  value={String(campaign.id || campaign._id)}
                                >
                                  {campaign.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}

                        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                              <input
                                type="radio"
                                name={`draft-media-type-${selectedPost?.id || "default"}`}
                                checked={currentDraft.generateImage}
                                onChange={() =>
                                  updateDraft({
                                    generateImage: true,
                                    generateVideo: false,
                                  })
                                }
                                disabled={!canEditAiPosts}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-slate-700">
                                <span className="block font-bold text-slate-900">
                                  Gerar imagem
                                </span>
                                Use quando quiser uma arte fixa para feed ou story.
                              </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                              <input
                                type="radio"
                                name={`draft-media-type-${selectedPost?.id || "default"}`}
                                checked={currentDraft.generateVideo}
                                onChange={() =>
                                  updateDraft({
                                    generateImage: false,
                                    generateVideo: true,
                                  })
                                }
                                disabled={!canEditAiPosts}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-slate-700">
                                <span className="block font-bold text-slate-900">
                                  Gerar vídeo
                                </span>
                                Ative para reels ou quando quiser motion no feed ou story.
                              </span>
                            </label>
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Prompt principal
                          </label>
                          <textarea
                            rows={3}
                            value={currentDraft.prompt}
                            onChange={(event) => updateDraft({ prompt: event.target.value })}
                            disabled={!canEditAiPosts}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Tópico
                          </label>
                          <input
                            type="text"
                            value={currentDraft.topic}
                            onChange={(event) => updateDraft({ topic: event.target.value })}
                            disabled={!canEditAiPosts}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Chamada para ação
                          </label>
                          <input
                            type="text"
                            value={currentDraft.callToAction}
                            onChange={(event) =>
                              updateDraft({ callToAction: event.target.value })
                            }
                            disabled={!canEditAiPosts}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Público alvo
                          </label>
                          <input
                            type="text"
                            value={currentDraft.targetAudience}
                            onChange={(event) =>
                              updateDraft({ targetAudience: event.target.value })
                            }
                            disabled={!canEditAiPosts}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Briefing
                          </label>
                          <input
                            type="text"
                            value={currentDraft.briefing}
                            onChange={(event) => updateDraft({ briefing: event.target.value })}
                            disabled={!canEditAiPosts}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>

                        {currentDraft.generateVideo ? (
                          <div>
                            <label className="mb-1.5 block text-sm font-bold text-slate-700">
                              Duração do vídeo
                            </label>
                            <select
                              value={String(currentDraft.durationSeconds)}
                              onChange={(event) =>
                                updateDraft({
                                  durationSeconds: Number(
                                    event.target.value,
                                  ) as AiVideoDurationSeconds,
                                })
                              }
                              disabled={!canEditAiPosts}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              {VIDEO_DURATION_OPTIONS.map((duration) => (
                                <option key={duration} value={duration}>
                                  {duration} segundos
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}

                        {currentDraft.generateVideo ? (
                          <div>
                            <label className="mb-1.5 block text-sm font-bold text-slate-700">
                              Idioma do vídeo
                            </label>
                            <select
                              value={currentDraft.videoLanguage}
                              onChange={(event) =>
                                updateDraft({
                                  videoLanguage: event.target.value as VideoLanguageOption,
                                })
                              }
                              disabled={!canEditAiPosts}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              {VIDEO_LANGUAGE_OPTIONS.map((languageOption) => (
                                <option
                                  key={languageOption.value}
                                  value={languageOption.value}
                                >
                                  {languageOption.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}

                        {currentDraft.generateImage ? (
                          <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-bold text-slate-700">
                              Prompt da imagem
                            </label>
                            <textarea
                              rows={2}
                              value={currentDraft.imagePrompt}
                              onChange={(event) =>
                                updateDraft({ imagePrompt: event.target.value })
                              }
                              disabled={!canEditAiPosts}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </div>
                        ) : null}

                        {currentDraft.generateVideo ? (
                          <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-bold text-slate-700">
                              Prompt do vídeo
                            </label>
                            <textarea
                              rows={2}
                              value={currentDraft.videoPrompt}
                              onChange={(event) =>
                                updateDraft({ videoPrompt: event.target.value })
                              }
                              disabled={!canEditAiPosts}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="font-bold text-slate-900">Legenda</div>
                        {isLoadingSelectedPost ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : null}
                      </div>
                      <textarea
                        rows={8}
                        value={currentDraft.caption}
                        onChange={(event) => updateDraft({ caption: event.target.value })}
                        disabled={!canEditAiPosts}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 font-bold text-slate-900">Hashtags</div>
                      <input
                        type="text"
                        value={currentDraft.hashtags}
                        onChange={(event) => updateDraft({ hashtags: event.target.value })}
                        disabled={!canEditAiPosts}
                        placeholder="#seunegocio, #promocao, #campanha"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Separe por virgula, espaco ou quebra de linha.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        Agendamento
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Data e hora
                          </label>
                          <input
                            type="datetime-local"
                            value={currentDraft.schedule}
                            onChange={(event) => updateDraft({ schedule: event.target.value })}
                            disabled={!canEditAiPosts}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Timezone
                          </label>
                          <input
                            type="text"
                            value={currentDraft.timezone}
                            onChange={(event) => updateDraft({ timezone: event.target.value })}
                            disabled={!canEditAiPosts}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        O backend recebe a data no timezone informado e publica na
                        conta conectada.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 font-bold text-slate-900">Preview</div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {currentDraft.caption || selectedPost.publishPreview || "Sem texto de preview."}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                        <ImageIcon className="h-4 w-4 text-slate-500" />
                        Mídia gerada
                      </div>
                      {selectedPost.media.length === 0 ? (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          Nenhum asset retornado para este rascunho.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selectedPost.media.map((item, index) => (
                            <div
                              key={item.id || `${item.url}-${index}`}
                              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                            >
                              {isVideoMedia(item) ? (
                                <video
                                  src={item.url}
                                  controls
                                  className="aspect-[4/5] w-full bg-black object-cover"
                                />
                              ) : (
                                <img
                                  src={item.url}
                                  alt="Asset gerado pela IA"
                                  className="aspect-[4/5] w-full object-cover"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 font-bold text-slate-900">Metadados</div>
                      <div className="space-y-3 text-sm text-slate-700">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">Status</span>
                          <span className="font-semibold">
                            {getStatusMeta(selectedPost.status).label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">Modo</span>
                          <span className="font-semibold">
                            {getModeLabel(currentDraft.mode)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">Formato</span>
                          <span className="font-semibold">
                            {getPostTypeLabel(currentDraft.postType)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">Timezone</span>
                          <span className="font-semibold">{selectedPost.timezone}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">Criado em</span>
                          <span className="font-semibold">
                            {selectedPost.createdAt
                              ? new Date(selectedPost.createdAt).toLocaleString("pt-BR")
                              : "Não informado"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">Agendado para</span>
                          <span className="font-semibold">
                            {selectedPost.scheduledAt
                              ? new Date(selectedPost.scheduledAt).toLocaleString("pt-BR")
                              : "Não agendado"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="text-xs text-slate-500">
                    Reels podem exigir vídeo e stories priorizam asset vertical.
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={updateMutation.isPending || !canEditAiPosts}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar revisao
                    </button>

                    <button
                      type="button"
                      onClick={handleSchedule}
                      disabled={
                        scheduleMutation.isPending ||
                        !canEditAiPosts ||
                        !isMetaConnected
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {scheduleMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Clock3 className="h-4 w-4" />
                      )}
                      Agendar
                    </button>

                    <button
                      type="button"
                      onClick={handlePublishNow}
                      disabled={
                        publishMutation.isPending ||
                        !canEditAiPosts ||
                        !isMetaConnected
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {publishMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Publicar agora
                    </button>

                    <button
                      type="button"
                      onClick={() => selectedPost.id && cancelMutation.mutate(selectedPost.id)}
                      disabled={
                        cancelMutation.isPending ||
                        !canEditAiPosts ||
                        !selectedPost.scheduledAt
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      Cancelar
                    </button>
                  </div>
                </div>

                {isMetaConnected ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        A conta do estabelecimento esta conectada e pronta para
                        publicar no Instagram, sujeito as permissoes concedidas na
                        Meta.
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center text-slate-500">
                <Sparkles className="mb-4 h-10 w-10 text-slate-300" />
                <div className="font-semibold text-slate-700">
                  Selecione um rascunho para revisar
                </div>
                <div className="mt-1 max-w-md text-sm">
                  Gere um novo conteúdo com IA ou escolha um item da lista para
                  editar legenda, hashtags e publicação.
                </div>
              </div>
            )}
          </div>
        </div>

        <PaginationControls
          page={libraryPage}
          limit={LIBRARY_PAGE_SIZE}
          total={Number(aiPostsData?.total || 0)}
          isLoading={isLoadingPosts}
          itemLabel="publicações"
          onPageChange={setLibraryPage}
        />
      </section>
      ) : null}
        </div>
      </div>
    </div>
  );
}
