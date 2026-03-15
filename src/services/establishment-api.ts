/* eslint-disable @typescript-eslint/no-explicit-any */

import { api, extractAuthToken, setAuthToken } from "./api";
import {
  formatCompactNumber,
  formatPercentage,
  getEntityId,
  normalizeCampaign,
  normalizeCoupon,
  normalizeDashboardCharts,
  normalizeEstablishment,
  normalizeCampaignType,
  normalizeParticipation,
  toBackendCampaignType,
} from "./marque-e-ganhe-normalizers";

export interface Metric {
  activeCampaigns: number;
  totalPosts: number;
  pendingPosts: number;
  couponsIssued: number;
  couponsRedeemed: number;
}

export interface EstablishmentLoginMembership {
  teamUserId: string;
  establishmentId: string;
  establishmentName: string;
  role: "owner" | "manager" | "viewer";
  superAdmin: boolean;
  plan: string;
}

export interface EstablishmentLoginResponse {
  token?: string;
  establishment?: Record<string, any> | null;
  requiresEstablishmentSelection?: boolean;
  selectionToken?: string;
  memberships?: EstablishmentLoginMembership[];
}

export interface PlanAccess {
  planType: "free" | "start" | "pro" | "scale";
  planName: string;
  billingCycle: "monthly" | "annual";
  limits: {
    maxActiveCampaigns: number | null;
    maxMonthlyParticipations: number | null;
    maxUsers: number | null;
  };
  features: {
    autoApproval: boolean;
    progressiveRewards: boolean;
    advancedAnalytics: boolean;
    clientRanking: boolean;
    sponsoredHighlights: boolean;
    whiteLabel: boolean;
    multiUnit: boolean;
    advancedExports: boolean;
    multipleUsers: boolean;
  };
}

export interface PricingPlanAdminItem {
  id: string;
  type: "free" | "start" | "pro" | "scale";
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  redemptionFee: number;
  isActive: boolean;
  order: number;
}

export interface PricingEstablishmentAssignment {
  id: string;
  name: string;
  email: string;
  category: string;
  pricingPlanType: "free" | "start" | "pro" | "scale";
  pricingBillingCycle: "monthly" | "annual";
  plan: string;
  superAdmin: boolean;
  planAccess: PlanAccess;
}

export interface EstablishmentCurrentUser {
  id: string;
  name?: string;
  email?: string;
  role?: "owner" | "manager" | "viewer";
  isActive?: boolean;
  superAdmin?: boolean;
}

export interface EstablishmentTeamUser {
  id: string;
  establishmentId: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "viewer";
  isActive: boolean;
  superAdmin: boolean;
  invitedByUserId?: string;
  invitationAcceptedAt?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

type AnalyticsScopeParams = {
  establishmentId?: string;
  startDate?: string;
  endDate?: string;
};

export type AiPostMode = "CAMPAIGN" | "EDITORIAL";
export type AiPostType = "STORY" | "FEED" | "REELS";
export type AiVideoDurationSeconds = 4 | 6 | 8;
export type AiPostQualityProfile = "BALANCED" | "PROFESSIONAL";
export type AiVideoResolution = "720p" | "1080p";
export type AiVideoContinuityMode = "SINGLE" | "SEQUENTIAL";
export type AiPostUploadBucket = "midiahub-v1" | "report-new-nlp-v1";

export interface AiPostMediaItem {
  id?: string;
  url: string;
  type: string;
  mimeType?: string;
  segmentIndex?: number;
  segmentStartSeconds?: number;
  segmentEndSeconds?: number;
  segmentTitle?: string;
  continuityStrategy?: string;
}

export interface AiPostUploadedAsset {
  url: string;
  storageKey: string;
  mimeType?: string;
  fileName?: string;
  bucket?: AiPostUploadBucket | string;
}

export interface AiPostAsyncGenerationResponse {
  aiPostId: string;
  status: string;
  messageId?: string;
  notificationChannelId?: string;
  message?: string;
}

export interface AiPostRecord {
  id: string;
  _id: string;
  status: string;
  mode: string;
  postType: string;
  generateImage: boolean;
  generateVideo: boolean;
  durationSeconds?: AiVideoDurationSeconds;
  qualityProfile: AiPostQualityProfile;
  videoResolution?: AiVideoResolution;
  continuityMode: AiVideoContinuityMode;
  totalDurationSeconds?: number;
  imagePrompt: string;
  videoPrompt: string;
  visualStyle: string;
  negativePrompt: string;
  referenceImageUrls: string[];
  storyOutline: string;
  storyBeats: string[];
  prompt: string;
  topic: string;
  briefing: string;
  targetAudience: string;
  callToAction: string;
  caption: string;
  hashtags: string[];
  publishPreview: string;
  media: AiPostMediaItem[];
  timezone: string;
  scheduledAt?: string;
  createdAt?: string;
  updatedAt?: string;
  campaignId?: string;
  campaign?: Record<string, any> | null;
}

function normalizeAiPostTextValue(value: unknown): string {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized === "[object Object]" ? "" : normalized;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeAiPostTextValue(item))
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidateKeys = [
      "text",
      "content",
      "value",
      "message",
      "caption",
      "prompt",
      "description",
      "title",
      "label",
    ];

    for (const key of candidateKeys) {
      const normalizedCandidate = normalizeAiPostTextValue(record[key]);

      if (normalizedCandidate) {
        return normalizedCandidate;
      }
    }
  }

  return "";
}

function normalizeAiPost(record: Record<string, any> | null | undefined): AiPostRecord | null {
  if (!record) {
    return null;
  }

  const id = getEntityId(record);
  const hashtags = Array.isArray(record.hashtags)
    ? record.hashtags.map((item) => String(item || "").trim()).filter(Boolean)
    : typeof record.hashtags === "string"
      ? record.hashtags
          .split(/[\s,]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const referenceImageUrls = Array.isArray(record.referenceImageUrls)
    ? record.referenceImageUrls
        .map((item: unknown) => String(item || "").trim())
        .filter(Boolean)
    : typeof record.referenceImageUrls === "string"
      ? record.referenceImageUrls
          .split(/[\n,\s]+/)
          .map((item: string) => item.trim())
          .filter(Boolean)
      : [];
  const media = Array.isArray(record.media)
    ? record.media
        .map((item) => {
          if (typeof item === "string") {
            return {
              url: item,
              type: "IMAGE",
            };
          }

          if (!item || typeof item !== "object") {
            return null;
          }

          const url = String(item.url ?? item.mediaUrl ?? item.publicUrl ?? "").trim();

          if (!url) {
            return null;
          }

          return {
            id: getEntityId(item),
            url,
            type: String(item.type ?? item.mediaType ?? "IMAGE").toUpperCase(),
            mimeType: String(item.mimeType ?? item.contentType ?? "").trim() || undefined,
            segmentIndex:
              typeof item.segmentIndex === "number" && Number.isFinite(item.segmentIndex)
                ? Math.trunc(item.segmentIndex)
                : typeof item.segmentIndex === "string" &&
                    Number.isFinite(Number(item.segmentIndex))
                  ? Math.trunc(Number(item.segmentIndex))
                  : undefined,
            segmentStartSeconds:
              typeof item.segmentStartSeconds === "number" &&
              Number.isFinite(item.segmentStartSeconds)
                ? item.segmentStartSeconds
                : typeof item.segmentStartSeconds === "string" &&
                    Number.isFinite(Number(item.segmentStartSeconds))
                  ? Number(item.segmentStartSeconds)
                  : undefined,
            segmentEndSeconds:
              typeof item.segmentEndSeconds === "number" &&
              Number.isFinite(item.segmentEndSeconds)
                ? item.segmentEndSeconds
                : typeof item.segmentEndSeconds === "string" &&
                    Number.isFinite(Number(item.segmentEndSeconds))
                  ? Number(item.segmentEndSeconds)
                  : undefined,
            segmentTitle:
              String(item.segmentTitle ?? item.title ?? "").trim() || undefined,
            continuityStrategy:
              String(item.continuityStrategy ?? "").trim() || undefined,
          };
        })
        .filter(Boolean)
    : [];

  return {
    ...record,
    id,
    _id: id,
    status: String(record.status || "READY").toUpperCase(),
    mode: String(record.mode || "EDITORIAL").toUpperCase(),
    postType: String(record.postType || "FEED").toUpperCase(),
    generateImage: Boolean(record.generateImage),
    generateVideo: Boolean(record.generateVideo),
    durationSeconds:
      record.durationSeconds === 4 || record.durationSeconds === 6 || record.durationSeconds === 8
        ? record.durationSeconds
        : undefined,
    qualityProfile:
      String(record.qualityProfile || "").toUpperCase() === "PROFESSIONAL"
        ? "PROFESSIONAL"
        : "BALANCED",
    videoResolution:
      String(record.videoResolution || "").toLowerCase() === "1080p" ? "1080p" : "720p",
    continuityMode:
      String(record.continuityMode || "").toUpperCase() === "SEQUENTIAL"
        ? "SEQUENTIAL"
        : "SINGLE",
    totalDurationSeconds:
      typeof record.totalDurationSeconds === "number" && Number.isFinite(record.totalDurationSeconds)
        ? Math.max(1, Math.trunc(record.totalDurationSeconds))
        : typeof record.totalDurationSeconds === "string" &&
            Number.isFinite(Number(record.totalDurationSeconds))
          ? Math.max(1, Math.trunc(Number(record.totalDurationSeconds)))
          : undefined,
    imagePrompt: normalizeAiPostTextValue(record.imagePrompt),
    videoPrompt: normalizeAiPostTextValue(record.videoPrompt),
    visualStyle: normalizeAiPostTextValue(record.visualStyle),
    negativePrompt: normalizeAiPostTextValue(record.negativePrompt),
    referenceImageUrls,
    storyOutline: normalizeAiPostTextValue(record.storyOutline),
    storyBeats: Array.isArray(record.storyBeats)
      ? record.storyBeats.map((item: unknown) => String(item || "").trim()).filter(Boolean)
      : typeof record.storyBeats === "string"
        ? record.storyBeats
            .split(/[\n,]+/)
            .map((item: string) => item.trim())
            .filter(Boolean)
        : [],
    prompt: normalizeAiPostTextValue(record.prompt),
    topic: normalizeAiPostTextValue(record.topic),
    briefing: normalizeAiPostTextValue(record.briefing),
    targetAudience: normalizeAiPostTextValue(record.targetAudience),
    callToAction: normalizeAiPostTextValue(record.callToAction),
    caption: normalizeAiPostTextValue(record.caption || record.publishPreview),
    hashtags,
    publishPreview: normalizeAiPostTextValue(record.publishPreview || record.caption),
    media: media as AiPostMediaItem[],
    timezone: String(record.timezone || "America/Sao_Paulo"),
    scheduledAt: record.scheduledAt ? String(record.scheduledAt) : undefined,
    createdAt: record.createdAt ? String(record.createdAt) : undefined,
    updatedAt: record.updatedAt ? String(record.updatedAt) : undefined,
    campaignId: String(record.campaignId ?? record.campaign?.id ?? record.campaign?._id ?? ""),
    campaign: normalizeCampaign(record.campaign),
  };
}

function normalizeCampaignPayload(payload: Record<string, any>) {
  const normalizeReward = (value: unknown) => String(value || "").trim();
  const normalizeQuantity = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.trunc(value);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }

      const parsed = Number(trimmed.replace(",", "."));
      return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
    }

    return undefined;
  };
  const normalizedType = normalizeCampaignType(payload?.type);
  const enabledModalities =
    normalizedType === "all"
      ? ["story", "feed", "reels"]
      : [normalizedType];
  const isModalityEnabled = (modality: string) => enabledModalities.includes(modality);
  const storyBaseReward = normalizeReward(payload?.storyBaseReward);
  const storyMaxReward = normalizeReward(payload?.storyMaxReward);
  const feedBaseReward = normalizeReward(payload?.feedBaseReward);
  const feedMaxReward = normalizeReward(payload?.feedMaxReward);
  const reelsBaseReward = normalizeReward(payload?.reelsBaseReward);
  const reelsMaxReward = normalizeReward(payload?.reelsMaxReward);
  const storyBaseQuantity = normalizeQuantity(payload?.storyBaseQuantity);
  const storyMaxQuantity = normalizeQuantity(payload?.storyMaxQuantity);
  const feedBaseQuantity = normalizeQuantity(payload?.feedBaseQuantity);
  const feedMaxQuantity = normalizeQuantity(payload?.feedMaxQuantity);
  const reelsBaseQuantity = normalizeQuantity(payload?.reelsBaseQuantity);
  const reelsMaxQuantity = normalizeQuantity(payload?.reelsMaxQuantity);

  return {
    ...payload,
    type: toBackendCampaignType(payload?.type),
    storyBaseReward: isModalityEnabled("story") ? storyBaseReward : undefined,
    storyBaseQuantity: isModalityEnabled("story") ? storyBaseQuantity : undefined,
    storyMaxReward:
      isModalityEnabled("story") && storyMaxReward && storyMaxQuantity !== undefined
        ? storyMaxReward
        : undefined,
    storyMaxQuantity:
      isModalityEnabled("story") && storyMaxReward && storyMaxQuantity !== undefined
        ? storyMaxQuantity
        : undefined,
    feedBaseReward: isModalityEnabled("feed") ? feedBaseReward : undefined,
    feedBaseQuantity: isModalityEnabled("feed") ? feedBaseQuantity : undefined,
    feedMaxReward:
      isModalityEnabled("feed") && feedMaxReward && feedMaxQuantity !== undefined
        ? feedMaxReward
        : undefined,
    feedMaxQuantity:
      isModalityEnabled("feed") && feedMaxReward && feedMaxQuantity !== undefined
        ? feedMaxQuantity
        : undefined,
    reelsBaseReward: isModalityEnabled("reels") ? reelsBaseReward : undefined,
    reelsBaseQuantity: isModalityEnabled("reels") ? reelsBaseQuantity : undefined,
    reelsMaxReward:
      isModalityEnabled("reels") && reelsMaxReward && reelsMaxQuantity !== undefined
        ? reelsMaxReward
        : undefined,
    reelsMaxQuantity:
      isModalityEnabled("reels") && reelsMaxReward && reelsMaxQuantity !== undefined
        ? reelsMaxQuantity
        : undefined,
    rewardByType: undefined,
    storyReward: undefined,
    feedReward: undefined,
    reelsReward: undefined,
    baseLikesRequired: undefined,
    maxLikesRequired: undefined,
    baseReward: undefined,
    maxReward: undefined,
    badges: Array.isArray(payload?.badges) ? payload.badges.filter(Boolean) : [],
    rules: Array.isArray(payload?.rules) ? payload.rules.filter(Boolean) : [],
  };
}

function persistEstablishmentToken(payload: unknown) {
  const token = extractAuthToken(payload);

  if (token) {
    setAuthToken(token, "establishment");
  }

  return token;
}

export const establishmentApi = {
  login: async (credentials: { email: string; password?: string }) => {
    const { data } = await api.post<EstablishmentLoginResponse>(
      "/api/auth/establishment/login",
      credentials,
    );
    const token = persistEstablishmentToken(data);
    return {
      ...data,
      token,
      establishment: normalizeEstablishment(data?.establishment),
      memberships: Array.isArray(data?.memberships) ? data.memberships : [],
    };
  },

  register: async (payload: {
    name: string;
    establishmentName: string;
    email: string;
    password?: string;
  }) => {
    const { data } = await api.post("/api/auth/establishment/register", payload);
    const token = persistEstablishmentToken(data);

    return {
      ...data,
      token,
      establishment: normalizeEstablishment(data?.establishment),
    };
  },

  getFacebookLoginUrl: async (options?: {
    establishmentId?: string;
    provider?: "facebook" | "instagram";
    frontendOrigin?: string;
  }) => {
    const { data } = await api.get<{ url: string; establishmentId?: string }>(
      "/api/auth/facebook",
      {
        params: {
          redirect: false,
          establishmentId: options?.establishmentId,
          provider: options?.provider,
          frontendOrigin: options?.frontendOrigin,
        },
      },
    );
    return data;
  },

  facebookCallback: async (
    code: string,
    state?: string,
    provider?: "facebook" | "instagram",
  ) => {
    const { data } = await api.get("/api/auth/facebook/callback", {
      params: { code, state, provider, redirect: false },
    });
    const token = persistEstablishmentToken(data);

    return {
      ...data,
      token,
      establishment: normalizeEstablishment(data?.establishment),
    };
  },

  getMe: async () => {
    const { data } = await api.get("/api/establishment/me");
    return normalizeEstablishment(data);
  },

  getMetrics: async (params?: AnalyticsScopeParams): Promise<Metric> => {
    const { data } = await api.get("/api/dashboard/metrics", { params });
    return {
      activeCampaigns: Number(data?.activeCampaigns || 0),
      totalPosts: Number(data?.totalParticipations ?? data?.totalPosts ?? 0),
      pendingPosts: Number(data?.pendingParticipations ?? 0),
      couponsIssued: Number(data?.totalCoupons ?? data?.couponsIssued ?? 0),
      couponsRedeemed: Number(data?.redeemedCoupons ?? data?.couponsRedeemed ?? 0),
    };
  },

  getCharts: async (params?: AnalyticsScopeParams) => {
    const { data } = await api.get("/api/dashboard/charts", { params });
    return normalizeDashboardCharts(data);
  },

  getCampaigns: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => {
    const { data } = await api.get("/api/campaigns", { params });
    return {
      ...data,
      items: Array.isArray(data?.items)
        ? data.items.map((item: any) => normalizeCampaign(item)).filter(Boolean)
        : [],
      total: Number(data?.total || 0),
    };
  },

  getCampaign: async (id: string) => {
    const { data } = await api.get(`/api/campaigns/${id}`);
    return normalizeCampaign(data);
  },

  createCampaign: async (payload: Record<string, any>) => {
    const { data } = await api.post(
      "/api/campaigns",
      normalizeCampaignPayload(payload),
    );
    return normalizeCampaign(data);
  },

  updateCampaign: async (id: string, payload: Record<string, any>) => {
    const { data } = await api.put(
      `/api/campaigns/${id}`,
      normalizeCampaignPayload(payload),
    );
    return normalizeCampaign(data);
  },

  getParticipations: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    campaignId?: string;
    type?: string;
    userHandle?: string;
  }) => {
    const { data } = await api.get("/api/participations", { params });
    return {
      ...data,
      items: Array.isArray(data?.items)
        ? data.items
            .map((item: any) => normalizeParticipation(item))
            .filter(Boolean)
        : [],
      total: Number(data?.total || 0),
    };
  },

  approveParticipation: async (
    id: string,
    payload?: Record<string, any>,
  ) => {
    const { data } = await api.post(`/api/participations/${id}/approve`, payload);
    return data;
  },

  rejectParticipation: async (id: string, reason: string) => {
    const { data } = await api.post(`/api/participations/${id}/reject`, {
      reason,
    });
    return data;
  },

  getCoupons: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    campaignId?: string;
    search?: string;
  }) => {
    const { data } = await api.get("/api/coupons", { params });
    return {
      ...data,
      items: Array.isArray(data?.items)
        ? data.items.map((item: any) => normalizeCoupon(item, "lower")).filter(Boolean)
        : [],
      total: Number(data?.total || 0),
    };
  },

  redeemCoupon: async (code: string) => {
    const { data } = await api.post(`/api/coupons/${code}/redeem`);
    return data;
  },

  cancelCoupon: async (code: string) => {
    const { data } = await api.post(`/api/coupons/${code}/cancel`);
    return data;
  },

  getAnalyticsRoi: async (params?: AnalyticsScopeParams) => {
    const { data } = await api.get("/api/analytics/roi", { params });
    return {
      ...data,
      roi: formatPercentage(data?.estimatedRoiPercentage),
      totalParticipations: Number(data?.totals?.participations || 0),
      totalLikes: formatCompactNumber(data?.totals?.likes),
    };
  },

  getAnalyticsConversion: async (params?: AnalyticsScopeParams) => {
    const { data } = await api.get("/api/analytics/conversion", { params });
    return {
      ...data,
      approvalRate: Number(data?.rates?.approvalRate || 0),
      rejectionRate: Number(data?.rates?.rejectionRate || 0),
      redemptionRate: Number(data?.rates?.redemptionRate || 0),
      rate: formatPercentage(data?.rates?.redemptionRate),
    };
  },

  getAnalyticsInsights: async (params?: AnalyticsScopeParams) => {
    const { data } = await api.get("/api/analytics/insights", { params });
    return {
      ...data,
      cards: Array.isArray(data?.cards) ? data.cards : [],
    };
  },

  generateAiPost: async (payload: {
    mode: AiPostMode;
    campaignId?: string;
    postType: AiPostType;
    prompt: string;
    topic?: string;
    briefing?: string;
    targetAudience?: string;
    callToAction?: string;
    timezone?: string;
    generateImage?: boolean;
    generateVideo?: boolean;
    durationSeconds?: AiVideoDurationSeconds;
    qualityProfile?: AiPostQualityProfile;
    videoResolution?: AiVideoResolution;
    continuityMode?: AiVideoContinuityMode;
    totalDurationSeconds?: number;
    imagePrompt?: string;
    videoPrompt?: string;
    visualStyle?: string;
    negativePrompt?: string;
    referenceImageUrls?: string[];
    storyOutline?: string;
    storyBeats?: string[];
  }) => {
    const { data } = await api.post("/api/ai-posts/generate", payload);
    return normalizeAiPost(data);
  },

  generateAiPostAsync: async (payload: {
    mode: AiPostMode;
    campaignId?: string;
    postType: AiPostType;
    prompt: string;
    topic?: string;
    briefing?: string;
    targetAudience?: string;
    callToAction?: string;
    timezone?: string;
    generateImage?: boolean;
    generateVideo?: boolean;
    durationSeconds?: AiVideoDurationSeconds;
    qualityProfile?: AiPostQualityProfile;
    videoResolution?: AiVideoResolution;
    continuityMode?: AiVideoContinuityMode;
    totalDurationSeconds?: number;
    imagePrompt?: string;
    videoPrompt?: string;
    visualStyle?: string;
    negativePrompt?: string;
    referenceImageUrls?: string[];
    storyOutline?: string;
    storyBeats?: string[];
    notificationChannelId?: string;
  }): Promise<AiPostAsyncGenerationResponse> => {
    const { data } = await api.post("/api/ai-posts/generate-async", payload);
    return {
      aiPostId: String(data?.aiPostId || data?._id || data?.id || "").trim(),
      status: String(data?.status || "").trim(),
      messageId: String(data?.messageId || "").trim() || undefined,
      notificationChannelId:
        String(data?.notificationChannelId || "").trim() || undefined,
      message: String(data?.message || "").trim() || undefined,
    };
  },

  uploadAiPostReferenceImage: async (payload: {
    dataUrl: string;
    fileName?: string;
    bucket?: AiPostUploadBucket;
  }): Promise<AiPostUploadedAsset> => {
    const { data } = await api.post("/api/ai-posts/reference-images", payload);
    return {
      url: String(data?.url || "").trim(),
      storageKey: String(data?.storageKey || "").trim(),
      mimeType: String(data?.mimeType || "").trim() || undefined,
      fileName: String(data?.fileName || "").trim() || undefined,
      bucket: String(data?.bucket || "").trim() || undefined,
    };
  },

  uploadAiPostAsset: async (payload: {
    dataUrl: string;
    fileName?: string;
    folder?: string;
    bucket?: AiPostUploadBucket;
  }): Promise<AiPostUploadedAsset> => {
    const { data } = await api.post("/api/ai-posts/assets/upload", payload);
    return {
      url: String(data?.url || "").trim(),
      storageKey: String(data?.storageKey || "").trim(),
      mimeType: String(data?.mimeType || "").trim() || undefined,
      fileName: String(data?.fileName || "").trim() || undefined,
      bucket: String(data?.bucket || "").trim() || undefined,
    };
  },

  getAiPosts: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    mode?: string;
    postType?: string;
  }) => {
    const { data } = await api.get("/api/ai-posts", { params });
    return {
      ...data,
      items: Array.isArray(data?.items)
        ? data.items.map((item: any) => normalizeAiPost(item)).filter(Boolean)
        : [],
      total: Number(data?.total || 0),
    };
  },

  getAiPost: async (id: string) => {
    const { data } = await api.get(`/api/ai-posts/${id}`);
    return normalizeAiPost(data);
  },

  updateAiPost: async (
    id: string,
    payload: {
      mode?: AiPostMode;
      campaignId?: string;
      postType?: AiPostType;
      prompt?: string;
      topic?: string;
      briefing?: string;
      targetAudience?: string;
      callToAction?: string;
      generateImage?: boolean;
      generateVideo?: boolean;
      durationSeconds?: AiVideoDurationSeconds;
      qualityProfile?: AiPostQualityProfile;
      videoResolution?: AiVideoResolution;
      continuityMode?: AiVideoContinuityMode;
      totalDurationSeconds?: number;
      imagePrompt?: string;
      videoPrompt?: string;
      visualStyle?: string;
      negativePrompt?: string;
      referenceImageUrls?: string[];
      storyOutline?: string;
      storyBeats?: string[];
      caption?: string;
      hashtags?: string[];
      timezone?: string;
    },
  ) => {
    const { data } = await api.patch(`/api/ai-posts/${id}`, payload);
    return normalizeAiPost(data);
  },

  publishAiPostNow: async (id: string) => {
    const { data } = await api.post(`/api/ai-posts/${id}/publish-now`);
    return normalizeAiPost(data);
  },

  scheduleAiPost: async (
    id: string,
    payload: { scheduledAt: string; timezone?: string },
  ) => {
    const { data } = await api.post(`/api/ai-posts/${id}/schedule`, payload);
    return normalizeAiPost(data);
  },

  cancelAiPost: async (id: string) => {
    const { data } = await api.post(`/api/ai-posts/${id}/cancel`);
    return normalizeAiPost(data);
  },

  getSettings: async () => {
    const { data } = await api.get("/api/settings");
    return normalizeEstablishment(data);
  },

  updateSettings: async (payload: Record<string, any>) => {
    const { data } = await api.put("/api/settings", payload);
    return normalizeEstablishment(data);
  },

  getPricingPlans: async () => {
    const { data } = await api.get<PricingPlanAdminItem[]>("/api/pricing/plans");
    return Array.isArray(data) ? data : [];
  },

  getPricingEstablishments: async () => {
    const { data } = await api.get<PricingEstablishmentAssignment[]>(
      "/api/pricing/establishments",
    );
    return Array.isArray(data) ? data : [];
  },

  assignPricingPlan: async (
    establishmentId: string,
    payload: {
      planType: "free" | "start" | "pro" | "scale";
      billingCycle?: "monthly" | "annual";
    },
  ) => {
    const { data } = await api.put<PricingEstablishmentAssignment>(
      `/api/pricing/establishments/${establishmentId}/plan`,
      payload,
    );
    return data;
  },

  updatePricingSuperAdmin: async (
    establishmentId: string,
    payload: { superAdmin: boolean },
  ) => {
    const { data } = await api.put<PricingEstablishmentAssignment>(
      `/api/pricing/establishments/${establishmentId}/super-admin`,
      payload,
    );
    return data;
  },

  createPricingAdmin: async (payload: {
    name?: string;
    establishmentName: string;
    email: string;
    category?: string;
    superAdmin?: boolean;
    planType?: "free" | "start" | "pro" | "scale";
    billingCycle?: "monthly" | "annual";
  }) => {
    const { data } = await api.post<PricingEstablishmentAssignment>(
      "/api/pricing/establishments/admin",
      payload,
    );
    return data;
  },

  getTeamUsers: async () => {
    const { data } = await api.get<EstablishmentTeamUser[]>("/api/team-users");
    return Array.isArray(data) ? data : [];
  },

  createTeamUser: async (payload: {
    name: string;
    email: string;
    role: "owner" | "manager" | "viewer";
  }) => {
    const { data } = await api.post<EstablishmentTeamUser>("/api/team-users", payload);
    return data;
  },

  updateTeamUser: async (
    id: string,
    payload: {
      name?: string;
      role?: "owner" | "manager" | "viewer";
      password?: string;
      isActive?: boolean;
    },
  ) => {
    const { data } = await api.put<EstablishmentTeamUser>(`/api/team-users/${id}`, payload);
    return data;
  },

  selectMembership: async (payload: {
    selectionToken: string;
    teamUserId: string;
  }) => {
    const { data } = await api.post<EstablishmentLoginResponse>(
      "/api/auth/establishment/select-membership",
      payload,
    );
    const token = persistEstablishmentToken(data);
    return {
      ...data,
      token,
      establishment: normalizeEstablishment(data?.establishment),
    };
  },

  forgotPassword: async (email: string) => {
    const { data } = await api.post("/api/auth/establishment/forgot-password", { email });
    return data;
  },

  validateInviteToken: async (token: string) => {
    const { data } = await api.get("/api/auth/establishment/invite", {
      params: { token },
    });
    return data;
  },

  acceptInvite: async (payload: { token: string; password: string }) => {
    const { data } = await api.post<EstablishmentLoginResponse>(
      "/api/auth/establishment/invite",
      payload,
    );
    const token = persistEstablishmentToken(data);
    return {
      ...data,
      token,
      establishment: normalizeEstablishment(data?.establishment),
    };
  },

  resetPassword: async (payload: { token: string; password: string }) => {
    const { data } = await api.post("/api/auth/establishment/reset-password", payload);
    return data;
  },
};
