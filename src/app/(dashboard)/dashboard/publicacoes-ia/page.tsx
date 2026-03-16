"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PaginationControls from "@/components/dashboard/PaginationControls";
import FeatureUpgradeNotice from "@/components/dashboard/FeatureUpgradeNotice";
import DashboardDialog from "@/components/ui/DashboardDialog";
import {
  canUseAiPostsPlan,
  getAiPostsGenerationLimit,
  getAiPostsVideoGenerationLimit,
} from "@/lib/ai-posts-plan-limits";
import {
  isAiPostsSectionId,
  type AiPostsSectionId,
} from "@/lib/ai-posts-sections";
import { addDashboardRuntimeNotification } from "@/lib/dashboard-runtime-notifications";
import {
  establishmentApi,
  type AiPostAsyncGenerationResponse,
  type AiPostMode,
  type AiPostQualityProfile,
  type AiPostRecord,
  type AiPostType,
  type AiVideoContinuityMode,
  type AiVideoResolution,
  type AiVideoDurationSeconds,
} from "@/services/establishment-api";
import {
  AlertTriangle,
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock3,
  Heart,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Play,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  X,
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
  qualityProfile: AiPostQualityProfile;
  videoResolution: AiVideoResolution;
  continuityMode: AiVideoContinuityMode;
  totalDurationSeconds: number;
  videoLanguage: VideoLanguageOption;
  imagePrompt: string;
  videoPrompt: string;
  visualStyle: string;
  negativePrompt: string;
  referenceImageUrls: string[];
  storyOutline: string;
  storyBeats: string;
  sequenceCount: number;
  sequenceSteps: string;
};

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

type BatchGenerationProgress = {
  current: number;
  total: number;
} | null;

type ToastItem = {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
};

type TrackedAsyncGenerationJob = {
  aiPostId: string;
  status: string;
  notificationChannelId?: string;
};

type AiPostSocketEvent = {
  namespace?: string;
  type?: string;
  aiPostId?: string;
  status?: string;
  messageId?: string;
  notificationChannelId?: string;
  createdAt?: string;
  timestamp?: number;
  message?: string;
  aiPost?: {
    _id?: string;
    id?: string;
  } | null;
};

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
  qualityProfile: AiPostQualityProfile;
  videoResolution: AiVideoResolution;
  continuityMode: AiVideoContinuityMode;
  totalDurationSeconds: number;
  videoLanguage: VideoLanguageOption;
  imagePrompt: string;
  videoPrompt: string;
  visualStyle: string;
  negativePrompt: string;
  referenceImageUrls: string[];
  storyOutline: string;
  storyBeats: string;
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
type FieldSuggestion = {
  label: string;
  value: string;
};

type AiBriefingChatField =
  | "prompt"
  | "topic"
  | "targetAudience"
  | "callToAction"
  | "briefing"
  | "imagePrompt"
  | "videoPrompt"
  | "visualStyle"
  | "negativePrompt"
  | "storyOutline"
  | "storyBeats";

type AiBriefingChatRole = "assistant" | "user";

type AiBriefingChatMessage = {
  id: string;
  role: AiBriefingChatRole;
  content: string;
  field: AiBriefingChatField | null;
};

type AiBriefingConversationValues = {
  prompt: string;
  topic: string;
  targetAudience: string;
  callToAction: string;
  briefing: string;
  imagePrompt: string;
  videoPrompt: string;
  visualStyle: string;
  negativePrompt: string;
  storyOutline: string;
  storyBeats: string;
  hasUserMessages: boolean;
};

type AiBriefingFlowContext = {
  generateImage: boolean;
  generateVideo: boolean;
  isSequentialVideo: boolean;
  postType: AiPostType;
};

type AiBriefingTimelineStep = {
  field: AiBriefingChatField;
  title: string;
  helper: string;
  optional?: boolean;
};

type VisualPreset = {
  label: string;
  visualStyle: string;
  negativePrompt: string;
};

type ReferenceQuickOption = {
  label: string;
  helper: string;
  url: string;
};

type ReferenceAccessState = "public" | "protected";

const DEFAULT_AI_REFERENCE_BUCKET = "midiahub-v1";
const AI_POST_ASYNC_POLL_INTERVAL_MS = 5000;
const AI_POST_TERMINAL_STATUSES = ["READY", "FAILED", "CANCELLED", "PUBLISHED", "SCHEDULED"];
const AI_POST_PROCESSING_STATUSES = ["QUEUED", "GENERATING", "PUBLISHING"];
const TOAST_DURATION_MS = 6000;
const AI_POSTS_LIBRARY_HREF = "/dashboard/publicacoes-ia?section=library";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";
const VIDEO_DURATION_OPTIONS: AiVideoDurationSeconds[] = [4, 6, 8];
const VIDEO_RESOLUTION_OPTIONS: AiVideoResolution[] = ["720p", "1080p"];
const VIDEO_CONTINUITY_OPTIONS: AiVideoContinuityMode[] = ["SINGLE", "SEQUENTIAL"];
const VIDEO_TOTAL_DURATION_OPTIONS = [30, 60];
const SEQUENCE_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6];
const LIBRARY_PAGE_SIZE = 20;
const QUALITY_PROFILE_OPTIONS: Array<{
  value: AiPostQualityProfile;
  label: string;
  helper: string;
}> = [
  {
    value: "BALANCED",
    label: "Balanced",
    helper: "Mais rapido e indicado para testes, iteracoes e pecas do dia a dia.",
  },
  {
    value: "PROFESSIONAL",
    label: "Professional",
    helper: "Melhor escolha para criativos principais, campanhas pagas e pecas de maior impacto.",
  },
];
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
    qualityProfile: "BALANCED",
    videoResolution: "720p",
    continuityMode: "SINGLE",
    totalDurationSeconds: 30,
    videoLanguage: "pt-BR",
    imagePrompt: "",
    videoPrompt: "",
    visualStyle: "",
    negativePrompt: "",
    referenceImageUrls: [],
    storyOutline: "",
    storyBeats: "",
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
  const normalizedVideoSettings = normalizeVideoSettings(
    post.durationSeconds || 6,
    post.videoResolution || "720p",
    post.continuityMode || "SINGLE",
  );

  return applyVideoReferenceModelConstraints({
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
    durationSeconds: normalizedVideoSettings.durationSeconds,
    qualityProfile: post.qualityProfile || "BALANCED",
    videoResolution: normalizedVideoSettings.videoResolution,
    continuityMode: post.continuityMode || "SINGLE",
    totalDurationSeconds: post.totalDurationSeconds || 30,
    videoLanguage: parsedVideoPrompt.videoLanguage,
    imagePrompt: post.imagePrompt || "",
    videoPrompt: parsedVideoPrompt.videoPrompt,
    visualStyle: post.visualStyle || "",
    negativePrompt: post.negativePrompt || "",
    referenceImageUrls: normalizeReferenceImageUrls(post.referenceImageUrls || []),
    storyOutline: post.storyOutline || "",
    storyBeats: Array.isArray(post.storyBeats) ? post.storyBeats.join("\n") : "",
    caption: post.caption || post.publishPreview || "",
    hashtags: (post.hashtags || []).join(", "),
    timezone: post.timezone || DEFAULT_TIMEZONE,
    schedule: toDatetimeLocalValue(post.scheduledAt),
  });
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
  qualityProfile: "BALANCED",
  videoResolution: "720p",
  continuityMode: "SINGLE",
  totalDurationSeconds: 30,
  videoLanguage: "pt-BR",
  imagePrompt: "",
  videoPrompt: "",
  visualStyle: "",
  negativePrompt: "",
  referenceImageUrls: [],
  storyOutline: "",
  storyBeats: "",
  sequenceCount: 1,
  sequenceSteps: "",
};

const PROMPT_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Oferta premium",
    value:
      "Crie uma publicacao para Instagram com proposta premium, beneficio principal cristalino, copy curta e sofisticada, valor percebido alto e CTA direto para WhatsApp, direct ou agendamento. Evite linguagem vaga e visual de panfleto.",
  },
  {
    label: "Movimento hoje",
    value:
      "Crie uma publicacao para gerar visitas ainda hoje, destacando o motivo para agir agora, mensagem objetiva para mobile, senso de oportunidade e CTA simples para reservar, chamar ou comparecer.",
  },
  {
    label: "Autoridade visual",
    value:
      "Crie uma publicacao editorial que fortalece o posicionamento da marca, transmite confianca e acabamento premium, com texto enxuto, linguagem segura e foco em diferenciar o negocio da concorrencia.",
  },
  {
    label: "Prova social",
    value:
      "Crie uma publicacao baseada em experiencia real de cliente, destaque a transformacao percebida, reduza objecoes com naturalidade e finalize com convite para falar com a equipe.",
  },
];

const FEED_IMAGE_PROMPT_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Hero premium",
    value:
      "Crie uma arte vertical 4:5 para Instagram com visual premium, elemento principal em destaque, iluminacao refinada, profundidade sutil, tipografia curta de alto impacto, area de respiro e acabamento publicitario. Evite poluicao visual, excesso de texto e aspecto de panfleto.",
  },
  {
    label: "Oferta elegante",
    value:
      "Crie uma arte promocional vertical com headline forte, selo de oferta sofisticado, hierarquia visual clara, cores de marca bem aplicadas e CTA evidente. O resultado deve parecer campanha profissional de Instagram Ads, nao arte amadora.",
  },
  {
    label: "Lifestyle",
    value:
      "Crie uma imagem estilo editorial lifestyle, com cena realista, contexto de uso do produto ou servico, luz bonita, enquadramento premium e atmosfera aspiracional. O resultado deve parecer ensaio de marca bem produzido.",
  },
  {
    label: "Close de produto",
    value:
      "Crie uma imagem com close hero do produto ou servico, textura valorizada, fundo refinado, contraste controlado e direcao de arte comercial. Inserir apenas um titulo curto e elegante.",
  },
];

const STORY_IMAGE_PROMPT_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Story de oferta",
    value:
      "Crie um story vertical 9:16 com headline curta, oferta muito clara, contraste alto para leitura no celular, CTA forte e composicao limpa. Reservar area segura para arroba e hashtag visiveis.",
  },
  {
    label: "Story premium",
    value:
      "Crie um story vertical sofisticado, com fundo elegante, tipografia editorial curta, foco em valor percebido e atmosfera premium. Manter leitura imediata e espaco livre para marcacao visivel.",
  },
  {
    label: "Story prova social",
    value:
      "Crie um story com prova social, frase curta de impacto, visual confiavel e resultado percebido em destaque. Deixar area limpa para inserir arroba e hashtag sem perder legibilidade.",
  },
  {
    label: "Story bastidor",
    value:
      "Crie um story com visual autentico de bastidor, enquadramento vertical, luz natural bonita, informacao rapida e CTA discreto. Priorizar aparencia real, atual e profissional.",
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

const FEED_VIDEO_PROMPT_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Motion premium",
    value:
      "Crie um video curto para feed com visual premium, movimentos suaves de camera, close-ups elegantes, texto minimo na tela, color grading comercial e fechamento com CTA discreto.",
  },
  {
    label: "Oferta em motion",
    value:
      "Crie um video promocional curto para feed destacando a oferta principal com ritmo agil, tipografia impactante, detalhes do produto ou servico e CTA final muito claro.",
  },
  {
    label: "Institucional",
    value:
      "Crie um video institucional curto para feed reforcando autoridade, ambiente, atendimento e qualidade percebida, com edicao limpa e sofisticada.",
  },
  {
    label: "Prova social",
    value:
      "Crie um video curto com resultado de cliente, cenas que mostrem antes e depois ou beneficio percebido, narrativa clara e encerramento convidando para contato.",
  },
];

const REELS_VIDEO_PROMPT_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Reels cinematico",
    value:
      "Crie um reels vertical 9:16 com gancho forte no primeiro segundo, cenas premium, camera motion suave, cortes ritmados, texto curto na tela, color grading comercial e CTA final. Deve parecer anuncio profissional.",
  },
  {
    label: "Reels de conversao",
    value:
      "Crie um reels promocional de alta conversao, com abertura que prende, destaque da oferta, valor percebido claro, urgencia elegante e encerramento chamando para direct ou WhatsApp.",
  },
  {
    label: "Reels bastidores",
    value:
      "Crie um reels mostrando bastidores ou processo com planos curtos, close-ups fortes, autenticidade, energia e acabamento de marca premium. Usar legendas curtas e limpas.",
  },
  {
    label: "Transformacao",
    value:
      "Crie um reels de transformacao ou antes e depois com contraste visual forte, narrativa imediata, foco no resultado final e CTA para falar com a equipe.",
  },
];

const VISUAL_STYLE_PRESETS: VisualPreset[] = [
  {
    label: "Premium",
    visualStyle:
      "fotografia publicitaria premium, luz refinada, composicao limpa, acabamento sofisticado e atmosfera aspiracional",
    negativePrompt:
      "visual amador, composicao poluida, excesso de texto, elementos aleatorios, baixa qualidade",
  },
  {
    label: "Clean",
    visualStyle:
      "visual clean e contemporaneo, fundo organizado, foco central claro, paleta equilibrada e leitura imediata",
    negativePrompt:
      "bagunca visual, excesso de props, tipografia exagerada, ruido, distracoes no fundo",
  },
  {
    label: "Gastronomia",
    visualStyle:
      "fotografia gastronomica premium, close apetitoso, luz quente, textura valorizada e apresentacao elegante",
    negativePrompt:
      "comida deformada, prato confuso, ingredientes duplicados, aspecto artificial, blur",
  },
  {
    label: "Moda",
    visualStyle:
      "editorial de moda moderno, pose confiante, enquadramento elegante, luz controlada e styling sofisticado",
    negativePrompt:
      "anatomia estranha, dedos extras, roupa deformada, fundo poluido, pose travada",
  },
  {
    label: "Fitness",
    visualStyle:
      "energia alta, luz dramatica, contraste forte, movimento controlado e acabamento cinematografico",
    negativePrompt:
      "corpo deformado, membros estranhos, borrado de movimento ruim, academia baguncada, anatomia errada",
  },
  {
    label: "Luxo",
    visualStyle:
      "estetica de luxo, materiais nobres, brilho controlado, profundidade suave e direcao de arte exclusiva",
    negativePrompt:
      "visual popular demais, excesso de cores, poluicao, reflexos ruins, acabamento barato",
  },
  {
    label: "Urbano",
    visualStyle:
      "linguagem urbana premium, contraste moderno, composicao dinamica, atitude contemporanea e look de campanha",
    negativePrompt:
      "caos visual, baixa definicao, cenarios aleatorios, texto excessivo, ruido exagerado",
  },
];

const NEGATIVE_PROMPT_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Sem texto",
    value: "texto na arte, letras deformadas, tipografia quebrada",
  },
  {
    label: "Sem distorcoes",
    value: "anatomia estranha, dedos extras, rosto distorcido, objetos duplicados",
  },
  {
    label: "Sem poluicao",
    value: "composicao poluida, excesso de elementos, fundo confuso, bagunca visual",
  },
  {
    label: "Sem blur ruim",
    value: "blur, baixa nitidez, flicker, morphing, serrilhado, artefatos visuais",
  },
];

const STORY_OUTLINE_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "Produto para oferta",
    value:
      "abrir com apresentacao do contexto, mostrar o produto ou servico em destaque, reforcar o principal beneficio e fechar com CTA",
  },
  {
    label: "Bastidor premium",
    value:
      "abrir com ambiente ou bastidor, evoluir para detalhes do processo, revelar o resultado final e encerrar com clima aspiracional",
  },
];

const STORY_BEATS_SUGGESTIONS: FieldSuggestion[] = [
  {
    label: "3 beats",
    value: "abertura com contexto\nbeneficio ou transformacao\nfechamento com CTA",
  },
  {
    label: "4 beats",
    value: "gancho inicial\napresentacao do processo\nresultado final\nCTA de fechamento",
  },
];

const PROMPT_PLACEHOLDER =
  "Ex: crie uma publicacao premium para divulgar um combo especial, com beneficio claro, valor percebido alto e CTA para WhatsApp";

const IMAGE_PROMPT_PLACEHOLDERS: Record<AiPostType, string> = {
  STORY:
    "Ex: Story 9:16 premium, headline curta, oferta clara, contraste alto e area segura para arroba e hashtag visiveis",
  FEED:
    "Ex: Arte 4:5 premium com close do produto, iluminacao refinada, tipografia curta e acabamento publicitario",
  REELS:
    "Ex: Arte premium para Instagram com composicao clean, foco total no produto e texto minimo",
};

const VIDEO_PROMPT_PLACEHOLDERS: Record<AiPostType, string> = {
  STORY: "",
  FEED:
    "Ex: Video curto para feed com close-ups elegantes, camera suave, texto minimo e CTA discreto no final",
  REELS:
    "Ex: Reels 9:16 com gancho forte, cortes ritmados, cenas premium, texto curto na tela e CTA final",
};

const VISUAL_STYLE_PLACEHOLDERS: Record<AiPostType, string> = {
  STORY:
    "Ex: visual premium para story, leitura instantanea, foco central, contraste alto e espaco livre para marcacao",
  FEED:
    "Ex: fotografia publicitaria premium, luz lateral quente, close elegante e composicao hero equilibrada",
  REELS:
    "Ex: comercial premium com energia alta, camera suave, clima aspiracional e acabamento cinematografico",
};

const NEGATIVE_PROMPT_PLACEHOLDER =
  "Ex: texto na arte, blur, composicao poluida, anatomia estranha, logo deformado, objetos duplicados";

function getImagePromptSuggestions(postType: AiPostType) {
  return postType === "STORY"
    ? STORY_IMAGE_PROMPT_SUGGESTIONS
    : FEED_IMAGE_PROMPT_SUGGESTIONS;
}

function getVideoPromptSuggestions(postType: AiPostType) {
  return postType === "REELS"
    ? REELS_VIDEO_PROMPT_SUGGESTIONS
    : FEED_VIDEO_PROMPT_SUGGESTIONS;
}

function getImagePromptHelper(postType: AiPostType) {
  if (postType === "STORY") {
    return "Descreva hierarquia visual, contraste, area segura para marcacao e o clima da arte.";
  }

  return "Descreva composicao, luz, enquadramento, nivel de texto e acabamento que a imagem deve ter.";
}

function getVideoPromptHelper(postType: AiPostType) {
  if (postType === "REELS") {
    return "Descreva o gancho inicial, os tipos de cena, o ritmo dos cortes, o texto na tela e o fechamento.";
  }

  return "Descreva cenas, movimentos de camera, ritmo, presenca de texto e a sensacao final do video.";
}

function getVisualStyleHelper(postType: AiPostType) {
  if (postType === "STORY") {
    return "Descreva o clima visual, o contraste, o nivel de sofisticao e como a arte deve se comportar no formato vertical.";
  }

  if (postType === "REELS") {
    return "Descreva o look visual do video: luz, energia, camera, acabamento e tipo de campanha que ele deve lembrar.";
  }

  return "Descreva a linguagem visual da peca: fotografia, direcao de arte, luz, textura, paleta e sensacao de marca.";
}

function getFormatDirectionTip(postType: AiPostType) {
  switch (postType) {
    case "STORY":
      return "Story funciona melhor com foco central, leitura rapida, contraste alto e poucos elementos.";
    case "REELS":
      return "Reels ganha muito com referencia principal forte, gancho visual e energia alta desde o primeiro segundo.";
    case "FEED":
    default:
      return "Feed costuma performar melhor com composicao hero limpa, acabamento premium e hierarquia visual clara.";
  }
}

function normalizeReferenceImageUrls(urls: string[]) {
  return urls
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);
}

function parseStoryBeatsInput(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSequenceStepsInput(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSequenceCount(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(
    SEQUENCE_COUNT_OPTIONS[SEQUENCE_COUNT_OPTIONS.length - 1],
    Math.max(SEQUENCE_COUNT_OPTIONS[0], Math.trunc(value)),
  );
}

function getSequenceCollectionLabel(postType: AiPostType, count: number) {
  if (count <= 1) {
    return "Peca unica";
  }

  switch (postType) {
    case "STORY":
      return `${count} stories em sequencia`;
    case "REELS":
      return `${count} reels em serie`;
    case "FEED":
    default:
      return `${count} cards de carrossel`;
  }
}

function getSequenceItemTitle(
  postType: AiPostType,
  index: number,
  count: number,
  explicitStep?: string,
) {
  if (explicitStep) {
    return explicitStep;
  }

  if (count <= 1) {
    return postType === "REELS" ? "Reel principal" : "Peca principal";
  }

  switch (postType) {
    case "STORY":
      return `Story ${index + 1}`;
    case "REELS":
      return `Reel ${index + 1}`;
    case "FEED":
    default:
      return `Card ${index + 1}`;
  }
}

function buildSequencePrompt(
  basePrompt: string,
  postType: AiPostType,
  index: number,
  count: number,
  explicitStep?: string,
) {
  const normalizedPrompt = basePrompt.trim();

  if (count <= 1) {
    return normalizedPrompt;
  }

  const instructions = [
    `Esta peca faz parte de uma sequencia de ${count} itens para Instagram.`,
    `Crie o item ${index + 1} de ${count}.`,
    explicitStep ? `Foco deste item: ${explicitStep}.` : "Crie uma variacao complementar as demais pecas, sem repetir tudo igual.",
    postType === "FEED"
      ? "Pense como um card de carrossel que precisa funcionar sozinho e em conjunto."
      : postType === "STORY"
        ? "Pense como um story em sequencia, com leitura rapida e continuidade clara."
        : "Pense como um reel de uma serie curta, com continuidade de linguagem visual.",
  ];

  return [normalizedPrompt, instructions.join(" ")].filter(Boolean).join("\n\n");
}

function buildPreviewCaptionText(input: {
  caption?: string;
  prompt?: string;
  topic?: string;
  callToAction?: string;
  hashtags?: string[] | string;
}) {
  const caption = String(input.caption || "").trim();

  if (caption) {
    return caption;
  }

  const content = [
    String(input.topic || "").trim(),
    String(input.prompt || "").trim(),
    String(input.callToAction || "").trim(),
  ].filter(Boolean);

  const hashtags = Array.isArray(input.hashtags)
    ? input.hashtags.map((item) => String(item || "").trim()).filter(Boolean)
    : String(input.hashtags || "")
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean);

  if (hashtags.length > 0) {
    content.push(hashtags.slice(0, 4).join(" "));
  }

  return content.join("\n\n").trim() || "Sua legenda e o CTA aparecerao aqui.";
}

function sanitizeAiPostDisplayText(value?: string | null) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();

  if (!normalized || normalized === "[object Object]") {
    return "";
  }

  return normalized;
}

function getAiPostCardPreviewText(post: AiPostRecord) {
  return (
    sanitizeAiPostDisplayText(post.caption) ||
    sanitizeAiPostDisplayText(post.publishPreview) ||
    sanitizeAiPostDisplayText(post.prompt) ||
    sanitizeAiPostDisplayText(post.topic) ||
    "Sem texto"
  );
}

function getGeneratedMediaClass(postType: AiPostType, mediaIsVideo: boolean) {
  if (postType === "FEED" && mediaIsVideo) {
    return "aspect-video w-full bg-black object-contain";
  }

  return `${postType === "FEED" ? "aspect-[4/5]" : "aspect-[9/16]"} w-full ${
    mediaIsVideo ? "bg-black object-cover" : "object-cover"
  }`;
}

function normalizeTotalDurationSeconds(value: number) {
  return VIDEO_TOTAL_DURATION_OPTIONS.includes(value)
    ? value
    : VIDEO_TOTAL_DURATION_OPTIONS[0];
}

function isSequentialVideoMode(mode: AiVideoContinuityMode, generateVideo: boolean) {
  return generateVideo && mode === "SEQUENTIAL";
}

function isValidReferenceImageUrl(value: string) {
  const normalized = value.trim();

  if (!normalized || /\s/.test(normalized)) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidReferenceImageFile(file: File) {
  return String(file.type || "")
    .toLowerCase()
    .startsWith("image/");
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(new Error(`Nao foi possivel ler o arquivo "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function canRenderImageFromUrl(url: string) {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(true);
      return;
    }

    const image = new Image();

    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

function getProtectedReferenceUrls(
  referenceImageUrls: string[],
  accessStateByReference: Record<string, ReferenceAccessState>,
) {
  return normalizeReferenceImageUrls(referenceImageUrls).filter(
    (url) => accessStateByReference[url] === "protected",
  );
}

function getProtectedReferenceGenerationMessage(protectedReferenceUrls: string[]) {
  if (protectedReferenceUrls.length === 0) {
    return null;
  }

  return protectedReferenceUrls.length > 1
    ? "Algumas imagens importadas do PC ficaram com preview local apenas. A geracao foi bloqueada porque a IA nao consegue baixar essas URLs protegidas."
    : "A imagem importada do PC ficou com preview local apenas. A geracao foi bloqueada porque a IA nao consegue baixar essa URL protegida.";
}

function isReferenceDownloadForbiddenMessage(message: string) {
  return /baixar uma imagem de referencia/i.test(message) && /403/.test(message);
}

function hasVideoReferenceImages(generateVideo: boolean, referenceImageUrls: string[]) {
  return generateVideo && normalizeReferenceImageUrls(referenceImageUrls).length > 0;
}

function applyVideoReferenceModelConstraints<
  T extends {
    postType: AiPostType;
    generateVideo: boolean;
    durationSeconds: AiVideoDurationSeconds;
    referenceImageUrls: string[];
  },
>(state: T): T {
  const normalizedReferenceImageUrls = normalizeReferenceImageUrls(
    state.referenceImageUrls,
  );

  if (!state.generateVideo || normalizedReferenceImageUrls.length === 0) {
    return {
      ...state,
      referenceImageUrls: normalizedReferenceImageUrls,
    };
  }

  return {
    ...state,
    durationSeconds: 8,
    referenceImageUrls: normalizedReferenceImageUrls,
  };
}

function getVideoReferenceValidationMessage({
  generateVideo,
  durationSeconds,
  referenceImageUrls,
}: {
  generateVideo: boolean;
  durationSeconds: AiVideoDurationSeconds;
  referenceImageUrls: string[];
}) {
  if (!hasVideoReferenceImages(generateVideo, referenceImageUrls)) {
    return null;
  }

  if (durationSeconds !== 8) {
    return "Video com imagem de referencia exige 8 segundos no modelo atual.";
  }

  return null;
}

function normalizeVideoSettings(
  durationSeconds: AiVideoDurationSeconds,
  videoResolution: AiVideoResolution,
  continuityMode: AiVideoContinuityMode = "SINGLE",
) {
  if (continuityMode === "SEQUENTIAL") {
    return {
      durationSeconds,
      videoResolution: "720p" as AiVideoResolution,
    };
  }

  if (videoResolution === "1080p") {
    return {
      durationSeconds: 8 as AiVideoDurationSeconds,
      videoResolution: "1080p" as AiVideoResolution,
    };
  }

  return {
    durationSeconds,
    videoResolution: "720p" as AiVideoResolution,
  };
}

function buildVideoSettingsFromDuration(
  durationSeconds: AiVideoDurationSeconds,
  currentResolution: AiVideoResolution,
  continuityMode: AiVideoContinuityMode = "SINGLE",
) {
  if (continuityMode === "SEQUENTIAL") {
    return {
      durationSeconds,
      videoResolution: "720p" as AiVideoResolution,
    };
  }

  return {
    durationSeconds,
    videoResolution:
      durationSeconds === 8 ? currentResolution : ("720p" as AiVideoResolution),
  };
}

function buildVideoSettingsFromResolution(
  videoResolution: AiVideoResolution,
  currentDuration: AiVideoDurationSeconds,
  continuityMode: AiVideoContinuityMode = "SINGLE",
) {
  if (continuityMode === "SEQUENTIAL") {
    return {
      durationSeconds: currentDuration,
      videoResolution: "720p" as AiVideoResolution,
    };
  }

  if (videoResolution === "1080p") {
    return {
      durationSeconds: 8 as AiVideoDurationSeconds,
      videoResolution: "1080p" as AiVideoResolution,
    };
  }

  return {
    durationSeconds: currentDuration,
    videoResolution: "720p" as AiVideoResolution,
  };
}

function SuggestionButtons({
  suggestions,
  onSelect,
  disabled = false,
  activeValue,
}: {
  suggestions: FieldSuggestion[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  activeValue?: string;
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {suggestions.map((suggestion) => {
        const isActive =
          Boolean(activeValue) &&
          normalizeChatSuggestionValue(activeValue || "") ===
            normalizeChatSuggestionValue(suggestion.value);

        return (
          <button
            key={`${suggestion.label}-${suggestion.value}`}
            type="button"
            onClick={() => onSelect(suggestion.value)}
            disabled={disabled || isActive}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-primary-300 bg-primary-50 text-primary-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
            } disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
          >
            {suggestion.label}
          </button>
        );
      })}
    </div>
  );
}

function AssistantPanel({
  title,
  assistantMessage,
  children,
  helper,
}: {
  title: string;
  assistantMessage: string;
  children: React.ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <MessageCircle className="h-4 w-4 text-primary-600" />
        {title}
      </div>
      <div className="mt-3 flex justify-start">
        <div className="max-w-[92%] rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          {assistantMessage}
        </div>
      </div>
      <div className="mt-4">{children}</div>
      {helper ? <p className="mt-3 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function AssistantTextareaField({
  title,
  assistantMessage,
  suggestions,
  onSuggestionSelect,
  value,
  onChange,
  placeholder,
  helper,
  disabled = false,
  rows = 2,
}: {
  title: string;
  assistantMessage: string;
  suggestions?: FieldSuggestion[];
  onSuggestionSelect?: (value: string) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  helper?: string;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <AssistantPanel title={title} assistantMessage={assistantMessage} helper={helper}>
      {Array.isArray(suggestions) && suggestions.length > 0 && onSuggestionSelect ? (
        <div className="mb-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Atalhos do assistente
          </div>
          <SuggestionButtons
            suggestions={suggestions}
            onSelect={onSuggestionSelect}
            disabled={disabled}
            activeValue={value}
          />
        </div>
      ) : null}
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Sua orientacao
      </div>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </AssistantPanel>
  );
}

function getVisualStylePresetSuggestions(): FieldSuggestion[] {
  return VISUAL_STYLE_PRESETS.map((preset) => ({
    label: preset.label,
    value: preset.visualStyle,
  }));
}

function normalizeChatSuggestionValue(value: string) {
  return value.trim().toLowerCase();
}

function createAiBriefingChatMessage(
  role: AiBriefingChatRole,
  content: string,
  field: AiBriefingChatField | null = null,
): AiBriefingChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    role,
    content,
    field,
  };
}

function createInitialAiBriefingChatMessages() {
  return [
    createAiBriefingChatMessage(
      "assistant",
      "Preencha o briefing por etapas para definir objetivo, formato, direcao visual e detalhes complementares da peca.",
      "prompt",
    ),
  ];
}

function getAiBriefingFieldLabel(field: AiBriefingChatField | null) {
  switch (field) {
    case "prompt":
      return "Objetivo";
    case "topic":
      return "Tema ou oferta";
    case "targetAudience":
      return "Publico";
    case "callToAction":
      return "CTA";
    case "imagePrompt":
      return "Direcao da imagem";
    case "videoPrompt":
      return "Direcao do video";
    case "visualStyle":
      return "Estilo visual";
    case "negativePrompt":
      return "O que evitar";
    case "storyOutline":
      return "Historia";
    case "storyBeats":
      return "Beats";
    case "briefing":
      return "Detalhes extras";
    default:
      return "Briefing";
  }
}

function getAiBriefingTimelineSteps(
  context: AiBriefingFlowContext,
): AiBriefingTimelineStep[] {
  const steps: AiBriefingTimelineStep[] = [
    {
      field: "prompt",
      title: "Objetivo da peca",
      helper: "O que a publicacao precisa divulgar, vender ou movimentar agora.",
    },
    {
      field: "topic",
      title: "Tema ou oferta",
      helper: "Produto, servico, campanha ou assunto principal da peca.",
    },
    {
      field: "targetAudience",
      title: "Publico principal",
      helper: "Quem precisa se identificar com a mensagem primeiro.",
    },
    {
      field: "callToAction",
      title: "Acao esperada",
      helper: "O que a pessoa deve fazer depois de ver a publicacao.",
    },
  ];

  if (context.generateImage) {
    steps.push({
      field: "imagePrompt",
      title: "Direcao da imagem",
      helper: "Cena, composicao, destaque de produto e sensacao visual.",
    });
  }

  if (context.generateVideo) {
    steps.push({
      field: "videoPrompt",
      title: "Direcao do video",
      helper: "Movimento, camera, ambiente, ritmo e impacto da cena.",
    });
  }

  steps.push(
    {
      field: "visualStyle",
      title: "Estilo visual",
      helper: "Luz, materiais, enquadramento, cores e nivel de sofisticacao.",
    },
    {
      field: "negativePrompt",
      title: "O que evitar",
      helper: "Ruido visual, deformacoes, excesso de texto ou cara de panfleto.",
    },
  );

  if (context.isSequentialVideo) {
    steps.push(
      {
        field: "storyOutline",
        title: "Historia do video",
        helper: "Linha narrativa do inicio ao fim do video longo.",
      },
      {
        field: "storyBeats",
        title: "Beats obrigatorios",
        helper: "Cenas-chave em ordem para montar a sequencia.",
      },
    );
  }

  steps.push({
    field: "briefing",
    title: "Detalhes extras",
    helper: "Provas, restricoes ou contexto adicional. Opcional.",
    optional: true,
  });

  return steps;
}

function buildAiBriefingConversationValues(
  messages: AiBriefingChatMessage[],
): AiBriefingConversationValues {
  const userMessages = messages.filter((message) => message.role === "user");
  const promptMessages = userMessages
    .filter((message) => message.field === "prompt")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const topicMessages = userMessages
    .filter((message) => message.field === "topic")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const targetAudienceMessages = userMessages
    .filter((message) => message.field === "targetAudience")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const callToActionMessages = userMessages
    .filter((message) => message.field === "callToAction")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const briefingMessages = userMessages
    .filter((message) => message.field === "briefing")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const imagePromptMessages = userMessages
    .filter((message) => message.field === "imagePrompt")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const videoPromptMessages = userMessages
    .filter((message) => message.field === "videoPrompt")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const visualStyleMessages = userMessages
    .filter((message) => message.field === "visualStyle")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const negativePromptMessages = userMessages
    .filter((message) => message.field === "negativePrompt")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const storyOutlineMessages = userMessages
    .filter((message) => message.field === "storyOutline")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const storyBeatsMessages = userMessages
    .filter((message) => message.field === "storyBeats")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const prompt = (promptMessages[promptMessages.length - 1] || "").trim();
  const topic = (topicMessages[topicMessages.length - 1] || "").trim();
  const targetAudience = (targetAudienceMessages[targetAudienceMessages.length - 1] || "").trim();
  const callToAction = (callToActionMessages[callToActionMessages.length - 1] || "").trim();
  const imagePrompt = (imagePromptMessages[imagePromptMessages.length - 1] || "").trim();
  const videoPrompt = (videoPromptMessages[videoPromptMessages.length - 1] || "").trim();
  const visualStyle = (visualStyleMessages[visualStyleMessages.length - 1] || "").trim();
  const negativePrompt = (negativePromptMessages[negativePromptMessages.length - 1] || "").trim();
  const storyOutline = (storyOutlineMessages[storyOutlineMessages.length - 1] || "").trim();
  const storyBeats = (storyBeatsMessages[storyBeatsMessages.length - 1] || "").trim();
  const promptSummary = [
    prompt,
    topic ? `Tema/oferta principal: ${topic}.` : "",
    targetAudience ? `Publico principal: ${targetAudience}.` : "",
    callToAction ? `CTA esperado: ${callToAction}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
  const conversationHistory = userMessages
    .map((message) => {
      const label =
        message.field === "topic"
          ? "Tema/oferta"
          : message.field === "targetAudience"
            ? "Publico"
            : message.field === "callToAction"
              ? "CTA"
              : message.field === "imagePrompt"
                ? "Direcao da imagem"
                : message.field === "videoPrompt"
                  ? "Direcao do video"
                  : message.field === "visualStyle"
                    ? "Estilo visual"
                    : message.field === "negativePrompt"
                      ? "Evitar"
                      : message.field === "storyOutline"
                        ? "Historia do video longo"
                        : message.field === "storyBeats"
                          ? "Beats do video longo"
              : message.field === "briefing"
                ? "Detalhe extra"
                : "Objetivo";

      return `- ${label}: ${message.content.trim()}`;
    })
    .filter(Boolean);
  const briefing = [
    briefingMessages.length > 0
      ? `Detalhes extras:\n${briefingMessages.map((item) => `- ${item}`).join("\n")}`
      : "",
    conversationHistory.length > 0
      ? `Historico do briefing:\n${conversationHistory.join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return {
    prompt: promptSummary || prompt,
    topic,
    targetAudience,
    callToAction,
    briefing,
    imagePrompt,
    videoPrompt,
    visualStyle,
    negativePrompt,
    storyOutline,
    storyBeats,
    hasUserMessages: userMessages.length > 0,
  };
}

function getNextAiBriefingChatField(
  values: AiBriefingConversationValues,
  context: AiBriefingFlowContext,
): AiBriefingChatField | null {
  if (!values.prompt.trim()) {
    return "prompt";
  }

  if (!values.topic.trim()) {
    return "topic";
  }

  if (!values.targetAudience.trim()) {
    return "targetAudience";
  }

  if (!values.callToAction.trim()) {
    return "callToAction";
  }

  if (context.generateImage && !values.imagePrompt.trim()) {
    return "imagePrompt";
  }

  if (context.generateVideo && !values.videoPrompt.trim()) {
    return "videoPrompt";
  }

  if (!values.visualStyle.trim()) {
    return "visualStyle";
  }

  if (!values.negativePrompt.trim()) {
    return "negativePrompt";
  }

  if (context.isSequentialVideo && !values.storyOutline.trim()) {
    return "storyOutline";
  }

  if (context.isSequentialVideo && !values.storyBeats.trim()) {
    return "storyBeats";
  }

  return null;
}

function buildAiBriefingAssistantMessage(
  field: AiBriefingChatField | null,
  context: AiBriefingFlowContext,
) {
  switch (field) {
    case "prompt":
      return "Defina o objetivo principal da publicacao: o que precisa ser divulgado, vendido ou movimentado agora.";
    case "topic":
      return "Informe o tema, oferta, servico ou produto principal que essa publicacao precisa destacar.";
    case "targetAudience":
      return "Descreva para quem essa publicacao deve falar primeiro.";
    case "callToAction":
      return "Defina qual acao a pessoa deve tomar depois de ver a publicacao.";
    case "imagePrompt":
      return "Descreva a direcao da imagem: o que precisa aparecer, qual sensacao ela deve passar e que tipo de cena combina com a oferta.";
    case "videoPrompt":
      return "Descreva a direcao do video: cena, movimento de camera, ritmo, ambiente e o que precisa acontecer para vender bem a ideia.";
    case "visualStyle":
      return "Defina o estilo visual da peca. Vale falar de luz, enquadramento, materiais, cores e nivel de sofisticacao.";
    case "negativePrompt":
      return "Liste o que deve ser evitado no resultado, como excesso de texto, cara de panfleto, deformacoes ou poluicao visual.";
    case "storyOutline":
      return "Resuma como a historia do video longo deve evoluir do comeco ao fim.";
    case "storyBeats":
      return "Liste os beats ou cenas obrigatorias do video longo, um por linha, para organizar a sequencia.";
    case "briefing":
      return "Adicione detalhes extras de tom, prova, restricoes ou referencias antes de gerar. Esta etapa e opcional.";
    default:
      return context.generateVideo
        ? "O briefing, a direcao do video e o estilo ja estao definidos. Revise qualquer etapa ou siga para Gerar com IA."
        : "O briefing, a direcao da imagem e o estilo ja estao definidos. Revise qualquer etapa ou siga para Gerar com IA.";
  }
}

function getAiBriefingSuggestions(
  field: AiBriefingChatField | null,
  context: Pick<AiBriefingFlowContext, "postType">,
) {
  switch (field) {
    case "topic":
      return TOPIC_SUGGESTIONS;
    case "targetAudience":
      return TARGET_AUDIENCE_SUGGESTIONS;
    case "callToAction":
      return CTA_SUGGESTIONS;
    case "imagePrompt":
      return getImagePromptSuggestions(context.postType);
    case "videoPrompt":
      return getVideoPromptSuggestions(context.postType);
    case "visualStyle":
      return getVisualStylePresetSuggestions();
    case "negativePrompt":
      return NEGATIVE_PROMPT_SUGGESTIONS;
    case "storyOutline":
      return STORY_OUTLINE_SUGGESTIONS;
    case "storyBeats":
      return STORY_BEATS_SUGGESTIONS;
    case "briefing":
      return BRIEFING_SUGGESTIONS;
    case "prompt":
    default:
      return PROMPT_SUGGESTIONS;
  }
}

function getAiBriefingInputPlaceholder(
  field: AiBriefingChatField | null,
  context: AiBriefingFlowContext,
) {
  switch (field) {
    case "prompt":
      return PROMPT_PLACEHOLDER;
    case "topic":
      return "Ex: combo executivo, consulta inicial, tratamento premium, campanha de aniversario...";
    case "targetAudience":
      return "Ex: mulheres da regiao buscando praticidade e resultado rapido...";
    case "callToAction":
      return "Ex: chamar no WhatsApp agora, agendar pelo direct, clicar no link da bio...";
    case "imagePrompt":
      return IMAGE_PROMPT_PLACEHOLDERS[context.postType];
    case "videoPrompt":
      return VIDEO_PROMPT_PLACEHOLDERS[context.postType];
    case "visualStyle":
      return VISUAL_STYLE_PLACEHOLDERS[context.postType];
    case "negativePrompt":
      return NEGATIVE_PROMPT_PLACEHOLDER;
    case "storyOutline":
      return "Ex: abrir com ambiente, mostrar o processo, revelar o resultado e fechar com CTA.";
    case "storyBeats":
      return "gancho inicial\nprova ou processo\nresultado final\nCTA";
    case "briefing":
    default:
      return context.isSequentialVideo
        ? "Adicione detalhes extras ou ajuste algo com prefixos como `video:`, `visual:`, `evitar:`, `historia:` e `beats:`."
        : "Adicione qualquer detalhe extra de tom, prova, restricao, oferta ou referencia. Se quiser corrigir algo, use prefixos como `tema:`, `imagem:`, `video:` ou `visual:`.";
  }
}

function getLatestAiBriefingUserContent(
  messages: AiBriefingChatMessage[],
  field: AiBriefingChatField | null,
) {
  if (!field) {
    return "";
  }

  return (
    [...messages]
      .reverse()
      .find((message) => message.role === "user" && message.field === field)
      ?.content.trim() || ""
  );
}

function rebuildAiBriefingChatMessages(
  userMessages: AiBriefingChatMessage[],
  context: AiBriefingFlowContext,
) {
  const nextMessages = createInitialAiBriefingChatMessages();

  userMessages
    .filter((message) => message.role === "user")
    .map((message) => ({
      ...message,
      content: message.content.trim(),
    }))
    .filter((message) => message.content)
    .forEach((message) => {
      const currentValues = buildAiBriefingConversationValues(nextMessages);
      const resolvedField =
        message.field ||
        getNextAiBriefingChatField(currentValues, context) ||
        "briefing";
      const userMessage: AiBriefingChatMessage = {
        ...message,
        field: resolvedField,
      };

      nextMessages.push(userMessage);

      const nextValues = buildAiBriefingConversationValues(nextMessages);
      const nextField = getNextAiBriefingChatField(nextValues, context);

      nextMessages.push(
        createAiBriefingChatMessage(
          "assistant",
          buildAiBriefingAssistantMessage(nextField, context),
          nextField || null,
        ),
      );
    });

  return nextMessages;
}

function AiBriefingTimelineEditor({
  step,
  context,
  currentValue,
  suggestions,
  disabled,
  isCurrentStep,
  onClose,
  onSubmit,
  onClear,
}: {
  step: AiBriefingTimelineStep | null;
  context: AiBriefingFlowContext;
  currentValue: string;
  suggestions: FieldSuggestion[];
  disabled: boolean;
  isCurrentStep: boolean;
  onClose: () => void;
  onSubmit: (value: string, field: AiBriefingChatField) => void;
  onClear: (field: AiBriefingChatField) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [draftValue, setDraftValue] = useState(currentValue);

  useEffect(() => {
    if (!step?.field) {
      return;
    }

    inputRef.current?.focus();
  }, [step?.field]);

  if (!step) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="text-sm font-bold text-emerald-950">Linha do tempo concluida</div>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          O briefing base ja esta pronto. Se quiser, selecione qualquer etapa da linha do
          tempo para revisar ou siga direto com Gerar com IA.
        </p>
      </div>
    );
  }

  const normalizedDraftValue = draftValue.trim();
  const hasChanged =
    normalizeChatSuggestionValue(normalizedDraftValue) !==
    normalizeChatSuggestionValue(currentValue);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {isCurrentStep ? "Etapa atual" : "Revisao de etapa"}
        </span>
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X className="h-3.5 w-3.5" />
          Fechar edicao
        </button>
      </div>

      <div className="mt-4">
        <div className="text-lg font-bold text-slate-900">{step.title}</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {buildAiBriefingAssistantMessage(step.field, context)}
        </p>
      </div>

      {currentValue ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Resposta atual
          </div>
          <div className="mt-2 whitespace-pre-line text-sm text-slate-800">{currentValue}</div>
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Sugestoes de preenchimento
          </div>
          <SuggestionButtons
            suggestions={suggestions}
            onSelect={(value) => setDraftValue(value)}
            disabled={disabled}
            activeValue={draftValue || currentValue}
          />
        </div>
      ) : null}

      <div className="mt-4">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Conteudo da etapa
        </div>
        <textarea
          ref={inputRef}
          rows={4}
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();

              if (normalizedDraftValue) {
                onSubmit(normalizedDraftValue, step.field);
              }
            }
          }}
          placeholder={getAiBriefingInputPlaceholder(step.field, context)}
          disabled={disabled}
          className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onSubmit(normalizedDraftValue, step.field)}
          disabled={disabled || !normalizedDraftValue || !hasChanged}
          className="inline-flex items-center justify-center gap-2 rounded-3xl bg-slate-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {isCurrentStep ? "Salvar e continuar" : "Salvar etapa"}
        </button>

        {currentValue ? (
          <button
            type="button"
            onClick={() => onClear(step.field)}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Limpar esta etapa
          </button>
        ) : step.optional ? (
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Deixar para depois
          </button>
        ) : null}
      </div>
    </>
  );
}

function VisualPresetButtons({
  presets,
  onSelect,
  disabled = false,
}: {
  presets: VisualPreset[];
  onSelect: (preset: VisualPreset) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onSelect(preset)}
          disabled={disabled}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

function ReferenceImageManager({
  value,
  previewUrlByReference = {},
  accessStateByReference = {},
  urlInput,
  onUrlInputChange,
  onAddUrl,
  onImportFiles,
  onQuickAdd,
  onMove,
  onRemove,
  quickOptions,
  disabled = false,
  generateVideo,
  isImporting = false,
}: {
  value: string[];
  previewUrlByReference?: Record<string, string>;
  accessStateByReference?: Record<string, ReferenceAccessState>;
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  onAddUrl: () => void;
  onImportFiles: (files: FileList | null) => void;
  onQuickAdd: (url: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  quickOptions: ReferenceQuickOption[];
  disabled?: boolean;
  generateVideo: boolean;
  isImporting?: boolean;
}) {
  const isDisabledForInput = disabled || isImporting || value.length >= 3;
  const protectedReferenceCount = value.filter(
    (url) => accessStateByReference[url] === "protected",
  ).length;

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 block text-sm font-bold text-slate-700">
          Imagens de referencia
        </div>
        <p className="text-xs text-slate-500">
          Adicione ate 3 referencias por URL publica ou importando do computador. A primeira vira a principal e, em video, serve como ancora visual inicial.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={urlInput}
          onChange={(event) => onUrlInputChange(event.target.value)}
          disabled={isDisabledForInput}
          placeholder="https://cdn.exemplo.com/produto-hero.jpg"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        <button
          type="button"
          onClick={onAddUrl}
          disabled={isDisabledForInput}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          Adicionar URL
        </button>
        <label
          className={`inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
            isDisabledForInput
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
              : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={isDisabledForInput}
            onChange={(event) => {
              onImportFiles(event.target.files);
              event.target.value = "";
            }}
          />
          {isImporting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </span>
          ) : (
            "Importar do PC"
          )}
        </label>
      </div>
      <p className="text-[11px] text-slate-500">
        Arquivos do PC sao enviados para o bucket publico de referencias da IA antes de entrar aqui como URL publica.
      </p>

      {quickOptions.length > 0 ? (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Referencias rapidas da marca
          </div>
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <button
                key={`${option.label}-${option.url}`}
                type="button"
                onClick={() => onQuickAdd(option.url)}
                disabled={disabled || value.length >= 3}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                title={option.helper}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {generateVideo && value.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Video sem referencia ainda pode gerar, mas costuma perder consistencia de produto, ambiente e identidade visual.
        </div>
      ) : null}

      {generateVideo && value.length > 0 ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Video com imagem de referencia exige 8 segundos no modelo atual. A imagem principal vira a base do video e melhora a consistencia do resultado.
        </div>
      ) : null}

      {protectedReferenceCount > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {protectedReferenceCount > 1
            ? "Algumas referencias importadas do PC ficaram apenas com preview local. A IA nao consegue baixar essas URLs protegidas ate elas ficarem publicas."
            : "Esta referencia importada do PC ficou apenas com preview local. A IA nao consegue baixar essa URL protegida ate ela ficar publica."}{" "}
          Remova a referencia ou use uma URL publica.
        </div>
      ) : null}

      {value.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div
                className="aspect-[4/3] w-full rounded-xl bg-slate-100 bg-cover bg-center"
                style={{
                  backgroundImage: `url("${previewUrlByReference[url] || url}")`,
                }}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    index === 0
                      ? "bg-primary-100 text-primary-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {index === 0 ? "Principal" : `Referencia ${index + 1}`}
                </span>
                <span className="truncate text-xs text-slate-500">{url}</span>
              </div>
              {accessStateByReference[url] === "protected" ? (
                <div className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                  Preview local apenas
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onMove(index, index - 1)}
                  disabled={disabled || index === 0}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Subir
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, index + 1)}
                  disabled={disabled || index === value.length - 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Descer
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={disabled}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Nenhuma referencia adicionada ainda. Voce pode colar uma URL publica, importar do PC ou reutilizar imagens da propria marca.
        </div>
      )}
    </div>
  );
}

function DirectionVisualSection({
  postType,
  generateVideo,
  qualityProfile,
  videoResolution,
  continuityMode,
  totalDurationSeconds,
  visualStyle,
  negativePrompt,
  referenceImageUrls,
  referencePreviewUrlByReference = {},
  referenceAccessStateByReference = {},
  referenceUrlInput,
  onReferenceUrlInputChange,
  onAddReferenceUrl,
  onImportReferenceFiles,
  onQuickAddReference,
  onMoveReference,
  onRemoveReference,
  onApplyPreset,
  onVisualStyleChange,
  onNegativePromptChange,
  onQualityProfileChange,
  onVideoResolutionChange,
  onContinuityModeChange,
  onTotalDurationChange,
  onStoryOutlineChange,
  onStoryBeatsChange,
  storyOutline,
  storyBeats,
  quickReferenceOptions,
  isImportingReferenceFiles = false,
  hideTextControls = false,
  disabled = false,
}: {
  postType: AiPostType;
  generateVideo: boolean;
  qualityProfile: AiPostQualityProfile;
  videoResolution: AiVideoResolution;
  continuityMode: AiVideoContinuityMode;
  totalDurationSeconds: number;
  visualStyle: string;
  negativePrompt: string;
  referenceImageUrls: string[];
  referencePreviewUrlByReference?: Record<string, string>;
  referenceAccessStateByReference?: Record<string, ReferenceAccessState>;
  referenceUrlInput: string;
  onReferenceUrlInputChange: (value: string) => void;
  onAddReferenceUrl: () => void;
  onImportReferenceFiles: (files: FileList | null) => void;
  onQuickAddReference: (url: string) => void;
  onMoveReference: (fromIndex: number, toIndex: number) => void;
  onRemoveReference: (index: number) => void;
  onApplyPreset: (preset: VisualPreset) => void;
  onVisualStyleChange: (value: string) => void;
  onNegativePromptChange: (value: string) => void;
  onQualityProfileChange: (value: AiPostQualityProfile) => void;
  onVideoResolutionChange: (value: AiVideoResolution) => void;
  onContinuityModeChange: (value: AiVideoContinuityMode) => void;
  onTotalDurationChange: (value: number) => void;
  onStoryOutlineChange: (value: string) => void;
  onStoryBeatsChange: (value: string) => void;
  storyOutline: string;
  storyBeats: string;
  quickReferenceOptions: ReferenceQuickOption[];
  isImportingReferenceFiles?: boolean;
  hideTextControls?: boolean;
  disabled?: boolean;
}) {
  const isSequentialMode = isSequentialVideoMode(continuityMode, generateVideo);

  return (
    <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4">
        <div className="text-sm font-bold text-slate-900">Direcao visual</div>
        <div className="mt-1 text-xs text-slate-500">{getFormatDirectionTip(postType)}</div>
      </div>

      <ReferenceImageManager
        value={referenceImageUrls}
        previewUrlByReference={referencePreviewUrlByReference}
        accessStateByReference={referenceAccessStateByReference}
        urlInput={referenceUrlInput}
        onUrlInputChange={onReferenceUrlInputChange}
        onAddUrl={onAddReferenceUrl}
        onImportFiles={onImportReferenceFiles}
        onQuickAdd={onQuickAddReference}
        onMove={onMoveReference}
        onRemove={onRemoveReference}
        quickOptions={quickReferenceOptions}
        disabled={disabled}
        generateVideo={generateVideo}
        isImporting={isImportingReferenceFiles}
      />

      {!hideTextControls ? (
        <div className="mt-5">
        <AssistantPanel
          title="Assistente de direcao visual"
          assistantMessage="Posso comecar por um preset rapido do nicho e voce ajusta os detalhes depois. Isso ajuda a IA a sair de um ponto de partida mais coerente."
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Presets sugeridos
          </div>
          <div className="mt-2">
            <VisualPresetButtons
              presets={VISUAL_STYLE_PRESETS}
              onSelect={onApplyPreset}
              disabled={disabled}
            />
          </div>
        </AssistantPanel>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {!hideTextControls ? (
          <>
        <div className="md:col-span-2">
          <AssistantTextareaField
            title="Assistente do estilo visual"
            assistantMessage="Descreva o clima visual que voce quer ver no resultado: composicao, luz, materiais, enquadramento e nivel de sofisticaçao."
            value={visualStyle}
            onChange={onVisualStyleChange}
            disabled={disabled}
            placeholder={VISUAL_STYLE_PLACEHOLDERS[postType]}
            helper={getVisualStyleHelper(postType)}
          />
        </div>

        <div className="md:col-span-2">
          <AssistantTextareaField
            title="Assistente de restricoes visuais"
            assistantMessage="Se quiser, me diga o que precisa ser evitado no render: texto ruim, excesso de elementos, deformacoes, cara de panfleto ou qualquer ruido que atrapalhe a peca."
            suggestions={NEGATIVE_PROMPT_SUGGESTIONS}
            onSuggestionSelect={onNegativePromptChange}
            value={negativePrompt}
            onChange={onNegativePromptChange}
            disabled={disabled}
            placeholder={NEGATIVE_PROMPT_PLACEHOLDER}
            helper="Use este campo para cortar artefatos comuns como texto ruim, deformacoes, poluicao visual e baixa nitidez."
          />
        </div>
          </>
        ) : null}

        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-700">
            Qualidade
          </label>
          <select
            value={qualityProfile}
            onChange={(event) =>
              onQualityProfileChange(event.target.value as AiPostQualityProfile)
            }
            disabled={disabled}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {QUALITY_PROFILE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">
            {
              QUALITY_PROFILE_OPTIONS.find((option) => option.value === qualityProfile)
                ?.helper
            }
          </p>
        </div>

        {generateVideo ? (
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Resolucao do video
            </label>
            <select
              value={videoResolution}
              onChange={(event) =>
                onVideoResolutionChange(event.target.value as AiVideoResolution)
              }
              disabled={disabled || isSequentialMode}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {VIDEO_RESOLUTION_OPTIONS.map((resolution) => (
                <option key={resolution} value={resolution}>
                  {resolution}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              {isSequentialMode
                ? "O modo sequencial trabalha apenas em 720p para manter a continuidade entre segmentos."
                : "1080p trava a duracao em 8 segundos. Se a Gemini rejeitar essa resolucao, o backend faz fallback e o resultado final pode voltar em 720p."}
            </p>
          </div>
        ) : null}

        {generateVideo ? (
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Modo de continuidade
            </label>
            <select
              value={continuityMode}
              onChange={(event) =>
                onContinuityModeChange(event.target.value as AiVideoContinuityMode)
              }
              disabled={disabled}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {VIDEO_CONTINUITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "SEQUENTIAL" ? "Video longo com continuidade" : "Video unico"}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Ative o modo sequencial para 30s ou 60s. O backend devolve segmentos e a publicacao automatica fica bloqueada ate a consolidacao final.
            </p>
          </div>
        ) : null}
      </div>

      {generateVideo && isSequentialMode ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-bold text-amber-950">
            Video longo com continuidade
          </div>
          <p className="mt-1 text-xs text-amber-900">
            Neste modo, o backend divide a narrativa em segmentos compativeis, mantem continuidade visual e retorna varios videos em `media[]`. O fluxo de publicar/agendar fica bloqueado ate consolidar tudo em um MP4 final.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Duracao total
              </label>
              <select
                value={String(totalDurationSeconds)}
                onChange={(event) => onTotalDurationChange(Number(event.target.value))}
                disabled={disabled}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {VIDEO_TOTAL_DURATION_OPTIONS.map((durationOption) => (
                  <option key={durationOption} value={durationOption}>
                    {durationOption} segundos
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                O modo sequencial opera em 720p e e indicado para historias mais completas, nao para um criativo unico curtinho. Com referencia visual, a continuidade atual trabalha em segmentos de 8 segundos.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Comportamento esperado</div>
              <div className="mt-2">
                O video volta quebrado em segmentos. A consolidacao posterior continua necessaria antes de publicar automaticamente.
              </div>
            </div>

            {!hideTextControls ? (
              <>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Historia resumida
                  </label>
                  <textarea
                    rows={2}
                    value={storyOutline}
                    onChange={(event) => onStoryOutlineChange(event.target.value)}
                    disabled={disabled}
                    placeholder="Ex: abrir com ambiente, mostrar preparo do prato, revelar hero shot e fechar com clima premium"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Resuma a progressao da historia em uma frase clara. Isso ajuda a manter inicio, meio e fim entre os segmentos.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Beats e cenas obrigatorias
                  </label>
                  <textarea
                    rows={4}
                    value={storyBeats}
                    onChange={(event) => onStoryBeatsChange(event.target.value)}
                    disabled={disabled}
                    placeholder={"ambiente e chegada\npreparo final do prato\nclose hero do prato\nencerramento aspiracional"}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Use uma linha por beat. A ordem informada orienta a sequencia narrativa dos segmentos.
                  </p>
                </div>
              </>
            ) : (
              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                A narrativa do video longo esta sendo definida no chat acima. Se quiser ajustar,
                use os prefixos `historia:` e `beats:`.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PreviewMediaSurface({
  postType,
  mediaUrl,
  mediaIsVideo = false,
  showVideoIntent = false,
  accentLabel,
  showAccentBadge = true,
}: {
  postType: AiPostType;
  mediaUrl?: string;
  mediaIsVideo?: boolean;
  showVideoIntent?: boolean;
  accentLabel: string;
  showAccentBadge?: boolean;
}) {
  const aspectClass = postType === "FEED" ? "aspect-[4/5]" : "aspect-[9/16]";
  const hasImagePoster = Boolean(mediaUrl && !mediaIsVideo);
  const isFeedVideo = postType === "FEED" && mediaIsVideo;

  if (mediaUrl && mediaIsVideo) {
    return (
      <div className={`${aspectClass} relative w-full overflow-hidden bg-black`}>
        {isFeedVideo ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(51,65,85,0.7),_rgba(2,6,23,1)_70%)] p-4">
            <div className="w-full overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-[0_24px_60px_-30px_rgba(0,0,0,0.85)]">
              <video
                src={mediaUrl}
                muted
                loop
                playsInline
                autoPlay
                className="aspect-video w-full object-contain"
              />
            </div>
          </div>
        ) : (
          <video
            src={mediaUrl}
            muted
            loop
            playsInline
            autoPlay
            className="h-full w-full object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/35" />
        {showAccentBadge ? (
          <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur">
            {accentLabel}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`${aspectClass} relative w-full overflow-hidden bg-slate-100`}
    >
      {hasImagePoster ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${mediaUrl}")` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-transparent to-black/30" />
          {showAccentBadge ? (
            <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur">
              {accentLabel}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#fef3c7,_#0f172a_58%,_#020617_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/55" />
        </>
      )}
      {!hasImagePoster ? (
        <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white/90 backdrop-blur">
          <div className="text-xs uppercase tracking-[0.22em] text-white/65">{accentLabel}</div>
          <div className="mt-2 text-sm font-medium">
            A IA vai posicionar a midia principal aqui com enquadramento otimizado para {postType.toLowerCase()}.
          </div>
        </div>
      ) : null}
      {showVideoIntent ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InstagramPreviewMock({
  postType,
  caption,
  accountLabel,
  mediaUrl,
  mediaIsVideo = false,
  showVideoIntent = false,
  sequenceCount = 1,
  sequenceSteps = [],
  continuityMode = "SINGLE",
  totalDurationSeconds,
}: {
  postType: AiPostType;
  caption: string;
  accountLabel: string;
  mediaUrl?: string;
  mediaIsVideo?: boolean;
  showVideoIntent?: boolean;
  sequenceCount?: number;
  sequenceSteps?: string[];
  continuityMode?: AiVideoContinuityMode;
  totalDurationSeconds?: number;
}) {
  const normalizedCount = normalizeSequenceCount(sequenceCount);
  const normalizedTotalDuration =
    typeof totalDurationSeconds === "number" && Number.isFinite(totalDurationSeconds)
      ? normalizeTotalDurationSeconds(totalDurationSeconds)
      : undefined;
  const isSequentialPreview = continuityMode === "SEQUENTIAL" && showVideoIntent;
  const previewCaption = caption.trim() || "Sua legenda aparecera aqui.";
  const captionSnippet = previewCaption.replace(/\s+/g, " ").trim();
  const shortCaption =
    captionSnippet.length > 160 ? `${captionSnippet.slice(0, 157).trim()}...` : captionSnippet;
  const items = Array.from({ length: normalizedCount }, (_, index) =>
    getSequenceItemTitle(postType, index, normalizedCount, sequenceSteps[index]),
  );
  const accentLabel = mediaUrl
    ? mediaIsVideo
      ? "Video gerado"
      : showVideoIntent
        ? "Referencia visual"
        : "Imagem gerada"
    : showVideoIntent
      ? "Preview de video"
      : "Preview de imagem";
  const displayAccountLabel =
    accountLabel.replace(/^@/, "").trim().replace(/\s+/g, "_") || "seu_negocio";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-bold text-slate-900">Preview do Instagram</div>
          <div className="text-xs text-slate-500">
            {isSequentialPreview
              ? `${getPostTypeLabel(postType)} - Video continuo de ${normalizedTotalDuration || 30}s`
              : `${getPostTypeLabel(postType)} - ${getSequenceCollectionLabel(postType, normalizedCount)}`}
          </div>
        </div>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {isSequentialPreview
            ? `${postType === "FEED" ? "Feed" : postType === "STORY" ? "Story" : "Reels"} ${normalizedTotalDuration || 30}s`
            : postType === "FEED"
              ? normalizedCount > 1
                ? "Feed em carrossel"
                : "Feed unico"
              : postType === "STORY"
                ? "Story vertical"
                : "Reels vertical"}
        </span>
      </div>

      <div className="mt-5 flex justify-center">
        {postType === "FEED" ? (
          <div className="w-full max-w-[380px] overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,#f97316,#facc15,#22c55e)] p-[2px]">
                  <div className="h-full w-full rounded-full bg-slate-200" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{displayAccountLabel}</div>
                  <div className="text-[11px] text-slate-500">Patrocinado</div>
                </div>
              </div>
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </div>

            <PreviewMediaSurface
              postType={postType}
              mediaUrl={mediaUrl}
              mediaIsVideo={mediaIsVideo}
              showVideoIntent={showVideoIntent}
              accentLabel={accentLabel}
              showAccentBadge={false}
            />

            {normalizedCount > 1 ? (
              <div className="flex items-center justify-center gap-1.5 border-b border-slate-100 py-3">
                {items.map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className={`h-2 rounded-full ${index === 0 ? "w-6 bg-primary-500" : "w-2 bg-slate-300"}`}
                  />
                ))}
              </div>
            ) : null}

            <div className="flex items-center justify-between px-4 py-3 text-slate-700">
              <div className="flex items-center gap-4">
                <Heart className="h-5 w-5" />
                <MessageCircle className="h-5 w-5" />
                <Send className="h-5 w-5" />
              </div>
              <Bookmark className="h-5 w-5" />
            </div>

            <div className="px-4 text-sm font-semibold text-slate-900">Curtido por 1.248 pessoas</div>

            <div className="space-y-2 px-4 pt-3 pb-5">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                <span className="mr-1 font-semibold text-slate-900">{displayAccountLabel}</span>
                {shortCaption}
              </div>
              <div className="text-xs text-slate-400">Ver todos os 84 comentarios</div>
              <div className="border-t border-slate-100 pt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                Ha 12 minutos
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[320px] rounded-[38px] bg-[#090b12] p-3 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.65)]">
            <div className="overflow-hidden rounded-[30px] bg-black">
              {postType === "STORY" ? (
                <div className="relative">
                  <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/55 via-black/20 to-transparent px-3 pt-3 pb-8">
                    <div className="flex gap-1">
                      {items.map((item, index) => (
                        <span
                          key={`${item}-${index}`}
                          className={`h-1 flex-1 rounded-full ${index === 0 ? "bg-white" : "bg-white/35"}`}
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-white">
                      <div className="min-w-0 flex flex-1 items-center gap-2.5">
                        <div className="h-8 w-8 shrink-0 rounded-full border border-white/35 bg-[linear-gradient(135deg,#f97316,#facc15,#22c55e)] p-[1.5px]">
                          <div className="h-full w-full rounded-full bg-white/15" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{displayAccountLabel}</div>
                          <div className="text-[11px] text-white/70">Agora</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <MoreHorizontal className="h-4 w-4" />
                        <X className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <PreviewMediaSurface
                    postType={postType}
                    mediaUrl={mediaUrl}
                    mediaIsVideo={mediaIsVideo}
                    showVideoIntent={showVideoIntent}
                    accentLabel={accentLabel}
                    showAccentBadge={false}
                  />

                  <div className="absolute inset-x-4 bottom-16 z-20 rounded-[28px] border border-white/15 bg-black/30 px-4 py-3 text-white shadow-[0_20px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
                      Story
                    </div>
                    <div className="mt-2 line-clamp-4 text-[15px] leading-7 text-white/92">
                      {shortCaption}
                    </div>
                  </div>

                  <div className="absolute inset-x-4 bottom-4 z-20 flex items-center gap-3 text-white">
                    <div className="flex-1 rounded-full border border-white/20 bg-black/25 px-4 py-2.5 text-sm text-white/65 backdrop-blur-md">
                      Enviar mensagem
                    </div>
                    <Heart className="h-5 w-5 shrink-0" />
                    <Send className="h-5 w-5 shrink-0" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/55 via-black/18 to-transparent px-4 pt-4 pb-10 text-white">
                    <div className="flex items-center gap-3">
                      <div className="text-base font-semibold tracking-[0.01em]">Reels</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Heart className="h-4 w-4 opacity-0" />
                      <MoreHorizontal className="h-4 w-4" />
                    </div>
                  </div>

                  <PreviewMediaSurface
                    postType={postType}
                    mediaUrl={mediaUrl}
                    mediaIsVideo={mediaIsVideo}
                    showVideoIntent={showVideoIntent || postType === "REELS"}
                    accentLabel={accentLabel}
                    showAccentBadge={false}
                  />

                  <div className="absolute bottom-7 right-4 z-20 flex flex-col items-center gap-5 text-white">
                    <div className="flex flex-col items-center gap-1">
                      <Heart className="h-6 w-6" />
                      <span className="text-[10px] font-semibold">1,2 mil</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <MessageCircle className="h-6 w-6" />
                      <span className="text-[10px] font-semibold">84</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Send className="h-6 w-6" />
                      <span className="text-[10px] font-semibold">Enviar</span>
                    </div>
                  </div>

                  <div className="absolute bottom-7 left-4 right-20 z-20 text-white">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full border border-white/35 bg-[linear-gradient(135deg,#f97316,#facc15,#22c55e)] p-[1.5px]">
                        <div className="h-full w-full rounded-full bg-white/15" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{displayAccountLabel}</div>
                      </div>
                      <div className="rounded-full border border-white/35 px-3 py-1 text-[11px] font-semibold">
                        Seguir
                      </div>
                    </div>
                    <div className="mt-3 line-clamp-3 text-sm leading-6 text-white/92">
                      {shortCaption}
                    </div>
                    <div className="mt-2 text-[11px] text-white/65">Audio original</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {normalizedCount > 1 ? (
        <div className="mt-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Sequencia planejada
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <div
                key={`${item}-${index}-chip`}
                className={`rounded-2xl border px-3 py-3 text-sm ${
                  index === 0
                    ? "border-primary-200 bg-primary-50 text-primary-900"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {getSequenceItemTitle(postType, index, normalizedCount)}
                </div>
                <div className="mt-1 font-medium">{item}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isSequentialPreview ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">Video longo unico</div>
          <div className="mt-1 text-amber-800">
            O resultado esperado aqui e uma unica publicacao de {normalizedTotalDuration || 30} segundos. Os segmentos internos servem apenas para compor esse video longo.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatSequentialSegmentRange(item: AiPostRecord["media"][number]) {
  if (
    typeof item.segmentStartSeconds !== "number" ||
    typeof item.segmentEndSeconds !== "number"
  ) {
    return "";
  }

  return `${item.segmentStartSeconds}s - ${item.segmentEndSeconds}s`;
}

function getSequentialSegmentTitle(
  item: AiPostRecord["media"][number],
  index: number,
  storyBeats: string[],
) {
  return String(item.segmentTitle || "").trim() || storyBeats[index] || `Segmento ${index + 1}`;
}

function formatContinuityStrategyLabel(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  return normalized.replace(/[_-]+/g, " ");
}

function GeneratedMediaSection({
  postType,
  media,
  isSequential,
  storyBeats,
  totalDurationSeconds,
}: {
  postType: AiPostType;
  media: AiPostRecord["media"];
  isSequential: boolean;
  storyBeats: string[];
  totalDurationSeconds?: number;
}) {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const resolvedActiveSegmentIndex = Math.min(activeSegmentIndex, media.length - 1);

  if (media.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Nenhum asset retornado para este rascunho.
      </div>
    );
  }

  if (!isSequential) {
    return (
      <div className="space-y-4">
        {media.map((item, index) => (
          <div
            key={item.id || `${item.url}-${index}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
          >
            {isVideoMedia(item) ? (
              <video
                src={item.url}
                controls
                className={getGeneratedMediaClass(postType, true)}
              />
            ) : (
              <img
                src={item.url}
                alt="Asset gerado pela IA"
                className={getGeneratedMediaClass(postType, false)}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  const activeSegmentItem = media[resolvedActiveSegmentIndex] || media[0];
  const normalizedTotalDuration =
    typeof totalDurationSeconds === "number" && Number.isFinite(totalDurationSeconds)
      ? normalizeTotalDurationSeconds(totalDurationSeconds)
      : undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-amber-300 bg-white/70 px-2.5 py-1 text-xs font-semibold text-amber-800">
            1 publicacao
          </span>
          {normalizedTotalDuration ? (
            <span className="inline-flex rounded-full border border-amber-300 bg-white/70 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {normalizedTotalDuration}s totais
            </span>
          ) : null}
          <span className="inline-flex rounded-full border border-amber-300 bg-white/70 px-2.5 py-1 text-xs font-semibold text-amber-800">
            {media.length} segmentos internos
          </span>
        </div>
        <div className="mt-2">
          Este video longo sera uma unica publicacao de {getPostTypeLabel(postType).toLowerCase()}. Os blocos abaixo sao segmentos internos usados para montar o resultado final.
        </div>
      </div>

      {activeSegmentItem ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600">
            <span>
              {getSequentialSegmentTitle(
                activeSegmentItem,
                resolvedActiveSegmentIndex,
                storyBeats,
              )}
            </span>
            <span>
              {formatSequentialSegmentRange(activeSegmentItem) ||
                `Segmento ${resolvedActiveSegmentIndex + 1}`}
            </span>
          </div>
          {isVideoMedia(activeSegmentItem) ? (
            <video
              src={activeSegmentItem.url}
              controls
              className={getGeneratedMediaClass(postType, true)}
            />
          ) : (
            <img
              src={activeSegmentItem.url}
              alt="Segmento gerado pela IA"
              className={getGeneratedMediaClass(postType, false)}
            />
          )}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {media.map((item, index) => {
          const title = getSequentialSegmentTitle(item, index, storyBeats);
          const timeRange = formatSequentialSegmentRange(item);
          const continuityStrategy = formatContinuityStrategyLabel(item.continuityStrategy);
          const isActive = index === resolvedActiveSegmentIndex;

          return (
            <button
              key={item.id || `${item.url}-${index}-segment`}
              type="button"
              onClick={() => setActiveSegmentIndex(index)}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                isActive
                  ? "border-primary-200 bg-primary-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Segmento {index + 1}
                </span>
                <span className="text-xs text-slate-400">
                  {timeRange || `${index + 1}/${media.length}`}
                </span>
              </div>
              <div className="mt-2 font-semibold text-slate-900">{title}</div>
              <div className="mt-2 text-xs text-slate-500">
                {continuityStrategy
                  ? `Estrategia: ${continuityStrategy}`
                  : "Continuidade visual e narrativa"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const statusFilters = [
  { label: "Todos", value: "" },
  { label: "Na fila", value: "QUEUED" },
  { label: "Processando", value: "GENERATING" },
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

function getErrorMessage(error: unknown, fallback: string) {
  const appendReferenceAccessHint = (message: string) => {
    if (isReferenceDownloadForbiddenMessage(message)) {
      return `${message} A imagem importada do PC ficou com preview local, mas a URL retornada pelo upload de referencia parece protegida. Para a IA baixar a referencia sem falhar, essa URL precisa ser publica.`;
    }

    return message;
  };

  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;

    if (typeof message === "string" && message.trim()) {
      return appendReferenceAccessHint(message);
    }

    if (Array.isArray(message) && message.length > 0) {
      return appendReferenceAccessHint(String(message[0]));
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return appendReferenceAccessHint(error.message);
  }

  return fallback;
}

function normalizeAiPostStatus(status?: string | null) {
  return String(status || "").trim().toUpperCase();
}

function isAiPostProcessingStatus(status?: string | null) {
  return AI_POST_PROCESSING_STATUSES.includes(normalizeAiPostStatus(status));
}

function isAiPostTerminalStatus(status?: string | null) {
  return AI_POST_TERMINAL_STATUSES.includes(normalizeAiPostStatus(status));
}

function buildAsyncGenerationFeedbackMessage({
  readyCount,
  failedCount,
}: {
  readyCount: number;
  failedCount: number;
}) {
  if (readyCount > 0 && failedCount === 0) {
    return readyCount > 1
      ? `${readyCount} rascunhos sairam da fila e ja estao prontos para revisao.`
      : "Seu rascunho saiu da fila e ja esta pronto para revisao.";
  }

  if (readyCount > 0 && failedCount > 0) {
    return `${readyCount} rascunhos ficaram prontos e ${failedCount} falharam no processamento. Revise os itens na biblioteca.`;
  }

  return failedCount > 1
    ? `${failedCount} geracoes falharam no processamento. Revise o briefing e tente novamente.`
    : "A geracao falhou no processamento. Revise o briefing e tente novamente.";
}

function parseAiPostSocketEvent(rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue) as AiPostSocketEvent;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function buildAiPostSocketUrl(notificationChannelId: string) {
  const normalizedChannelId = String(notificationChannelId || "").trim();

  if (!normalizedChannelId) {
    return null;
  }

  const configuredBaseUrl = String(process.env.NEXT_PUBLIC_WS_URL || "").trim();
  const apiBaseUrl = String(process.env.NEXT_PUBLIC_API_URL || "").trim();
  let baseUrl = configuredBaseUrl;

  if (!baseUrl && apiBaseUrl) {
    try {
      const parsedApiBaseUrl = new URL(apiBaseUrl);
      parsedApiBaseUrl.protocol =
        parsedApiBaseUrl.protocol === "https:" ? "wss:" : "ws:";
      parsedApiBaseUrl.pathname = "/dev";
      parsedApiBaseUrl.search = "";
      parsedApiBaseUrl.hash = "";
      baseUrl = parsedApiBaseUrl.toString();
    } catch {
      return null;
    }
  }

  if (!baseUrl) {
    return null;
  }

  try {
    const socketUrl = new URL(baseUrl);
    socketUrl.searchParams.set("channelId", normalizedChannelId);
    return socketUrl.toString();
  } catch {
    return null;
  }
}

function getStatusMeta(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "QUEUED":
      return {
        label: "Na fila",
        className: "border-blue-200 bg-blue-50 text-blue-700",
      };
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
      return "Story pode sair como imagem ou video vertical. Priorize foco central, leitura rapida e area segura para hashtag e arroba.";
    case "REELS":
      return "Reels segue com foco em video curto, gancho forte e ritmo mais dinamico.";
    case "FEED":
    default:
      return "Feed pode sair como imagem ou video, de acordo com a estrategia.";
  }
}

function StoryPremisesBalloons() {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Story pode ser gerado como imagem ou video, mas a composicao precisa manter
        leitura vertical rapida e foco central para nao perder a mensagem.
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Como premissa, o cliente precisa fazer a marcacao da hashtag e do
        arroba de forma visivel no story. Nao pode usar escrita transparente,
        branca, escondida ou muito pequena.
      </div>
    </div>
  );
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

function getPreferredPreviewMedia(post?: AiPostRecord | null) {
  if (!post || post.media.length === 0) {
    return undefined;
  }

  if (isVideoGenerationPost(post)) {
    return post.media.find((item) => isVideoMedia(item)) || post.media[0];
  }

  return post.media.find((item) => !isVideoMedia(item)) || post.media[0];
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

function PublicacoesIaPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [postTypeFilter, setPostTypeFilter] = useState("");
  const [libraryPage, setLibraryPage] = useState(1);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isPostDetailModalOpen, setIsPostDetailModalOpen] = useState(false);
  const [batchGenerationProgress, setBatchGenerationProgress] =
    useState<BatchGenerationProgress>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [trackedAsyncGenerationJobs, setTrackedAsyncGenerationJobs] = useState<
    TrackedAsyncGenerationJob[]
  >([]);
  const aiPostSocketByJobIdRef = useRef<Record<string, WebSocket>>({});
  const toastTimeoutByIdRef = useRef<Record<string, number>>({});
  const handledAsyncTerminalStatusRef = useRef<Record<string, true>>({});
  const [generateForm, setGenerateForm] = useState<GenerateFormState>(defaultGenerateForm);
  const [generateBriefingChatMessages, setGenerateBriefingChatMessages] = useState<
    AiBriefingChatMessage[]
  >(() => createInitialAiBriefingChatMessages());
  const [generateBriefingFocusedField, setGenerateBriefingFocusedField] =
    useState<AiBriefingChatField | null>(null);
  const [draftState, setDraftState] = useState<DraftState>(createEmptyDraftState());
  const [generateReferencePreviewUrlByReference, setGenerateReferencePreviewUrlByReference] =
    useState<Record<string, string>>({});
  const [generateReferenceAccessStateByReference, setGenerateReferenceAccessStateByReference] =
    useState<Record<string, ReferenceAccessState>>({});
  const [draftReferencePreviewUrlByReference, setDraftReferencePreviewUrlByReference] =
    useState<Record<string, string>>({});
  const [draftReferenceAccessStateByReference, setDraftReferenceAccessStateByReference] =
    useState<Record<string, ReferenceAccessState>>({});
  const [referenceUrlInput, setReferenceUrlInput] = useState("");
  const [draftReferenceUrlInput, setDraftReferenceUrlInput] = useState("");
  const searchParamsString = searchParams.toString();
  const activeSection = useMemo<AiPostsSectionId>(() => {
    const sectionFromQuery = searchParams.get("section");
    return isAiPostsSectionId(sectionFromQuery) ? sectionFromQuery : "generate";
  }, [searchParams]);

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
  const isSelectedPostProcessing = isAiPostProcessingStatus(selectedPost?.status);

  const navigateToSection = useCallback((section: AiPostsSectionId) => {
    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("section", section);
    router.replace(`${pathname}?${nextParams.toString()}`);
  }, [pathname, router, searchParamsString]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));

    const timeoutId = toastTimeoutByIdRef.current[toastId];

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete toastTimeoutByIdRef.current[toastId];
    }
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const toastId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextToast: ToastItem = {
        id: toastId,
        ...toast,
      };

      setToasts((current) => [...current.slice(-2), nextToast]);

      toastTimeoutByIdRef.current[toastId] = window.setTimeout(() => {
        dismissToast(toastId);
      }, TOAST_DURATION_MS);
    },
    [dismissToast],
  );

  const shouldNotifyAsyncTerminalStatus = useCallback(
    (aiPostId: string, status: string) => {
      const normalizedAiPostId = String(aiPostId || "").trim();
      const normalizedStatus = normalizeAiPostStatus(status);
      const statusKey = `${normalizedAiPostId}:${normalizedStatus}`;

      if (!normalizedAiPostId || !normalizedStatus) {
        return false;
      }

      if (handledAsyncTerminalStatusRef.current[statusKey]) {
        return false;
      }

      handledAsyncTerminalStatusRef.current[statusKey] = true;
      return true;
    },
    [],
  );

  useEffect(() => {
    if (searchParams.get("section") === activeSection) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("section", activeSection);
    router.replace(`${pathname}?${nextParams.toString()}`);
  }, [activeSection, pathname, router, searchParams, searchParamsString]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncViewport = (matches: boolean) => {
      setIsMobileViewport(matches);
    };

    syncViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncViewport(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId);
    setDraftReferenceUrlInput("");

    if (isMobileViewport) {
      setIsPostDetailModalOpen(true);
    }
  };

  const isMetaConnected = Boolean(me?.metaConnected);
  const quickReferenceOptions = useMemo<ReferenceQuickOption[]>(() => {
    const options: ReferenceQuickOption[] = [];
    const avatarUrl = String(me?.avatarUrl || me?.avatar || "").trim();
    const coverUrl = String(me?.coverUrl || me?.cover || "").trim();

    if (avatarUrl) {
      options.push({
        label: "Usar logo/avatar",
        helper: "Boa opcao para reforcar identidade visual da marca.",
        url: avatarUrl,
      });
    }

    if (coverUrl) {
      options.push({
        label: "Usar capa da marca",
        helper: "Ajuda a manter ambiente, fachada ou atmosfera principal do negocio.",
        url: coverUrl,
      });
    }

    return options;
  }, [me]);
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
  const remainingAiGenerations = Math.max(aiPostsGenerationLimit - totalAiGenerations, 0);
  const remainingAiVideoGenerations = Math.max(
    aiPostsVideoGenerationLimit - totalAiVideoGenerations,
    0,
  );
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
  const parsedStoryBeats = parseStoryBeatsInput(currentDraft.storyBeats);
  const parsedGenerateSequenceSteps = parseSequenceStepsInput(generateForm.sequenceSteps);
  const isCurrentDraftSequential = isSequentialVideoMode(
    currentDraft.continuityMode,
    currentDraft.generateVideo,
  );
  const isGenerateVideoReferenceMode = hasVideoReferenceImages(
    generateForm.generateVideo,
    generateForm.referenceImageUrls,
  );
  const isGenerateSequentialMode = isSequentialVideoMode(
    generateForm.continuityMode,
    generateForm.generateVideo,
  );
  const isCurrentDraftVideoReferenceMode = hasVideoReferenceImages(
    currentDraft.generateVideo,
    currentDraft.referenceImageUrls,
  );
  const generateProtectedReferenceUrls = getProtectedReferenceUrls(
    generateForm.referenceImageUrls,
    generateReferenceAccessStateByReference,
  );
  const draftProtectedReferenceUrls = getProtectedReferenceUrls(
    currentDraft.referenceImageUrls,
    draftReferenceAccessStateByReference,
  );
  const isGenerateBlockedByProtectedReferences =
    generateProtectedReferenceUrls.length > 0;
  const asyncQueuedCount = trackedAsyncGenerationJobs.filter(
    (job) => normalizeAiPostStatus(job.status) === "QUEUED",
  ).length;
  const asyncProcessingCount = trackedAsyncGenerationJobs.filter(
    (job) => normalizeAiPostStatus(job.status) === "GENERATING",
  ).length;
  const asyncPublishingCount = trackedAsyncGenerationJobs.filter(
    (job) => normalizeAiPostStatus(job.status) === "PUBLISHING",
  ).length;
  const generateBriefingValues = useMemo(
    () => buildAiBriefingConversationValues(generateBriefingChatMessages),
    [generateBriefingChatMessages],
  );
  const generateBriefingContext = useMemo<AiBriefingFlowContext>(
    () => ({
      generateImage: generateForm.generateImage,
      generateVideo: generateForm.generateVideo,
      isSequentialVideo: isGenerateSequentialMode,
      postType: generateForm.postType,
    }),
    [
      generateForm.generateImage,
      generateForm.generateVideo,
      generateForm.postType,
      isGenerateSequentialMode,
    ],
  );
  const nextGenerateBriefingField = useMemo(
    () => getNextAiBriefingChatField(generateBriefingValues, generateBriefingContext),
    [generateBriefingContext, generateBriefingValues],
  );
  const generateBriefingTimelineSteps = useMemo(
    () => getAiBriefingTimelineSteps(generateBriefingContext),
    [generateBriefingContext],
  );
  const activeGenerateBriefingField =
    generateBriefingFocusedField || nextGenerateBriefingField || null;
  const activeGenerateBriefingStep =
    generateBriefingTimelineSteps.find((step) => step.field === activeGenerateBriefingField) ||
    null;
  const generateBriefingActionSuggestions = useMemo(
    () =>
      activeGenerateBriefingField
        ? getAiBriefingSuggestions(activeGenerateBriefingField, {
            postType: generateBriefingContext.postType,
          })
        : [],
    [activeGenerateBriefingField, generateBriefingContext.postType],
  );
  const generateBriefingCurrentFieldValue = activeGenerateBriefingField
    ? getLatestAiBriefingUserContent(
        generateBriefingChatMessages,
        activeGenerateBriefingField,
      )
    : "";
  const generateBriefingCompletedRequiredSteps = generateBriefingTimelineSteps.filter(
    (step) => !step.optional && getLatestAiBriefingUserContent(generateBriefingChatMessages, step.field),
  ).length;
  const generateBriefingRequiredStepCount = generateBriefingTimelineSteps.filter(
    (step) => !step.optional,
  ).length;
  const previewAccountLabel =
    String(me?.instagramHandle || me?.slug || me?.name || "seu_negocio")
      .replace(/^@/, "")
      .trim() || "seu_negocio";
  const selectedPreviewMedia = getPreferredPreviewMedia(selectedPost);
  const selectedPreviewMediaUrl =
    String(
      selectedPreviewMedia?.url ||
        draftReferencePreviewUrlByReference[currentDraft.referenceImageUrls[0] || ""] ||
        currentDraft.referenceImageUrls[0] ||
        "",
    ).trim() ||
    undefined;
  const selectedPreviewMediaIsVideo = selectedPreviewMedia
    ? isVideoMedia(selectedPreviewMedia)
    : false;
  const selectedPreviewShowsVideoIntent =
    currentDraft.generateVideo || selectedPreviewMediaIsVideo;
  const draftPreviewCaption = buildPreviewCaptionText({
    caption: currentDraft.caption || selectedPost?.publishPreview,
    prompt: currentDraft.prompt,
    topic: currentDraft.topic,
    callToAction: currentDraft.callToAction,
    hashtags: currentDraft.hashtags,
  });
  const generatePreviewCaption = buildPreviewCaptionText({
    prompt: generateBriefingValues.prompt,
    topic: generateBriefingValues.topic,
    callToAction: generateBriefingValues.callToAction,
  });
  const generatePreviewMediaUrl =
    generateReferencePreviewUrlByReference[generateForm.referenceImageUrls[0] || ""] ||
    generateForm.referenceImageUrls[0];

  const updateDraft = (partial: Partial<DraftState>) => {
    setDraftState((state) => {
      const selectedPostIdValue = selectedPost?.id || "";
      const baseState =
        state.postId === selectedPostIdValue ? state : createDraftStateFromPost(selectedPost);

      return applyVideoReferenceModelConstraints({
        ...baseState,
        ...partial,
        postId: selectedPostIdValue,
      });
    });
  };

  const resetGenerateBriefingChat = useCallback(() => {
    setGenerateBriefingChatMessages(createInitialAiBriefingChatMessages());
    setGenerateBriefingFocusedField(null);
  }, []);

  const selectGenerateBriefingTimelineStep = useCallback(
    (field: AiBriefingChatField) => {
      setGenerateBriefingFocusedField(field);
    },
    [],
  );

  const clearGenerateBriefingTimelineStep = useCallback(
    (field: AiBriefingChatField) => {
      setGenerateBriefingChatMessages((current) => {
        const nextUserMessages = current.filter(
          (message) => !(message.role === "user" && message.field === field),
        );

        return rebuildAiBriefingChatMessages(nextUserMessages, generateBriefingContext);
      });

      setGenerateBriefingFocusedField(field);
    },
    [generateBriefingContext],
  );

  const submitGenerateBriefingChatMessage = useCallback(
    (rawValue: string, forcedField?: AiBriefingChatField | null) => {
      const normalizedValue = rawValue.trim();

      if (!normalizedValue) {
        return;
      }

      const currentField =
        forcedField ||
        generateBriefingFocusedField ||
        nextGenerateBriefingField ||
        "prompt";
      const currentFieldValue = getLatestAiBriefingUserContent(
        generateBriefingChatMessages,
        currentField,
      );
      const isDuplicateLatestValue =
        normalizeChatSuggestionValue(currentFieldValue) ===
        normalizeChatSuggestionValue(normalizedValue);

      if (isDuplicateLatestValue) {
        return;
      }

      const currentUserMessages = generateBriefingChatMessages.filter(
        (message) => message.role === "user" && message.field !== currentField,
      );
      const nextUserMessages = [
        ...currentUserMessages,
        createAiBriefingChatMessage("user", normalizedValue, currentField),
      ];
      const nextMessages = rebuildAiBriefingChatMessages(
        nextUserMessages,
        generateBriefingContext,
      );
      const nextValues = buildAiBriefingConversationValues(nextMessages);
      const nextField = getNextAiBriefingChatField(nextValues, generateBriefingContext);

      setGenerateBriefingChatMessages(nextMessages);
      setGenerateBriefingFocusedField(nextField);
    },
    [
      generateBriefingContext,
      generateBriefingChatMessages,
      generateBriefingFocusedField,
      nextGenerateBriefingField,
    ],
  );

  const appendReferenceUrl = (
    currentUrls: string[],
    nextUrl: string,
  ): { urls?: string[]; error?: string } => {
    const normalizedValue = nextUrl.trim();

    if (!normalizedValue) {
      return { error: "Cole uma URL publica de imagem antes de adicionar." };
    }

    if (!isValidReferenceImageUrl(normalizedValue)) {
      return {
        error:
          "Use uma URL publica valida, com http ou https, sem espacos em branco.",
      };
    }

    if (currentUrls.includes(normalizedValue)) {
      return { error: "Essa referencia ja foi adicionada." };
    }

    if (currentUrls.length >= 3) {
      return { error: "Voce pode usar no maximo 3 imagens de referencia." };
    }

    return {
      urls: normalizeReferenceImageUrls([...currentUrls, normalizedValue]),
    };
  };

  const appendReferenceUrls = (
    currentUrls: string[],
    nextUrls: string[],
  ): { urls?: string[]; error?: string } => {
    let mergedUrls = [...currentUrls];

    for (const nextUrl of nextUrls) {
      const result = appendReferenceUrl(mergedUrls, nextUrl);

      if (result.error) {
        return result;
      }

      mergedUrls = result.urls || mergedUrls;
    }

    return {
      urls: mergedUrls,
    };
  };

  const moveReferenceUrl = (urls: string[], fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= urls.length ||
      toIndex >= urls.length ||
      fromIndex === toIndex
    ) {
      return urls;
    }

    const nextUrls = [...urls];
    const [item] = nextUrls.splice(fromIndex, 1);
    nextUrls.splice(toIndex, 0, item);
    return nextUrls;
  };

  const handleMoveGenerateReference = (fromIndex: number, toIndex: number) => {
    setGenerateForm((current) => ({
      ...current,
      referenceImageUrls: moveReferenceUrl(
        current.referenceImageUrls,
        fromIndex,
        toIndex,
      ),
    }));

    setFeedback({
      type: "info",
      message:
        toIndex === 0
          ? "Referencia principal atualizada."
          : "Ordem das referencias atualizada.",
    });
  };

  const handleMoveDraftReference = (fromIndex: number, toIndex: number) => {
    setDraftState((state) => {
      const selectedPostIdValue = selectedPost?.id || "";
      const baseState =
        state.postId === selectedPostIdValue ? state : createDraftStateFromPost(selectedPost);

      return applyVideoReferenceModelConstraints({
        ...baseState,
        postId: selectedPostIdValue,
        referenceImageUrls: moveReferenceUrl(
          baseState.referenceImageUrls,
          fromIndex,
          toIndex,
        ),
      });
    });

    setFeedback({
      type: "info",
      message:
        toIndex === 0
          ? "Referencia principal atualizada."
          : "Ordem das referencias atualizada.",
    });
  };

  const handleAddGenerateReferenceUrl = (nextUrl?: string) => {
    const normalizedValue = String(nextUrl ?? referenceUrlInput).trim();
    const result = appendReferenceUrl(
      generateForm.referenceImageUrls,
      normalizedValue,
    );

    if (result.error) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    const shouldAdjustVideoReferenceConfig =
      generateForm.generateVideo && generateForm.durationSeconds !== 8;

    setGenerateForm((current) =>
      applyVideoReferenceModelConstraints({
        ...current,
        referenceImageUrls: result.urls || current.referenceImageUrls,
      }),
    );
    setGenerateReferenceAccessStateByReference((current) => ({
      ...current,
      [normalizedValue]: "public",
    }));
    setReferenceUrlInput("");
    setFeedback(
      shouldAdjustVideoReferenceConfig
        ? {
            type: "info",
            message:
              "Video com imagem de referencia exige 8 segundos no modelo atual. Ajustamos a duracao automaticamente.",
          }
        : null,
    );
  };

  const handleAddDraftReferenceUrl = (nextUrl?: string) => {
    const normalizedValue = String(nextUrl ?? draftReferenceUrlInput).trim();
    const result = appendReferenceUrl(
      currentDraft.referenceImageUrls,
      normalizedValue,
    );

    if (result.error) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    const shouldAdjustVideoReferenceConfig =
      currentDraft.generateVideo && currentDraft.durationSeconds !== 8;

    updateDraft({
      referenceImageUrls: result.urls || currentDraft.referenceImageUrls,
    });
    setDraftReferenceAccessStateByReference((current) => ({
      ...current,
      [normalizedValue]: "public",
    }));
    setDraftReferenceUrlInput("");
    setFeedback(
      shouldAdjustVideoReferenceConfig
        ? {
            type: "info",
            message:
              "Video com imagem de referencia exige 8 segundos no modelo atual. Ajustamos a duracao automaticamente.",
          }
        : null,
    );
  };

  const referenceImageImportMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!Array.isArray(files) || files.length === 0) {
        return [] as Array<{
          fileName: string;
          url: string;
          previewDataUrl: string;
          browserPreviewReady: boolean;
        }>;
      }

      const uploadedItems: Array<{
        fileName: string;
        url: string;
        previewDataUrl: string;
        browserPreviewReady: boolean;
      }> = [];

      for (const file of files) {
        if (!isValidReferenceImageFile(file)) {
          throw new Error(`O arquivo "${file.name}" nao e uma imagem valida.`);
        }

        const dataUrl = await readFileAsDataUrl(file);
        const uploadedAsset = await establishmentApi.uploadAiPostReferenceImage({
          dataUrl,
          fileName: file.name,
          bucket: DEFAULT_AI_REFERENCE_BUCKET,
        });
        const uploadedUrl = String(uploadedAsset?.url || "").trim();

        if (!isValidReferenceImageUrl(uploadedUrl)) {
          throw new Error(
            `Nao foi possivel obter a URL publica da imagem "${file.name}" depois do upload.`,
          );
        }

        const browserPreviewReady = await canRenderImageFromUrl(uploadedUrl);

        uploadedItems.push({
          fileName: file.name,
          url: uploadedUrl,
          previewDataUrl: dataUrl,
          browserPreviewReady,
        });
      }

      return uploadedItems;
    },
  });

  const buildReferenceImportSuccessMessage = (
    importedCount: number,
    adjustedVideoReferenceConfig: boolean,
    inaccessibleCount = 0,
  ) => {
    const baseMessage =
      importedCount > 1
        ? `${importedCount} imagens foram importadas do PC e adicionadas como referencias.`
        : "Imagem importada do PC e adicionada como referencia.";

    const accessibilityWarning =
      inaccessibleCount > 0
        ? ` O preview local foi mantido, mas ${inaccessibleCount > 1 ? "algumas URLs retornadas pelo upload parecem protegidas" : "a URL retornada pelo upload parece protegida"} e a geracao fica bloqueada ate voce trocar por uma URL publica.`
        : "";

    if (!adjustedVideoReferenceConfig) {
      return `${baseMessage} A referencia ja entrou como URL publica no S3.${accessibilityWarning}`;
    }

    return `${baseMessage} Video com imagem de referencia exige 8 segundos no modelo atual. Ajustamos a duracao automaticamente.${accessibilityWarning}`;
  };

  const handleImportGenerateReferenceFiles = async (filesList: FileList | null) => {
    const files = Array.from(filesList ?? []);

    if (files.length === 0) {
      return;
    }

    if (generateForm.referenceImageUrls.length + files.length > 3) {
      setFeedback({
        type: "error",
        message: "Voce pode usar no maximo 3 imagens de referencia.",
      });
      return;
    }

    try {
      const importedItems = await referenceImageImportMutation.mutateAsync(files);
      const importedUrls = importedItems.map((item) => item.url);
      const result = appendReferenceUrls(generateForm.referenceImageUrls, importedUrls);

      if (result.error) {
        setFeedback({ type: "error", message: result.error });
        return;
      }

      const shouldAdjustVideoReferenceConfig =
        generateForm.generateVideo && generateForm.durationSeconds !== 8;
      const nextPreviewEntries = Object.fromEntries(
        importedItems.map((item) => [item.url, item.previewDataUrl]),
      );
      const nextAccessStateEntries = Object.fromEntries(
        importedItems.map((item) => [
          item.url,
          item.browserPreviewReady ? "public" : "protected",
        ]),
      ) as Record<string, ReferenceAccessState>;
      const inaccessibleCount = importedItems.filter(
        (item) => !item.browserPreviewReady,
      ).length;

      setGenerateForm((current) =>
        applyVideoReferenceModelConstraints({
          ...current,
          referenceImageUrls: result.urls || current.referenceImageUrls,
        }),
      );
      setGenerateReferencePreviewUrlByReference((current) => ({
        ...current,
        ...nextPreviewEntries,
      }));
      setGenerateReferenceAccessStateByReference((current) => ({
        ...current,
        ...nextAccessStateEntries,
      }));
      setFeedback({
        type: inaccessibleCount > 0 ? "info" : "success",
        message: buildReferenceImportSuccessMessage(
          importedItems.length,
          shouldAdjustVideoReferenceConfig,
          inaccessibleCount,
        ),
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "Nao foi possivel importar a imagem de referencia pelo PC.",
        ),
      });
    }
  };

  const handleImportDraftReferenceFiles = async (filesList: FileList | null) => {
    const files = Array.from(filesList ?? []);

    if (files.length === 0) {
      return;
    }

    if (currentDraft.referenceImageUrls.length + files.length > 3) {
      setFeedback({
        type: "error",
        message: "Voce pode usar no maximo 3 imagens de referencia.",
      });
      return;
    }

    try {
      const importedItems = await referenceImageImportMutation.mutateAsync(files);
      const importedUrls = importedItems.map((item) => item.url);
      const result = appendReferenceUrls(currentDraft.referenceImageUrls, importedUrls);

      if (result.error) {
        setFeedback({ type: "error", message: result.error });
        return;
      }

      const shouldAdjustVideoReferenceConfig =
        currentDraft.generateVideo && currentDraft.durationSeconds !== 8;
      const nextPreviewEntries = Object.fromEntries(
        importedItems.map((item) => [item.url, item.previewDataUrl]),
      );
      const nextAccessStateEntries = Object.fromEntries(
        importedItems.map((item) => [
          item.url,
          item.browserPreviewReady ? "public" : "protected",
        ]),
      ) as Record<string, ReferenceAccessState>;
      const inaccessibleCount = importedItems.filter(
        (item) => !item.browserPreviewReady,
      ).length;

      updateDraft({
        referenceImageUrls: result.urls || currentDraft.referenceImageUrls,
      });
      setDraftReferencePreviewUrlByReference((current) => ({
        ...current,
        ...nextPreviewEntries,
      }));
      setDraftReferenceAccessStateByReference((current) => ({
        ...current,
        ...nextAccessStateEntries,
      }));
      setFeedback({
        type: inaccessibleCount > 0 ? "info" : "success",
        message: buildReferenceImportSuccessMessage(
          importedItems.length,
          shouldAdjustVideoReferenceConfig,
          inaccessibleCount,
        ),
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "Nao foi possivel importar a imagem de referencia pelo PC.",
        ),
      });
    }
  };

  const trackAsyncGenerationJobs = (jobs: AiPostAsyncGenerationResponse[]) => {
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return;
    }

    setTrackedAsyncGenerationJobs((current) => {
      const nextJobs = [...current];

      jobs.forEach((job) => {
        const aiPostId = String(job.aiPostId || "").trim();

        if (!aiPostId) {
          return;
        }

        const existingIndex = nextJobs.findIndex((item) => item.aiPostId === aiPostId);
        const nextJob: TrackedAsyncGenerationJob = {
          aiPostId,
          status: normalizeAiPostStatus(job.status) || "QUEUED",
          notificationChannelId: String(job.notificationChannelId || "").trim() || undefined,
        };

        if (existingIndex >= 0) {
          nextJobs[existingIndex] = {
            ...nextJobs[existingIndex],
            ...nextJob,
          };
          return;
        }

        nextJobs.push(nextJob);
      });

      return nextJobs;
    });
  };

  const updateTrackedAsyncGenerationJobStatus = useCallback(
    (aiPostId: string, status: string) => {
      const normalizedAiPostId = String(aiPostId || "").trim();
      const normalizedStatus = normalizeAiPostStatus(status);

      if (!normalizedAiPostId || !normalizedStatus) {
        return;
      }

      setTrackedAsyncGenerationJobs((current) =>
        current.map((job) =>
          job.aiPostId === normalizedAiPostId
            ? {
                ...job,
                status: normalizedStatus,
              }
            : job,
        ),
      );
    },
    [],
  );

  const removeTrackedAsyncGenerationJob = useCallback((aiPostId: string) => {
    const normalizedAiPostId = String(aiPostId || "").trim();

    if (!normalizedAiPostId) {
      return;
    }

    setTrackedAsyncGenerationJobs((current) =>
      current.filter((job) => job.aiPostId !== normalizedAiPostId),
    );
  }, []);

  const handleAiPostSocketEvent = useCallback(
    async (socketEvent: AiPostSocketEvent) => {
      const aiPostId = String(
        socketEvent.aiPostId ||
          socketEvent.aiPost?._id ||
          socketEvent.aiPost?.id ||
          "",
      ).trim();
      const normalizedStatus = normalizeAiPostStatus(socketEvent.status);

      if (!aiPostId) {
        return;
      }

      if (normalizedStatus && !isAiPostTerminalStatus(normalizedStatus)) {
        updateTrackedAsyncGenerationJobStatus(aiPostId, normalizedStatus);
      }

      if (normalizedStatus === "READY") {
        const shouldNotify = shouldNotifyAsyncTerminalStatus(aiPostId, normalizedStatus);

        try {
          const aiPost = await establishmentApi.getAiPost(aiPostId);

          if (aiPost?.id) {
            queryClient.setQueryData(["ai-post", aiPost.id], aiPost);
            queryClient.invalidateQueries({ queryKey: ["ai-post", aiPost.id] });
            setSelectedPostId(aiPost.id);
          }
        } catch {
          queryClient.invalidateQueries({ queryKey: ["ai-post", aiPostId] });
        }

        queryClient.invalidateQueries({ queryKey: ["ai-posts"] });
        removeTrackedAsyncGenerationJob(aiPostId);

        if (shouldNotify) {
          const readyMessage = buildAsyncGenerationFeedbackMessage({
            readyCount: 1,
            failedCount: 0,
          });

          setFeedback({
            type: "success",
            message: readyMessage,
          });
          addDashboardRuntimeNotification({
            type: "success",
            title: "Publicacao pronta",
            message: "Seu rascunho ja esta pronto para revisao.",
            href: AI_POSTS_LIBRARY_HREF,
          });
          showToast({
            type: "success",
            title: "Publicacao pronta",
            message: "Seu rascunho ja esta pronto para revisao.",
          });
        }
        return;
      }

      if (normalizedStatus === "FAILED") {
        const shouldNotify = shouldNotifyAsyncTerminalStatus(aiPostId, normalizedStatus);
        queryClient.invalidateQueries({ queryKey: ["ai-post", aiPostId] });
        queryClient.invalidateQueries({ queryKey: ["ai-posts"] });
        removeTrackedAsyncGenerationJob(aiPostId);

        if (shouldNotify) {
          const failedMessage =
            String(socketEvent.message || "").trim() ||
            buildAsyncGenerationFeedbackMessage({
              readyCount: 0,
              failedCount: 1,
            });

          setFeedback({
            type: "error",
            message: failedMessage,
          });
          addDashboardRuntimeNotification({
            type: "error",
            title: "Falha na geracao",
            message: failedMessage,
            href: AI_POSTS_LIBRARY_HREF,
          });
          showToast({
            type: "error",
            title: "Falha na geracao",
            message: failedMessage,
          });
        }
        return;
      }

      if (normalizedStatus && isAiPostTerminalStatus(normalizedStatus)) {
        queryClient.invalidateQueries({ queryKey: ["ai-post", aiPostId] });
        queryClient.invalidateQueries({ queryKey: ["ai-posts"] });
        removeTrackedAsyncGenerationJob(aiPostId);
      }
    },
    [
      queryClient,
      removeTrackedAsyncGenerationJob,
      shouldNotifyAsyncTerminalStatus,
      showToast,
      updateTrackedAsyncGenerationJobStatus,
    ],
  );

  const generateMutation = useMutation({
    mutationFn: async () => {
      const normalizedReferenceImageUrls = normalizeReferenceImageUrls(
        generateForm.referenceImageUrls,
      );
      const normalizedVideoSettings = normalizeVideoSettings(
        generateForm.durationSeconds,
        generateForm.videoResolution,
        generateForm.continuityMode,
      );
      const normalizedStoryBeats = parseStoryBeatsInput(generateBriefingValues.storyBeats);
      const normalizedSequenceCount = normalizeSequenceCount(generateForm.sequenceCount);
      const normalizedSequenceSteps = parseSequenceStepsInput(generateForm.sequenceSteps);

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

      if (normalizedSequenceCount > remainingAiGenerations) {
        throw new Error(
          `Sua sequencia pede ${normalizedSequenceCount} geracoes, mas restam apenas ${remainingAiGenerations} no plano atual.`,
        );
      }

      if (
        generateForm.generateVideo &&
        normalizedSequenceCount > remainingAiVideoGenerations
      ) {
        throw new Error(
          `Sua sequencia pede ${normalizedSequenceCount} videos, mas restam apenas ${remainingAiVideoGenerations} geracoes de video no plano atual.`,
        );
      }

      if (generateForm.mode === "CAMPAIGN" && !generateForm.campaignId) {
        throw new Error("Selecione uma campanha para gerar uma publicação vinculada.");
      }

      if (!generateBriefingValues.prompt.trim()) {
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

      if (generateForm.referenceImageUrls.some((url) => !isValidReferenceImageUrl(url))) {
        throw new Error(
          "Revise as imagens de referencia. Use apenas URLs publicas validas com http ou https.",
        );
      }

      const protectedReferenceGenerationMessage =
        getProtectedReferenceGenerationMessage(generateProtectedReferenceUrls);

      if (protectedReferenceGenerationMessage) {
        throw new Error(protectedReferenceGenerationMessage);
      }

      const videoReferenceValidationMessage = getVideoReferenceValidationMessage({
        generateVideo: generateForm.generateVideo,
        durationSeconds: normalizedVideoSettings.durationSeconds,
        referenceImageUrls: normalizedReferenceImageUrls,
      });

      if (videoReferenceValidationMessage) {
        throw new Error(videoReferenceValidationMessage);
      }

      if (isGenerateSequentialMode) {
        if (!generateBriefingValues.storyOutline.trim()) {
          throw new Error(
            "Descreva a historia resumida do video longo antes de gerar o modo sequencial.",
          );
        }

        if (!Number.isFinite(generateForm.totalDurationSeconds)) {
          throw new Error("Defina a duracao total do video longo.");
        }
      }

      const queuedJobs: AiPostAsyncGenerationResponse[] = [];
      const basePayload = {
        mode: generateForm.mode,
        campaignId:
          generateForm.mode === "CAMPAIGN" ? generateForm.campaignId : undefined,
        postType: generateForm.postType,
        topic: generateBriefingValues.topic.trim() || undefined,
        briefing: generateBriefingValues.briefing.trim() || undefined,
        targetAudience: generateBriefingValues.targetAudience.trim() || undefined,
        callToAction: generateBriefingValues.callToAction.trim() || undefined,
        timezone: generateForm.timezone.trim() || DEFAULT_TIMEZONE,
        generateImage: generateForm.generateImage,
        generateVideo: generateForm.generateVideo,
        durationSeconds:
          generateForm.generateVideo ? normalizedVideoSettings.durationSeconds : undefined,
        qualityProfile: generateForm.qualityProfile,
        videoResolution:
          generateForm.generateVideo ? normalizedVideoSettings.videoResolution : undefined,
        continuityMode: generateForm.generateVideo ? generateForm.continuityMode : undefined,
        totalDurationSeconds:
          isGenerateSequentialMode
            ? normalizeTotalDurationSeconds(generateForm.totalDurationSeconds)
            : undefined,
        imagePrompt: generateForm.generateImage
          ? generateBriefingValues.imagePrompt.trim() || undefined
          : undefined,
        videoPrompt: generateForm.generateVideo
          ? buildVideoPromptWithLanguage(
              generateBriefingValues.videoPrompt,
              generateForm.videoLanguage,
            )
          : undefined,
        visualStyle: generateBriefingValues.visualStyle.trim() || undefined,
        negativePrompt: generateBriefingValues.negativePrompt.trim() || undefined,
        referenceImageUrls:
          normalizedReferenceImageUrls.length > 0
            ? normalizedReferenceImageUrls
            : undefined,
        storyOutline: isGenerateSequentialMode
          ? generateBriefingValues.storyOutline.trim()
          : undefined,
        storyBeats:
          isGenerateSequentialMode && normalizedStoryBeats.length > 0
            ? normalizedStoryBeats
            : undefined,
      };

      try {
        for (let index = 0; index < normalizedSequenceCount; index += 1) {
          setBatchGenerationProgress({
            current: index + 1,
            total: normalizedSequenceCount,
          });

          const queuedJob = await establishmentApi.generateAiPostAsync({
            ...basePayload,
            prompt: buildSequencePrompt(
              generateBriefingValues.prompt,
              generateForm.postType,
              index,
              normalizedSequenceCount,
              normalizedSequenceSteps[index],
            ),
          });

          if (!queuedJob?.aiPostId) {
            throw new Error("A fila retornou uma resposta vazia.");
          }

          queuedJobs.push(queuedJob);
        }
      } catch (error) {
        if (queuedJobs.length > 0) {
          const partialError = new Error(
            `Enviamos ${queuedJobs.length} de ${normalizedSequenceCount} pecas para a fila antes da interrupcao. ${getErrorMessage(error, "Nao foi possivel concluir o envio da sequencia.")}`,
          ) as Error & { partialQueuedJobs?: AiPostAsyncGenerationResponse[] };
          partialError.partialQueuedJobs = queuedJobs;
          throw partialError;
        }

        throw error;
      }

      return {
        queuedJobs,
        requestedCount: normalizedSequenceCount,
      };
    },
    onSuccess: (result) => {
      const queuedJobs = Array.isArray(result?.queuedJobs) ? result.queuedJobs : [];
      const latestQueuedJob = queuedJobs[queuedJobs.length - 1] || null;

      trackAsyncGenerationJobs(queuedJobs);

      setFeedback({
        type: "success",
        message:
          queuedJobs.length > 1
            ? `${queuedJobs.length} publicacoes foram enviadas para fila. Voce pode continuar mexendo em outras areas enquanto a biblioteca atualiza automaticamente.`
            : "Publicacao enviada para fila com sucesso. Voce pode continuar mexendo em outras areas enquanto a biblioteca atualiza automaticamente.",
      });
      addDashboardRuntimeNotification({
        type: "info",
        title: queuedJobs.length > 1 ? "Publicacoes na fila" : "Publicacao na fila",
        message:
          queuedJobs.length > 1
            ? `${queuedJobs.length} publicacoes entraram na fila. Voce pode continuar usando o painel enquanto elas sao geradas.`
            : "Sua publicacao entrou na fila. Voce pode continuar usando o painel enquanto ela e gerada.",
        href: AI_POSTS_LIBRARY_HREF,
      });
      showToast({
        type: "info",
        title: queuedJobs.length > 1 ? "Publicacoes na fila" : "Publicacao na fila",
        message:
          queuedJobs.length > 1
            ? `${queuedJobs.length} publicacoes foram para a fila. Voce pode continuar usando o sistema normalmente.`
            : "Sua publicacao foi para a fila. Voce pode continuar usando o sistema normalmente.",
      });
      setStatusFilter("");
      setLibraryPage(1);
      queryClient.invalidateQueries({ queryKey: ["ai-posts"] });

      queuedJobs.forEach((job) => {
        if (job?.aiPostId) {
          queryClient.invalidateQueries({ queryKey: ["ai-post", job.aiPostId] });
        }
      });

      if (latestQueuedJob?.aiPostId) {
        setSelectedPostId(latestQueuedJob.aiPostId);
        navigateToSection("library");
        if (isMobileViewport) {
          setIsPostDetailModalOpen(true);
        }
        queryClient.invalidateQueries({ queryKey: ["ai-post", latestQueuedJob.aiPostId] });
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
        visualStyle: "",
        negativePrompt: "",
        storyOutline: "",
        storyBeats: "",
        sequenceCount: 1,
        sequenceSteps: "",
      }));
      resetGenerateBriefingChat();
      setReferenceUrlInput("");
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(
        error,
        "Nao foi possivel enviar a publicacao para fila.",
      );
      const partialQueuedJobs =
        typeof error === "object" &&
        error !== null &&
        "partialQueuedJobs" in error &&
        Array.isArray(
          (error as { partialQueuedJobs?: AiPostAsyncGenerationResponse[] })
            .partialQueuedJobs,
        )
          ? (error as { partialQueuedJobs?: AiPostAsyncGenerationResponse[] })
              .partialQueuedJobs || []
          : [];

      if (partialQueuedJobs.length > 0) {
        trackAsyncGenerationJobs(partialQueuedJobs);
        setStatusFilter("");
        setLibraryPage(1);
        addDashboardRuntimeNotification({
          type: "info",
          title:
            partialQueuedJobs.length > 1 ? "Fila iniciada parcialmente" : "Fila iniciada",
          message:
            partialQueuedJobs.length > 1
              ? `${partialQueuedJobs.length} publicacoes entraram na fila. O restante teve erro, mas voce pode continuar usando o painel.`
              : "Sua publicacao entrou na fila, mas houve uma falha no restante do processo. Voce pode continuar usando o painel.",
          href: AI_POSTS_LIBRARY_HREF,
        });
        showToast({
          type: "info",
          title:
            partialQueuedJobs.length > 1 ? "Fila iniciada parcialmente" : "Fila iniciada",
          message:
            partialQueuedJobs.length > 1
              ? `${partialQueuedJobs.length} publicacoes entraram na fila. Voce pode continuar usando o sistema enquanto concluimos o restante.`
              : "Sua publicacao entrou na fila. Voce pode continuar usando o sistema enquanto concluimos o restante.",
        });
        queryClient.invalidateQueries({ queryKey: ["ai-posts"] });
        partialQueuedJobs.forEach((job) => {
          if (job?.aiPostId) {
            queryClient.invalidateQueries({ queryKey: ["ai-post", job.aiPostId] });
          }
        });

        const latestPartialJob = partialQueuedJobs[partialQueuedJobs.length - 1];

        if (latestPartialJob?.aiPostId) {
          setSelectedPostId(latestPartialJob.aiPostId);
          navigateToSection("library");
          if (isMobileViewport) {
            setIsPostDetailModalOpen(true);
          }
        }
      }

      if (isReferenceDownloadForbiddenMessage(errorMessage)) {
        const nextProtectedEntries = Object.fromEntries(
          normalizeReferenceImageUrls(generateForm.referenceImageUrls)
            .filter((url) => Boolean(generateReferencePreviewUrlByReference[url]))
            .map((url) => [url, "protected"]),
        ) as Record<string, ReferenceAccessState>;

        if (Object.keys(nextProtectedEntries).length > 0) {
          setGenerateReferenceAccessStateByReference((current) => ({
            ...current,
            ...nextProtectedEntries,
          }));
        }
      }

      setFeedback({
        type: "error",
        message: errorMessage,
      });
    },
    onSettled: () => {
      setBatchGenerationProgress(null);
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

  useEffect(() => {
    setGenerateBriefingChatMessages((current) =>
      rebuildAiBriefingChatMessages(
        current.filter((message) => message.role === "user"),
        generateBriefingContext,
      ),
    );
  }, [generateBriefingContext]);

  useEffect(() => {
    if (
      generateBriefingFocusedField &&
      !generateBriefingTimelineSteps.some((step) => step.field === generateBriefingFocusedField)
    ) {
      setGenerateBriefingFocusedField(null);
    }
  }, [generateBriefingFocusedField, generateBriefingTimelineSteps]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const trackedJobIds = new Set(
      trackedAsyncGenerationJobs.map((job) => job.aiPostId).filter(Boolean),
    );

    trackedAsyncGenerationJobs.forEach((job) => {
      const normalizedStatus = normalizeAiPostStatus(job.status);

      if (
        !job.notificationChannelId ||
        isAiPostTerminalStatus(normalizedStatus) ||
        aiPostSocketByJobIdRef.current[job.aiPostId]
      ) {
        return;
      }

      const socketUrl = buildAiPostSocketUrl(job.notificationChannelId);

      if (!socketUrl) {
        return;
      }

      try {
        const socket = new WebSocket(socketUrl);
        aiPostSocketByJobIdRef.current[job.aiPostId] = socket;

        socket.onmessage = (event) => {
          const socketEvent = parseAiPostSocketEvent(String(event.data || ""));

          if (!socketEvent) {
            return;
          }

          void handleAiPostSocketEvent(socketEvent);
        };

        socket.onerror = () => {
          if (aiPostSocketByJobIdRef.current[job.aiPostId] === socket) {
            delete aiPostSocketByJobIdRef.current[job.aiPostId];
          }

          try {
            socket.close();
          } catch {}
        };

        socket.onclose = () => {
          if (aiPostSocketByJobIdRef.current[job.aiPostId] === socket) {
            delete aiPostSocketByJobIdRef.current[job.aiPostId];
          }
        };
      } catch {
        delete aiPostSocketByJobIdRef.current[job.aiPostId];
      }
    });

    Object.entries(aiPostSocketByJobIdRef.current).forEach(([aiPostId, socket]) => {
      if (trackedJobIds.has(aiPostId)) {
        return;
      }

      try {
        socket.close();
      } catch {}

      delete aiPostSocketByJobIdRef.current[aiPostId];
    });
  }, [handleAiPostSocketEvent, trackedAsyncGenerationJobs]);

  useEffect(() => {
    return () => {
      Object.values(aiPostSocketByJobIdRef.current).forEach((socket) => {
        try {
          socket.close();
        } catch {}
      });

      aiPostSocketByJobIdRef.current = {};
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(toastTimeoutByIdRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });

      toastTimeoutByIdRef.current = {};
    };
  }, []);

  useEffect(() => {
    const polledTrackedAsyncGenerationJobs = trackedAsyncGenerationJobs.filter(
      (job) => !job.notificationChannelId,
    );

    if (polledTrackedAsyncGenerationJobs.length === 0) {
      return;
    }

    let isCancelled = false;

    const pollTrackedAsyncGenerationJobs = async () => {
      const jobsSnapshot = [...polledTrackedAsyncGenerationJobs];
      const jobsSnapshotIds = new Set(jobsSnapshot.map((job) => job.aiPostId));
      const results = await Promise.allSettled(
        jobsSnapshot.map((job) => establishmentApi.getAiPost(job.aiPostId)),
      );

      if (isCancelled) {
        return;
      }

      const nextTrackedJobsById = new Map<string, TrackedAsyncGenerationJob>();
      const readyPosts: AiPostRecord[] = [];
      const failedCountByStatus: Record<string, number> = {};
      let shouldRefreshLibrary = false;

      results.forEach((result, index) => {
        const job = jobsSnapshot[index];

        if (!job) {
          return;
        }

        if (result.status === "rejected") {
          nextTrackedJobsById.set(job.aiPostId, job);
          return;
        }

        const post = result.value;

        if (!post?.id) {
          nextTrackedJobsById.set(job.aiPostId, job);
          return;
        }

        const normalizedStatus = normalizeAiPostStatus(post.status || job.status);

        queryClient.setQueryData(["ai-post", post.id], post);
        shouldRefreshLibrary = true;

        if (isAiPostTerminalStatus(normalizedStatus)) {
          const shouldNotify = shouldNotifyAsyncTerminalStatus(post.id, normalizedStatus);

          if (normalizedStatus === "READY") {
            if (shouldNotify) {
              readyPosts.push(post);
            }
            return;
          }

          if (shouldNotify) {
            failedCountByStatus[normalizedStatus] =
              (failedCountByStatus[normalizedStatus] || 0) + 1;
          }
          return;
        }

        nextTrackedJobsById.set(job.aiPostId, {
          ...job,
          status: normalizedStatus,
        });
      });

      setTrackedAsyncGenerationJobs((current) =>
        current.flatMap((job) => {
          if (job.notificationChannelId || !jobsSnapshotIds.has(job.aiPostId)) {
            return [job];
          }

          const nextJob = nextTrackedJobsById.get(job.aiPostId);
          return nextJob ? [nextJob] : [];
        }),
      );

      if (shouldRefreshLibrary) {
        queryClient.invalidateQueries({ queryKey: ["ai-posts"] });
      }

      const failedCount = Object.values(failedCountByStatus).reduce(
        (total, count) => total + count,
        0,
      );

      if (readyPosts.length === 0 && failedCount === 0) {
        return;
      }

      const latestReadyPost = readyPosts[readyPosts.length - 1] || null;

      if (latestReadyPost?.id) {
        setSelectedPostId(latestReadyPost.id);
        queryClient.invalidateQueries({ queryKey: ["ai-post", latestReadyPost.id] });

        if (activeSection !== "library") {
          navigateToSection("library");
        }

        if (isMobileViewport) {
          setIsPostDetailModalOpen(true);
        }
      }

      setFeedback({
        type:
          readyPosts.length > 0 && failedCount > 0
            ? "info"
            : readyPosts.length > 0
              ? "success"
              : "error",
        message: buildAsyncGenerationFeedbackMessage({
          readyCount: readyPosts.length,
          failedCount,
        }),
      });

      showToast({
        type:
          readyPosts.length > 0 && failedCount > 0
            ? "info"
            : readyPosts.length > 0
              ? "success"
              : "error",
        title:
          readyPosts.length > 0
            ? readyPosts.length > 1
              ? "Publicacoes prontas"
              : "Publicacao pronta"
            : failedCount > 1
              ? "Falhas na geracao"
              : "Falha na geracao",
        message:
          readyPosts.length > 0
            ? readyPosts.length > 1
              ? `${readyPosts.length} rascunhos ja estao prontos para revisao.`
              : "Seu rascunho ja esta pronto para revisao."
            : buildAsyncGenerationFeedbackMessage({
                readyCount: readyPosts.length,
                failedCount,
              }),
      });
      addDashboardRuntimeNotification({
        type:
          readyPosts.length > 0 && failedCount > 0
            ? "info"
            : readyPosts.length > 0
              ? "success"
              : "error",
        title:
          readyPosts.length > 0
            ? readyPosts.length > 1
              ? "Publicacoes prontas"
              : "Publicacao pronta"
            : failedCount > 1
              ? "Falhas na geracao"
              : "Falha na geracao",
        message:
          readyPosts.length > 0
            ? readyPosts.length > 1
              ? `${readyPosts.length} rascunhos ja estao prontos para revisao.`
              : "Seu rascunho ja esta pronto para revisao."
            : buildAsyncGenerationFeedbackMessage({
                readyCount: readyPosts.length,
                failedCount,
              }),
        href: AI_POSTS_LIBRARY_HREF,
      });
    };

    pollTrackedAsyncGenerationJobs();
    const intervalId = window.setInterval(
      pollTrackedAsyncGenerationJobs,
      AI_POST_ASYNC_POLL_INTERVAL_MS,
    );

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    activeSection,
    isMobileViewport,
    navigateToSection,
    queryClient,
    shouldNotifyAsyncTerminalStatus,
    showToast,
    trackedAsyncGenerationJobs,
  ]);

  const updateMutation = useMutation({
    mutationFn: (postId: string) => {
      const normalizedReferenceImageUrls = normalizeReferenceImageUrls(
        currentDraft.referenceImageUrls,
      );
      const normalizedVideoSettings = normalizeVideoSettings(
        currentDraft.durationSeconds,
        currentDraft.videoResolution,
        currentDraft.continuityMode,
      );
      const normalizedStoryBeats = parseStoryBeatsInput(currentDraft.storyBeats);

      if (currentDraft.referenceImageUrls.some((url) => !isValidReferenceImageUrl(url))) {
        throw new Error(
          "Revise as imagens de referencia. Use apenas URLs publicas validas com http ou https.",
        );
      }

      const videoReferenceValidationMessage = getVideoReferenceValidationMessage({
        generateVideo: currentDraft.generateVideo,
        durationSeconds: normalizedVideoSettings.durationSeconds,
        referenceImageUrls: normalizedReferenceImageUrls,
      });

      if (videoReferenceValidationMessage) {
        throw new Error(videoReferenceValidationMessage);
      }

      return establishmentApi.updateAiPost(postId, {
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
          currentDraft.generateVideo ? normalizedVideoSettings.durationSeconds : undefined,
        qualityProfile: currentDraft.qualityProfile,
        videoResolution:
          currentDraft.generateVideo ? normalizedVideoSettings.videoResolution : undefined,
        continuityMode: currentDraft.generateVideo ? currentDraft.continuityMode : undefined,
        totalDurationSeconds:
          isSequentialVideoMode(currentDraft.continuityMode, currentDraft.generateVideo)
            ? normalizeTotalDurationSeconds(currentDraft.totalDurationSeconds)
            : undefined,
        imagePrompt: currentDraft.imagePrompt.trim() || undefined,
        videoPrompt: currentDraft.generateVideo
          ? buildVideoPromptWithLanguage(
              currentDraft.videoPrompt,
              currentDraft.videoLanguage,
            )
          : undefined,
        visualStyle: currentDraft.visualStyle.trim() || undefined,
        negativePrompt: currentDraft.negativePrompt.trim() || undefined,
        referenceImageUrls:
          normalizedReferenceImageUrls.length > 0
            ? normalizedReferenceImageUrls
            : undefined,
        storyOutline:
          isSequentialVideoMode(currentDraft.continuityMode, currentDraft.generateVideo)
            ? currentDraft.storyOutline.trim() || undefined
            : undefined,
        storyBeats:
          isSequentialVideoMode(currentDraft.continuityMode, currentDraft.generateVideo) &&
          normalizedStoryBeats.length > 0
            ? normalizedStoryBeats
            : undefined,
        caption: currentDraft.caption.trim(),
        hashtags: parsedHashtags,
        timezone: currentDraft.timezone.trim() || DEFAULT_TIMEZONE,
      });
    },
    onSuccess: (post) => {
      setFeedback({
        type: "success",
        message: "Rascunho atualizado com sucesso.",
      });
      setDraftState(createEmptyDraftState());
      setDraftReferenceUrlInput("");
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

    if (isSelectedPostProcessing) {
      setFeedback({
        type: "info",
        message:
          "Este rascunho ainda esta em fila ou processamento. Aguarde a geracao terminar antes de salvar a revisao.",
      });
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

    if (isSelectedPostProcessing) {
      setFeedback({
        type: "info",
        message:
          "Este rascunho ainda esta em fila ou processamento. Aguarde a geracao concluir antes de publicar.",
      });
      return;
    }

    if (isCurrentDraftSequential) {
      setFeedback({
        type: "info",
        message:
          "Videos longos em modo sequencial retornam em segmentos e precisam de consolidacao antes da publicacao automatica.",
      });
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

    if (isSelectedPostProcessing) {
      setFeedback({
        type: "info",
        message:
          "Este rascunho ainda esta em fila ou processamento. Aguarde a geracao concluir antes de agendar.",
      });
      return;
    }

    if (isCurrentDraftSequential) {
      setFeedback({
        type: "info",
        message:
          "Videos longos em modo sequencial precisam ser consolidados antes de entrar no fluxo de agendamento.",
      });
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

  const selectedPostReviewContent = selectedPost ? (
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
            Revisar publicacao
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
              A hashtag obrigatoria {requiredCampaignHashtag} precisa
              permanecer na legenda final ou na lista de hashtags.
            </div>
          ) : null}
        </div>
      ) : null}

      {isCurrentDraftSequential ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">
            Video longo com continuidade ativo
          </div>
          <div className="mt-1">
            Este rascunho retorna segmentos em sequencia e ainda precisa de consolidacao antes do fluxo de publicar ou agendar.
          </div>
        </div>
      ) : null}

      {isSelectedPostProcessing ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <div className="font-semibold">Geracao em andamento</div>
          <div className="mt-1">
            Este rascunho ainda esta {getStatusMeta(selectedPost.status).label.toLowerCase()}.
            Aguarde a conclusao para revisar a midia final, publicar ou agendar.
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 font-bold text-slate-900">
              Configuracao do rascunho
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
                  Tipo da publicacao
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
                  <label
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-4 ${
                      currentDraft.postType === "REELS"
                        ? "cursor-not-allowed border-slate-200 bg-slate-100"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`draft-media-type-${selectedPost?.id || "default"}`}
                      checked={currentDraft.generateImage}
                      disabled={
                        currentDraft.postType === "REELS" || !canEditAiPosts
                      }
                      onChange={() =>
                        updateDraft({
                          generateImage: true,
                          generateVideo: false,
                        })
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span
                      className={`text-sm ${
                        currentDraft.postType === "REELS"
                          ? "text-slate-500"
                          : "text-slate-700"
                      }`}
                    >
                      <span className="block font-bold text-slate-900">
                        Gerar imagem
                      </span>
                      Use quando quiser uma arte fixa para feed ou story, com
                      leitura rapida e composicao estatica.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <input
                      type="radio"
                      name={`draft-media-type-${selectedPost?.id || "default"}`}
                      checked={currentDraft.generateVideo}
                      disabled={!canEditAiPosts}
                      onChange={() =>
                        updateDraft({
                          generateImage: false,
                          generateVideo: true,
                        })
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">
                      <span className="block font-bold text-slate-900">
                        Gerar video
                      </span>
                      Ative para feed, story ou reels quando quiser motion,
                      narrativa em movimento e mais impacto visual.
                    </span>
                  </label>
                </div>

                {currentDraft.postType === "STORY" ? (
                  <StoryPremisesBalloons />
                ) : null}
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
                  Topico
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
                  Chamada para acao
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
                  Publico alvo
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
                    Duracao do video
                  </label>
                  <select
                    value={String(currentDraft.durationSeconds)}
                    onChange={(event) =>
                      updateDraft(
                        buildVideoSettingsFromDuration(
                          Number(event.target.value) as AiVideoDurationSeconds,
                          currentDraft.videoResolution,
                          currentDraft.continuityMode,
                        ),
                      )
                    }
                    disabled={!canEditAiPosts || isCurrentDraftVideoReferenceMode}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    {VIDEO_DURATION_OPTIONS.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration} segundos
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {isCurrentDraftVideoReferenceMode
                      ? "Video com imagem de referencia fica travado em 8 segundos no modelo atual."
                      : "O backend aceita apenas 4, 6 ou 8 segundos."}
                  </p>
                </div>
              ) : null}

              {currentDraft.generateVideo ? (
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Idioma do video
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
                  <AssistantTextareaField
                    title="Assistente da imagem"
                    assistantMessage="Ajuste aqui a descricao visual da imagem final. Se quiser, use um atalho e depois refine com seus detalhes."
                    suggestions={getImagePromptSuggestions(currentDraft.postType)}
                    onSuggestionSelect={(value) => updateDraft({ imagePrompt: value })}
                    value={currentDraft.imagePrompt}
                    onChange={(value) => updateDraft({ imagePrompt: value })}
                    disabled={!canEditAiPosts}
                    placeholder={IMAGE_PROMPT_PLACEHOLDERS[currentDraft.postType]}
                    helper={getImagePromptHelper(currentDraft.postType)}
                  />
                </div>
              ) : null}

              {currentDraft.generateVideo ? (
                <div className="md:col-span-2">
                  <AssistantTextareaField
                    title="Assistente do video"
                    assistantMessage="Refine aqui a direcao do video em movimento. Camera, ritmo, gesto, ambiente e clima ajudam bastante no resultado."
                    suggestions={getVideoPromptSuggestions(currentDraft.postType)}
                    onSuggestionSelect={(value) => updateDraft({ videoPrompt: value })}
                    value={currentDraft.videoPrompt}
                    onChange={(value) => updateDraft({ videoPrompt: value })}
                    disabled={!canEditAiPosts}
                    placeholder={VIDEO_PROMPT_PLACEHOLDERS[currentDraft.postType]}
                    helper={getVideoPromptHelper(currentDraft.postType)}
                  />
                </div>
              ) : null}

              <DirectionVisualSection
                postType={currentDraft.postType}
                generateVideo={currentDraft.generateVideo}
                qualityProfile={currentDraft.qualityProfile}
                videoResolution={currentDraft.videoResolution}
                continuityMode={currentDraft.continuityMode}
                totalDurationSeconds={currentDraft.totalDurationSeconds}
                visualStyle={currentDraft.visualStyle}
                negativePrompt={currentDraft.negativePrompt}
                referenceImageUrls={currentDraft.referenceImageUrls}
                referencePreviewUrlByReference={draftReferencePreviewUrlByReference}
                referenceAccessStateByReference={draftReferenceAccessStateByReference}
                referenceUrlInput={draftReferenceUrlInput}
                onReferenceUrlInputChange={setDraftReferenceUrlInput}
                onAddReferenceUrl={() => handleAddDraftReferenceUrl()}
                onImportReferenceFiles={handleImportDraftReferenceFiles}
                onQuickAddReference={handleAddDraftReferenceUrl}
                onMoveReference={handleMoveDraftReference}
                onRemoveReference={(index) =>
                  updateDraft({
                    referenceImageUrls: currentDraft.referenceImageUrls.filter(
                      (_, currentIndex) => currentIndex !== index,
                    ),
                  })
                }
                onApplyPreset={(preset) =>
                  updateDraft({
                    visualStyle: preset.visualStyle,
                    negativePrompt: preset.negativePrompt,
                  })
                }
                onVisualStyleChange={(value) => updateDraft({ visualStyle: value })}
                onNegativePromptChange={(value) =>
                  updateDraft({ negativePrompt: value })
                }
                onQualityProfileChange={(value) =>
                  updateDraft({ qualityProfile: value })
                }
                onVideoResolutionChange={(value) =>
                  updateDraft(
                    buildVideoSettingsFromResolution(
                      value,
                      currentDraft.durationSeconds,
                      currentDraft.continuityMode,
                    ),
                  )
                }
                onContinuityModeChange={(value) =>
                  updateDraft({
                    continuityMode: value,
                    durationSeconds:
                      value === "SEQUENTIAL" ? 8 : currentDraft.durationSeconds,
                    videoResolution: value === "SEQUENTIAL" ? "720p" : currentDraft.videoResolution,
                    totalDurationSeconds:
                      value === "SEQUENTIAL"
                        ? normalizeTotalDurationSeconds(currentDraft.totalDurationSeconds)
                        : currentDraft.totalDurationSeconds,
                  })
                }
                onTotalDurationChange={(value) =>
                  updateDraft({
                    totalDurationSeconds: normalizeTotalDurationSeconds(value),
                  })
                }
                onStoryOutlineChange={(value) => updateDraft({ storyOutline: value })}
                onStoryBeatsChange={(value) => updateDraft({ storyBeats: value })}
                storyOutline={currentDraft.storyOutline}
                storyBeats={currentDraft.storyBeats}
                quickReferenceOptions={quickReferenceOptions}
                isImportingReferenceFiles={referenceImageImportMutation.isPending}
                disabled={!canEditAiPosts}
              />
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
          <InstagramPreviewMock
            postType={currentDraft.postType}
            caption={draftPreviewCaption}
            accountLabel={previewAccountLabel}
            mediaUrl={selectedPreviewMediaUrl}
            mediaIsVideo={selectedPreviewMediaIsVideo}
            showVideoIntent={selectedPreviewShowsVideoIntent}
            continuityMode={currentDraft.continuityMode}
            totalDurationSeconds={currentDraft.totalDurationSeconds}
          />

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <ImageIcon className="h-4 w-4 text-slate-500" />
              Midia gerada
            </div>
            <GeneratedMediaSection
              key={`${selectedPost.id}-${selectedPost.media.length}-${currentDraft.totalDurationSeconds}`}
              postType={selectedPost.postType as AiPostType}
              media={selectedPost.media}
              isSequential={isCurrentDraftSequential}
              storyBeats={parsedStoryBeats}
              totalDurationSeconds={currentDraft.totalDurationSeconds}
            />
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
                <span className="text-slate-500">Continuidade</span>
                <span className="font-semibold">
                  {isCurrentDraftSequential ? "Sequencial" : "Video unico"}
                </span>
              </div>
              {isCurrentDraftSequential ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Duracao total</span>
                  <span className="font-semibold">
                    {currentDraft.totalDurationSeconds} segundos
                  </span>
                </div>
              ) : null}
              {isCurrentDraftSequential ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Segmentos</span>
                  <span className="font-semibold">
                    {selectedPost.media.length || 0}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Timezone</span>
                <span className="font-semibold">{selectedPost.timezone}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Criado em</span>
                <span className="font-semibold">
                  {selectedPost.createdAt
                    ? new Date(selectedPost.createdAt).toLocaleString("pt-BR")
                    : "Nao informado"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Agendado para</span>
                <span className="font-semibold">
                  {selectedPost.scheduledAt
                    ? new Date(selectedPost.scheduledAt).toLocaleString("pt-BR")
                    : "Nao agendado"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {draftProtectedReferenceUrls.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          As referencias importadas do PC continuam com preview local apenas. Para usar essas imagens em novas geracoes, troque por URLs publicas.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="text-xs text-slate-500">
          {isCurrentDraftSequential
            ? "Videos longos sequenciais retornam em segmentos e aguardam consolidacao antes da publicacao."
            : "Reels podem exigir video e stories priorizam asset vertical."}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={
              updateMutation.isPending || !canEditAiPosts || isSelectedPostProcessing
            }
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
              !isMetaConnected ||
              isSelectedPostProcessing ||
              isCurrentDraftSequential
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
              !isMetaConnected ||
              isSelectedPostProcessing ||
              isCurrentDraftSequential
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
              A conta do estabelecimento esta conectada e pronta para publicar
              no Instagram, sujeito as permissoes concedidas na Meta.
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
        Gere um novo conteudo com IA ou escolha um item da lista para editar
        legenda, hashtags e publicacao.
      </div>
    </div>
  );

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

      {toasts.length > 0 ? (
        <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border bg-white p-4 shadow-lg ${
                toast.type === "success"
                  ? "border-emerald-200"
                  : toast.type === "error"
                    ? "border-red-200"
                    : "border-blue-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 shrink-0 ${
                    toast.type === "success"
                      ? "text-emerald-600"
                      : toast.type === "error"
                        ? "text-red-600"
                        : "text-blue-600"
                  }`}
                >
                  {toast.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : toast.type === "error" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">{toast.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{toast.message}</div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                  aria-label="Fechar notificacao"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {trackedAsyncGenerationJobs.length > 0 ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {trackedAsyncGenerationJobs.length > 1
            ? `${trackedAsyncGenerationJobs.length} geracoes estao em acompanhamento agora.`
            : "1 geracao esta em acompanhamento agora."}{" "}
          {asyncQueuedCount > 0 ? `${asyncQueuedCount} na fila.` : ""}
          {asyncProcessingCount > 0
            ? ` ${asyncProcessingCount} processando.`
            : ""}
          {asyncPublishingCount > 0
            ? ` ${asyncPublishingCount} publicando.`
            : ""}{" "}
          A biblioteca atualiza automaticamente.
        </div>
      ) : null}

      <div className="space-y-6">
      {activeSection === "generate" ? (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Gerar nova publicação
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
                setGenerateForm((current) =>
                  applyVideoReferenceModelConstraints({
                    ...current,
                    postType: event.target.value as AiPostType,
                    ...getDefaultMediaConfig(event.target.value as AiPostType),
                  }),
                )
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
              <label
                className={`flex items-start gap-3 rounded-2xl border px-4 py-4 ${
                  generateForm.postType === "REELS"
                    ? "cursor-not-allowed border-slate-200 bg-slate-100"
                    : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="generate-media-type"
                  checked={generateForm.generateImage}
                  disabled={generateForm.postType === "REELS"}
                  onChange={() =>
                    setGenerateForm((current) => ({
                      ...current,
                      generateImage: true,
                      generateVideo: false,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span
                  className={`text-sm ${
                    generateForm.postType === "REELS" ? "text-slate-500" : "text-slate-700"
                  }`}
                >
                  <span className="block font-bold text-slate-900">Gerar imagem</span>
                  Use quando quiser uma arte fixa para feed ou story, com leitura
                  rapida e composicao estatica.
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <input
                  type="radio"
                  name="generate-media-type"
                  checked={generateForm.generateVideo}
                  onChange={() =>
                    setGenerateForm((current) =>
                      applyVideoReferenceModelConstraints({
                        ...current,
                        generateImage: false,
                        generateVideo: true,
                      }),
                    )
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">
                  <span className="block font-bold text-slate-900">Gerar vídeo</span>
                  Ative para feed, story ou reels quando quiser motion, narrativa
                  em movimento e mais impacto visual.
                </span>
              </label>
            </div>

            {generateForm.postType === "STORY" ? <StoryPremisesBalloons /> : null}
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

          <div className="md:col-span-2 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-primary-600" />
                  Briefing guiado
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Preencha o briefing em etapas. A linha do tempo organiza objetivo,
                  midia, direcao visual e detalhes extras no mesmo fluxo.
                </p>
              </div>
              <button
                type="button"
                onClick={resetGenerateBriefingChat}
                disabled={!canEditAiPosts || generateMutation.isPending}
                className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Limpar briefing
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {generateBriefingCompletedRequiredSteps}/{generateBriefingRequiredStepCount} etapas principais concluidas
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {nextGenerateBriefingField
                  ? `Proxima etapa: ${getAiBriefingFieldLabel(nextGenerateBriefingField)}`
                  : "Briefing base concluido"}
              </span>
            </div>

            <div className="mt-5">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Linha do tempo
                </div>
                <div className="mt-4 overflow-x-auto pb-2">
                  <div className="flex min-w-max items-stretch gap-0">
                    {generateBriefingTimelineSteps.map((step, index) => {
                      const currentValue = getLatestAiBriefingUserContent(
                        generateBriefingChatMessages,
                        step.field,
                      );
                      const isCompleted = Boolean(currentValue);
                      const isActive = activeGenerateBriefingField === step.field;

                      return (
                        <div key={step.field} className="flex items-start">
                          <div className="w-[248px] flex-none">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                                  isActive
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : isCompleted
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                      : "border-slate-300 bg-white text-slate-500"
                                }`}
                              >
                                {isCompleted && !isActive ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  index + 1
                                )}
                              </div>
                              <div
                                className={`h-px flex-1 ${
                                  index === generateBriefingTimelineSteps.length - 1
                                    ? "bg-transparent"
                                    : isCompleted
                                      ? "bg-emerald-200"
                                      : "bg-slate-200"
                                }`}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => selectGenerateBriefingTimelineStep(step.field)}
                              disabled={!canEditAiPosts || generateMutation.isPending}
                              className={`mt-3 flex h-[196px] w-[228px] flex-col rounded-2xl border p-4 text-left transition-all ${
                                isActive
                                  ? "border-slate-900 bg-white shadow-sm"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              <div className="flex min-h-[52px] items-start justify-between gap-2">
                                <div className="text-sm font-bold text-slate-900">
                                  {step.title}
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    isActive
                                      ? "bg-slate-900 text-white"
                                      : isCompleted
                                        ? "bg-emerald-50 text-emerald-700"
                                        : step.optional
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {isActive
                                    ? "Atual"
                                    : isCompleted
                                      ? "Ok"
                                      : step.optional
                                        ? "Opcional"
                                        : "Pendente"}
                                </span>
                              </div>
                              <div className="mt-2 text-xs text-slate-500">{step.helper}</div>
                              <div className="mt-3 h-[60px] overflow-hidden whitespace-pre-line text-sm text-slate-800">
                                {currentValue || "Selecionar etapa"}
                              </div>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <AiBriefingTimelineEditor
                  key={`${activeGenerateBriefingStep?.field || "done"}:${generateBriefingCurrentFieldValue}`}
                  step={activeGenerateBriefingStep}
                  context={generateBriefingContext}
                  currentValue={generateBriefingCurrentFieldValue}
                  suggestions={generateBriefingActionSuggestions}
                  disabled={!canEditAiPosts || generateMutation.isPending}
                  isCurrentStep={
                    Boolean(activeGenerateBriefingStep) &&
                    nextGenerateBriefingField === activeGenerateBriefingStep?.field
                  }
                  onClose={() => setGenerateBriefingFocusedField(null)}
                  onSubmit={submitGenerateBriefingChatMessage}
                  onClear={clearGenerateBriefingTimelineStep}
                />
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Cada etapa guarda uma resposta final. Voce pode preencher em ordem,
              revisar depois e manter a geracao organizada sem depender de conversa.
            </p>
          </div>

          {generateForm.generateVideo ? (
            <div className="md:col-span-2">
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  Duração do vídeo
                </label>
                <select
                  value={String(generateForm.durationSeconds)}
                  onChange={(event) =>
                    setGenerateForm((current) =>
                      applyVideoReferenceModelConstraints({
                        ...current,
                        ...buildVideoSettingsFromDuration(
                          Number(event.target.value) as AiVideoDurationSeconds,
                          current.videoResolution,
                          current.continuityMode,
                        ),
                      }),
                    )
                  }
                  disabled={isGenerateVideoReferenceMode}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                >
                  {VIDEO_DURATION_OPTIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration} segundos
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {isGenerateVideoReferenceMode
                    ? "Video com imagem de referencia fica travado em 8 segundos no modelo atual."
                    : "O backend aceita apenas 4, 6 ou 8 segundos."}
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
            </div>
          ) : null}

          <DirectionVisualSection
            postType={generateForm.postType}
            generateVideo={generateForm.generateVideo}
            qualityProfile={generateForm.qualityProfile}
            videoResolution={generateForm.videoResolution}
            continuityMode={generateForm.continuityMode}
            totalDurationSeconds={generateForm.totalDurationSeconds}
            visualStyle={generateBriefingValues.visualStyle}
            negativePrompt={generateBriefingValues.negativePrompt}
            referenceImageUrls={generateForm.referenceImageUrls}
            referencePreviewUrlByReference={generateReferencePreviewUrlByReference}
            referenceAccessStateByReference={generateReferenceAccessStateByReference}
            referenceUrlInput={referenceUrlInput}
            onReferenceUrlInputChange={setReferenceUrlInput}
            onAddReferenceUrl={() => handleAddGenerateReferenceUrl()}
            onImportReferenceFiles={handleImportGenerateReferenceFiles}
            onQuickAddReference={handleAddGenerateReferenceUrl}
            onMoveReference={handleMoveGenerateReference}
            onRemoveReference={(index) =>
              setGenerateForm((current) => ({
                ...current,
                referenceImageUrls: current.referenceImageUrls.filter(
                  (_, currentIndex) => currentIndex !== index,
                ),
              }))
            }
            onApplyPreset={(preset) =>
              setGenerateForm((current) => ({
                ...current,
                visualStyle: preset.visualStyle,
                negativePrompt: preset.negativePrompt,
              }))
            }
            onVisualStyleChange={(value) =>
              setGenerateForm((current) => ({
                ...current,
                visualStyle: value,
              }))
            }
            onNegativePromptChange={(value) =>
              setGenerateForm((current) => ({
                ...current,
                negativePrompt: value,
              }))
            }
            onQualityProfileChange={(value) =>
              setGenerateForm((current) => ({
                ...current,
                qualityProfile: value,
              }))
            }
            onVideoResolutionChange={(value) =>
              setGenerateForm((current) => ({
                ...current,
                ...buildVideoSettingsFromResolution(
                  value,
                  current.durationSeconds,
                  current.continuityMode,
                ),
              }))
            }
            onContinuityModeChange={(value) =>
              setGenerateForm((current) => ({
                ...current,
                continuityMode: value,
                durationSeconds: value === "SEQUENTIAL" ? 8 : current.durationSeconds,
                videoResolution: value === "SEQUENTIAL" ? "720p" : current.videoResolution,
                totalDurationSeconds:
                  value === "SEQUENTIAL"
                    ? normalizeTotalDurationSeconds(current.totalDurationSeconds)
                    : current.totalDurationSeconds,
              }))
            }
            onTotalDurationChange={(value) =>
              setGenerateForm((current) => ({
                ...current,
                totalDurationSeconds: normalizeTotalDurationSeconds(value),
              }))
            }
            onStoryOutlineChange={(value) =>
              setGenerateForm((current) => ({
                ...current,
                storyOutline: value,
              }))
            }
            onStoryBeatsChange={(value) =>
              setGenerateForm((current) => ({
                ...current,
                storyBeats: value,
              }))
            }
            storyOutline={generateBriefingValues.storyOutline}
            storyBeats={generateBriefingValues.storyBeats}
            quickReferenceOptions={quickReferenceOptions}
            isImportingReferenceFiles={referenceImageImportMutation.isPending}
            hideTextControls
            disabled={!canEditAiPosts}
          />

          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4">
              <div className="text-sm font-bold text-slate-900">Sequencia de publicacoes</div>
              <div className="mt-1 text-xs text-slate-500">
                Gere uma peca unica ou uma sequencia inteira de feed, story ou reels no mesmo fluxo.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  Quantidade de pecas
                </label>
                <select
                  value={String(generateForm.sequenceCount)}
                  onChange={(event) =>
                    setGenerateForm((current) => ({
                      ...current,
                      sequenceCount: normalizeSequenceCount(Number(event.target.value)),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                >
                  {SEQUENCE_COUNT_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count === 1 ? "1 peca" : `${count} pecas`}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  {getSequenceCollectionLabel(
                    generateForm.postType,
                    normalizeSequenceCount(generateForm.sequenceCount),
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">Resultado na biblioteca</div>
                <div className="mt-2">
                  Cada item da sequencia vira um rascunho separado. Isso ja resolve stories em passos e series de reels; carrossel unico no feed ainda depende de suporte especifico do backend.
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  Passos por item
                </label>
                <textarea
                  rows={Math.min(Math.max(generateForm.sequenceCount, 3), 6)}
                  value={generateForm.sequenceSteps}
                  onChange={(event) =>
                    setGenerateForm((current) => ({
                      ...current,
                      sequenceSteps: event.target.value,
                    }))
                  }
                  placeholder={
                    generateForm.postType === "FEED"
                      ? "card 1: chamar atencao para o problema\ncard 2: mostrar a solucao\ncard 3: fechar com CTA"
                      : generateForm.postType === "STORY"
                        ? "story 1: contexto rapido\nstory 2: prova ou beneficio\nstory 3: CTA para responder"
                        : "reel 1: gancho forte\nreel 2: bastidores\nreel 3: oferta final"
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Use uma linha por item. Se preencher menos linhas que a quantidade, o restante sai como variacao complementar.
                </p>
              </div>
            </div>
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
            <InstagramPreviewMock
              postType={generateForm.postType}
              caption={generatePreviewCaption}
              accountLabel={previewAccountLabel}
              mediaUrl={generatePreviewMediaUrl}
              mediaIsVideo={false}
              showVideoIntent={generateForm.generateVideo}
              sequenceCount={generateForm.sequenceCount}
              sequenceSteps={parsedGenerateSequenceSteps}
              continuityMode={generateForm.continuityMode}
              totalDurationSeconds={generateForm.totalDurationSeconds}
            />
          </div>

        </div>

        {isGenerateBlockedByProtectedReferences ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            A geracao foi bloqueada porque pelo menos uma referencia importada do PC ficou com preview local apenas. Remova essa imagem ou troque por uma URL publica antes de continuar.
          </div>
        ) : null}

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
              !generateBriefingValues.hasUserMessages ||
              hasReachedAiPostsGenerationLimit ||
              (generateForm.generateVideo && hasReachedAiPostsVideoGenerationLimit) ||
              isGenerateBlockedByProtectedReferences
            }
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {generateForm.sequenceCount > 1
              ? `Gerar ${generateForm.sequenceCount} pecas com IA`
              : "Gerar com IA"}
          </button>
        </div>

        {generateMutation.isPending ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {batchGenerationProgress && batchGenerationProgress.total > 1
              ? `Estamos enviando a sequencia para fila agora (${batchGenerationProgress.current}/${batchGenerationProgress.total}).`
              : "Estamos enviando sua publicacao para fila agora."}
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
                Publicações
              </h2>
              <p className="text-sm text-slate-500">
                Revise rascunhos gerados, publicações já feitas e itens agendados.
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
                  const isSequentialPost = isSequentialVideoMode(
                    post.continuityMode,
                    Boolean(post.generateVideo),
                  );

                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => handleSelectPost(post.id)}
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
                        {getAiPostCardPreviewText(post)}
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Megaphone className="h-3.5 w-3.5" />
                          {getModeLabel(post.mode)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {isSequentialPost
                            ? `${post.totalDurationSeconds || 30}s`
                            : post.media.length}
                        </span>
                        {isSequentialPost ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                            {post.media.length} segmentos internos
                          </span>
                        ) : null}
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

          <div className="hidden min-w-0 flex-1 bg-slate-50/50 p-6 lg:block">
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
                            <label
                              className={`flex items-start gap-3 rounded-2xl border px-4 py-4 ${
                                currentDraft.postType === "REELS"
                                  ? "cursor-not-allowed border-slate-200 bg-slate-100"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
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
                                disabled={
                                  currentDraft.postType === "REELS" || !canEditAiPosts
                                }
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span
                                className={`text-sm ${
                                  currentDraft.postType === "REELS"
                                    ? "text-slate-500"
                                    : "text-slate-700"
                                }`}
                              >
                                <span className="block font-bold text-slate-900">
                                  Gerar imagem
                                </span>
                                Use quando quiser uma arte fixa para feed ou
                                story, com leitura rapida e composicao estatica.
                              </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                              <input
                                type="radio"
                                name={`draft-media-type-${selectedPost?.id || "default"}`}
                                checked={currentDraft.generateVideo}
                                disabled={!canEditAiPosts}
                                onChange={() =>
                                  updateDraft({
                                    generateImage: false,
                                    generateVideo: true,
                                  })
                                }
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-slate-700">
                                <span className="block font-bold text-slate-900">
                                  Gerar vídeo
                                </span>
                                Ative para feed, story ou reels quando quiser
                                motion, narrativa em movimento e mais impacto
                                visual.
                              </span>
                            </label>
                          </div>

                          {currentDraft.postType === "STORY" ? (
                            <StoryPremisesBalloons />
                          ) : null}
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
                                updateDraft(
                                  buildVideoSettingsFromDuration(
                                    Number(event.target.value) as AiVideoDurationSeconds,
                                    currentDraft.videoResolution,
                                    currentDraft.continuityMode,
                                  ),
                                )
                              }
                              disabled={!canEditAiPosts || isCurrentDraftVideoReferenceMode}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              {VIDEO_DURATION_OPTIONS.map((duration) => (
                                <option key={duration} value={duration}>
                                  {duration} segundos
                                </option>
                              ))}
                            </select>
                            <p className="mt-2 text-xs text-slate-500">
                              {isCurrentDraftVideoReferenceMode
                                ? "Video com imagem de referencia fica travado em 8 segundos no modelo atual."
                                : "O backend aceita apenas 4, 6 ou 8 segundos."}
                            </p>
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
                              placeholder={IMAGE_PROMPT_PLACEHOLDERS[currentDraft.postType]}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                            <p className="mt-2 text-xs text-slate-500">
                              {getImagePromptHelper(currentDraft.postType)}
                            </p>
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
                              placeholder={VIDEO_PROMPT_PLACEHOLDERS[currentDraft.postType]}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                            <p className="mt-2 text-xs text-slate-500">
                              {getVideoPromptHelper(currentDraft.postType)}
                            </p>
                          </div>
                        ) : null}

                        <DirectionVisualSection
                          postType={currentDraft.postType}
                          generateVideo={currentDraft.generateVideo}
                          qualityProfile={currentDraft.qualityProfile}
                          videoResolution={currentDraft.videoResolution}
                          continuityMode={currentDraft.continuityMode}
                          totalDurationSeconds={currentDraft.totalDurationSeconds}
                          visualStyle={currentDraft.visualStyle}
                          negativePrompt={currentDraft.negativePrompt}
                          referenceImageUrls={currentDraft.referenceImageUrls}
                          referencePreviewUrlByReference={draftReferencePreviewUrlByReference}
                          referenceAccessStateByReference={draftReferenceAccessStateByReference}
                          referenceUrlInput={draftReferenceUrlInput}
                          onReferenceUrlInputChange={setDraftReferenceUrlInput}
                          onAddReferenceUrl={() => handleAddDraftReferenceUrl()}
                          onImportReferenceFiles={handleImportDraftReferenceFiles}
                          onQuickAddReference={handleAddDraftReferenceUrl}
                          onMoveReference={handleMoveDraftReference}
                          onRemoveReference={(index) =>
                            updateDraft({
                              referenceImageUrls: currentDraft.referenceImageUrls.filter(
                                (_, currentIndex) => currentIndex !== index,
                              ),
                            })
                          }
                          onApplyPreset={(preset) =>
                            updateDraft({
                              visualStyle: preset.visualStyle,
                              negativePrompt: preset.negativePrompt,
                            })
                          }
                          onVisualStyleChange={(value) =>
                            updateDraft({ visualStyle: value })
                          }
                          onNegativePromptChange={(value) =>
                            updateDraft({ negativePrompt: value })
                          }
                          onQualityProfileChange={(value) =>
                            updateDraft({ qualityProfile: value })
                          }
                          onVideoResolutionChange={(value) =>
                            updateDraft(
                              buildVideoSettingsFromResolution(
                                value,
                                currentDraft.durationSeconds,
                                currentDraft.continuityMode,
                              ),
                            )
                          }
                          onContinuityModeChange={(value) =>
                            updateDraft({
                              continuityMode: value,
                              durationSeconds:
                                value === "SEQUENTIAL" ? 8 : currentDraft.durationSeconds,
                              videoResolution:
                                value === "SEQUENTIAL"
                                  ? "720p"
                                  : currentDraft.videoResolution,
                              totalDurationSeconds:
                                value === "SEQUENTIAL"
                                  ? normalizeTotalDurationSeconds(
                                      currentDraft.totalDurationSeconds,
                                    )
                                  : currentDraft.totalDurationSeconds,
                            })
                          }
                          onTotalDurationChange={(value) =>
                            updateDraft({
                              totalDurationSeconds: normalizeTotalDurationSeconds(value),
                            })
                          }
                          onStoryOutlineChange={(value) =>
                            updateDraft({ storyOutline: value })
                          }
                          onStoryBeatsChange={(value) =>
                            updateDraft({ storyBeats: value })
                          }
                          storyOutline={currentDraft.storyOutline}
                          storyBeats={currentDraft.storyBeats}
                          quickReferenceOptions={quickReferenceOptions}
                          isImportingReferenceFiles={referenceImageImportMutation.isPending}
                          disabled={!canEditAiPosts}
                        />
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
                    <InstagramPreviewMock
                      postType={currentDraft.postType}
                      caption={draftPreviewCaption}
                      accountLabel={previewAccountLabel}
                      mediaUrl={selectedPreviewMediaUrl}
                      mediaIsVideo={selectedPreviewMediaIsVideo}
                      showVideoIntent={selectedPreviewShowsVideoIntent}
                      continuityMode={currentDraft.continuityMode}
                      totalDurationSeconds={currentDraft.totalDurationSeconds}
                    />

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                        <ImageIcon className="h-4 w-4 text-slate-500" />
                        Mídia gerada
                      </div>
                      <GeneratedMediaSection
                        key={`${selectedPost.id}-${selectedPost.media.length}-${currentDraft.totalDurationSeconds}-modal`}
                        postType={selectedPost.postType as AiPostType}
                        media={selectedPost.media}
                        isSequential={isCurrentDraftSequential}
                        storyBeats={parsedStoryBeats}
                        totalDurationSeconds={currentDraft.totalDurationSeconds}
                      />
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

                  {draftProtectedReferenceUrls.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      As referencias importadas do PC continuam com preview local apenas. Para usar essas imagens em novas geracoes, troque por URLs publicas.
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="text-xs text-slate-500">
                    Reels podem exigir vídeo e stories priorizam asset vertical.
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={
                        updateMutation.isPending ||
                        !canEditAiPosts ||
                        isSelectedPostProcessing
                      }
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
                          !isMetaConnected ||
                          isSelectedPostProcessing ||
                          isCurrentDraftSequential
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
                          !isMetaConnected ||
                          isSelectedPostProcessing ||
                          isCurrentDraftSequential
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

        <DashboardDialog
          open={
            activeSection === "library" &&
            isMobileViewport &&
            isPostDetailModalOpen &&
            Boolean(selectedPost)
          }
          onClose={() => setIsPostDetailModalOpen(false)}
          title="Revisar publicacao"
          description="Ajuste legenda, hashtags, midia e agendamento antes de publicar."
          maxWidthClassName="max-w-6xl"
        >
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
            {selectedPostReviewContent}
          </div>
        </DashboardDialog>

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
  );
}

function PublicacoesIaPageFallback() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Carregando Publicacoes IA...</span>
      </div>
    </section>
  );
}

export default function PublicacoesIaPage() {
  return (
    <Suspense fallback={<PublicacoesIaPageFallback />}>
      <PublicacoesIaPageContent />
    </Suspense>
  );
}
