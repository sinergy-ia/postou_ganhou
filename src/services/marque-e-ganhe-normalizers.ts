/* eslint-disable @typescript-eslint/no-explicit-any */

type AnyRecord = Record<string, any>;

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80";
const DEFAULT_ESTABLISHMENT_NAME = "Estabelecimento";

const compactFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const distanceFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function ensureText(value: unknown, fallback = "") {
  return hasText(value) ? value : fallback;
}

function normalizeComparableText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function shouldHideCampaignRule(value: unknown) {
  const normalized = normalizeComparableText(value);
  return normalized.includes("perfil") && normalized.includes("publico");
}

function resolveDistanceKm(record: AnyRecord) {
  const distanceInKm = parseNumber(record?.distanceInKm);
  if (distanceInKm !== null) {
    return distanceInKm;
  }

  const distanceInMeters = parseNumber(record?.distanceInMeters);
  if (distanceInMeters !== null) {
    return distanceInMeters / 1000;
  }

  if (typeof record?.distance === "string") {
    const parsed = parseNumber(record.distance);
    if (parsed !== null) {
      return /m\b/i.test(record.distance) && !/km/i.test(record.distance)
        ? parsed / 1000
        : parsed;
    }
  }

  return parseNumber(record?.distance);
}

function normalizeLocation(record: AnyRecord) {
  const coordinates = Array.isArray(record?.location?.coordinates)
    ? record.location.coordinates
    : null;

  return {
    lat: parseNumber(record?.lat) ?? coordinates?.[1] ?? undefined,
    lng: parseNumber(record?.lng) ?? coordinates?.[0] ?? undefined,
  };
}

export function getEntityId(record: AnyRecord | null | undefined) {
  if (!record) {
    return "";
  }

  return String(record.id ?? record._id ?? "");
}

export function buildAvatarFallback(name?: string) {
  return `https://ui-avatars.com/api/?background=E2E8F0&color=0F172A&name=${encodeURIComponent(
    ensureText(name, "Marque & Ganhe"),
  )}`;
}

export function formatDate(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("pt-BR").format(date);
}

export function formatCompactNumber(value?: number | null) {
  return compactFormatter.format(Number(value || 0));
}

export function formatPercentage(value?: number | null) {
  return `${percentageFormatter.format(Number(value || 0))}%`;
}

export function normalizeHandle(value?: string | null) {
  if (!hasText(value)) {
    return "";
  }

  return `@${value.trim().replace(/^@+/, "").toLowerCase()}`;
}

export function stripHandle(value?: string | null) {
  return normalizeHandle(value).replace(/^@/, "");
}

export function formatDistance(record: AnyRecord) {
  const distanceKm = resolveDistanceKm(record);

  if (distanceKm === null) {
    return "";
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceFormatter.format(distanceKm)} km`;
}

export function normalizeEstablishment(
  record: AnyRecord | null | undefined,
): AnyRecord | null {
  if (!record) {
    return null;
  }

  const id = getEntityId(record);
  const name = ensureText(
    record.name ?? record.establishmentName,
    DEFAULT_ESTABLISHMENT_NAME,
  );
  const avatarUrl = ensureText(
    record.avatarUrl ?? record.avatar,
    buildAvatarFallback(name),
  );
  const coverUrl = ensureText(record.coverUrl ?? record.cover, DEFAULT_COVER);
  const { lat, lng } = normalizeLocation(record);
  const planAccess =
    record.planAccess && typeof record.planAccess === "object"
      ? record.planAccess
      : null;

  return {
    ...record,
    id,
    _id: id,
    name,
    category: ensureText(record.category, "Sem categoria"),
    avatar: avatarUrl,
    avatarUrl,
    cover: coverUrl,
    coverUrl,
    address: ensureText(record.address),
    description: ensureText(record.description),
    distanceKm: resolveDistanceKm(record) ?? undefined,
    distance: formatDistance(record),
    instagramHandle: normalizeHandle(record.instagramHandle),
    pricingPlanType: ensureText(
      record.pricingPlanType ?? planAccess?.planType,
      "free",
    ),
    pricingBillingCycle: ensureText(
      record.pricingBillingCycle ?? planAccess?.billingCycle,
      "monthly",
    ),
    plan: ensureText(record.plan ?? planAccess?.planName, "Free"),
    superAdmin: Boolean(record.superAdmin),
    planAccess,
    cnpj: ensureText(record.cnpj),
    website: ensureText(record.website),
    lat,
    lng,
  };
}

export function normalizeClient(
  record: AnyRecord | null | undefined,
): AnyRecord | null {
  if (!record) {
    return null;
  }

  const id = getEntityId(record);
  const instagramHandle = normalizeHandle(record.instagramHandle);
  const name = ensureText(record.name, stripHandle(instagramHandle) || "Cliente");
  const avatarUrl = ensureText(record.avatarUrl, buildAvatarFallback(name));

  return {
    ...record,
    id,
    _id: id,
    name,
    avatarUrl,
    instagramHandle,
  };
}

type UiCampaignType = "story" | "feed" | "reels" | "all";
type UiCampaignStatus = "active" | "scheduled" | "paused" | "ended";
export type CampaignModalityKey = Exclude<UiCampaignType, "all">;

export interface CampaignModalityConfig {
  key: CampaignModalityKey;
  label: string;
  enabled: boolean;
  baseReward: string;
  baseQuantity?: number;
  maxReward: string;
  maxQuantity?: number;
}

const CAMPAIGN_MODALITY_META: Record<
  CampaignModalityKey,
  { label: string; singularLabel: string; pluralLabel: string }
> = {
  story: {
    label: "Story",
    singularLabel: "story",
    pluralLabel: "stories",
  },
  feed: {
    label: "Feed",
    singularLabel: "post feed",
    pluralLabel: "posts feed",
  },
  reels: {
    label: "Reels",
    singularLabel: "reel",
    pluralLabel: "reels",
  },
};

function normalizeCampaignQuantity(value: unknown) {
  const parsed = parseNumber(value);
  if (parsed === null || parsed <= 0) {
    return undefined;
  }

  return Math.trunc(parsed);
}

function getLegacyRewardFallback(
  record: AnyRecord,
  modality: CampaignModalityKey,
  level: "base" | "max",
) {
  if (normalizeCampaignType(record?.type) !== modality) {
    return "";
  }

  return ensureText(level === "base" ? record?.baseReward : record?.maxReward);
}

function resolveCampaignModalityReward(
  record: AnyRecord,
  modality: CampaignModalityKey,
  level: "base" | "max",
) {
  const prefix = modality;
  const normalizedLevel = level === "base" ? "Base" : "Max";
  const explicitReward = ensureText(record?.[`${prefix}${normalizedLevel}Reward`]);

  if (explicitReward) {
    return explicitReward;
  }

  if (level === "base") {
    const legacyRewardByType = ensureText(
      record?.[`${prefix}Reward`] ?? record?.rewardByType?.[modality],
    );

    if (legacyRewardByType) {
      return legacyRewardByType;
    }
  }

  return getLegacyRewardFallback(record, modality, level);
}

export function getCampaignModalityLabel(modality: CampaignModalityKey) {
  return CAMPAIGN_MODALITY_META[modality].label;
}

export function formatCampaignQuantityLabel(
  modality: CampaignModalityKey,
  quantity?: number | null,
) {
  const normalizedQuantity = Number(quantity || 0);
  const { singularLabel, pluralLabel } = CAMPAIGN_MODALITY_META[modality];
  const unitLabel = normalizedQuantity === 1 ? singularLabel : pluralLabel;

  return `${normalizedQuantity} ${unitLabel}`;
}

export function getCampaignTypeLabel(value?: string | null) {
  switch (normalizeCampaignType(value)) {
    case "story":
      return "Story";
    case "feed":
      return "Feed";
    case "reels":
      return "Reels";
    case "all":
      return "Todas as modalidades";
    default:
      return "Story";
  }
}

export function getCampaignModalityConfig(
  record: AnyRecord | null | undefined,
  modality: CampaignModalityKey,
): CampaignModalityConfig {
  const safeRecord = record || {};
  const normalizedType = normalizeCampaignType(safeRecord?.type);
  const baseReward = resolveCampaignModalityReward(safeRecord, modality, "base");
  const maxReward = resolveCampaignModalityReward(safeRecord, modality, "max");
  const baseQuantity = normalizeCampaignQuantity(
    safeRecord?.[`${modality}BaseQuantity`],
  );
  const maxQuantity = normalizeCampaignQuantity(
    safeRecord?.[`${modality}MaxQuantity`],
  );
  const enabled =
    normalizedType === "all" ||
    normalizedType === modality ||
    Boolean(baseReward || maxReward || baseQuantity || maxQuantity);

  return {
    key: modality,
    label: getCampaignModalityLabel(modality),
    enabled,
    baseReward,
    baseQuantity,
    maxReward,
    maxQuantity,
  };
}

export function getEnabledCampaignModalities(
  record: AnyRecord | null | undefined,
): CampaignModalityKey[] {
  return (Object.keys(CAMPAIGN_MODALITY_META) as CampaignModalityKey[]).filter(
    (modality) => getCampaignModalityConfig(record, modality).enabled,
  );
}

export function buildCampaignRewardLines(record: AnyRecord | null | undefined) {
  return getEnabledCampaignModalities(record)
    .map((modality) => {
      const config = getCampaignModalityConfig(record, modality);

      if (!config.baseReward) {
        return "";
      }

      const baseLine = `${config.label}: ${config.baseReward}${
        config.baseQuantity
          ? ` em ${formatCampaignQuantityLabel(modality, config.baseQuantity)}`
          : ""
      }`;

      if (!config.maxReward || !config.maxQuantity) {
        return baseLine;
      }

      return `${baseLine} • até ${config.maxReward} em ${formatCampaignQuantityLabel(
        modality,
        config.maxQuantity,
      )}`;
    })
    .filter(Boolean);
}

export function buildCampaignRewardSummary(record: AnyRecord | null | undefined) {
  const rewardLines = buildCampaignRewardLines(record);

  if (rewardLines.length === 0) {
    return ensureText(record?.baseReward, "Campanha configurada");
  }

  return rewardLines.join(" + ");
}

export function normalizeCampaignType(value?: string | null): UiCampaignType {
  switch (String(value || "").toUpperCase()) {
    case "STORY":
      return "story";
    case "FEED":
    case "POST":
      return "feed";
    case "REELS":
      return "reels";
    case "ALL":
    case "BOTH":
      return "all";
    default:
      return "story";
  }
}

export function toBackendCampaignType(value?: string | null) {
  switch (normalizeCampaignType(value)) {
    case "story":
      return "STORY";
    case "feed":
      return "FEED";
    case "reels":
      return "REELS";
    case "all":
      return "ALL";
    default:
      return "STORY";
  }
}

export function deriveCampaignStatus(record: AnyRecord): UiCampaignStatus {
  const expiresAt = record?.expiresAt ? new Date(record.expiresAt) : null;
  const isExpired =
    expiresAt instanceof Date &&
    !Number.isNaN(expiresAt.getTime()) &&
    expiresAt.getTime() < Date.now();

  if (isExpired) {
    return "ended";
  }

  if (record?.isActive === false) {
    return expiresAt && expiresAt.getTime() > Date.now() ? "scheduled" : "paused";
  }

  return "active";
}

export function normalizeCampaign(
  record: AnyRecord | null | undefined,
): AnyRecord | null {
  if (!record) {
    return null;
  }

  const id = getEntityId(record);
  const storyConfig = getCampaignModalityConfig(record, "story");
  const feedConfig = getCampaignModalityConfig(record, "feed");
  const reelsConfig = getCampaignModalityConfig(record, "reels");
  const rewardSummary = buildCampaignRewardSummary(record);

  return {
    ...record,
    id,
    _id: id,
    establishmentId: String(
      record.establishmentId ?? record.establishment?.id ?? record.establishment?._id ?? "",
    ),
    establishment: normalizeEstablishment(record.establishment),
    type: normalizeCampaignType(record.type),
    status: deriveCampaignStatus(record),
    badges: Array.isArray(record.badges) ? record.badges : [],
    rules: Array.isArray(record.rules)
      ? record.rules.filter((rule) => !shouldHideCampaignRule(rule))
      : [],
    baseReward: ensureText(record.baseReward, rewardSummary),
    maxReward: ensureText(record.maxReward),
    storyReward: storyConfig.baseReward,
    feedReward: feedConfig.baseReward,
    reelsReward: reelsConfig.baseReward,
    storyBaseReward: storyConfig.baseReward,
    storyBaseQuantity: storyConfig.baseQuantity,
    storyMaxReward: storyConfig.maxReward,
    storyMaxQuantity: storyConfig.maxQuantity,
    feedBaseReward: feedConfig.baseReward,
    feedBaseQuantity: feedConfig.baseQuantity,
    feedMaxReward: feedConfig.maxReward,
    feedMaxQuantity: feedConfig.maxQuantity,
    reelsBaseReward: reelsConfig.baseReward,
    reelsBaseQuantity: reelsConfig.baseQuantity,
    reelsMaxReward: reelsConfig.maxReward,
    reelsMaxQuantity: reelsConfig.maxQuantity,
    rewardSummary,
    rewardLines: buildCampaignRewardLines(record),
    enabledModalities: getEnabledCampaignModalities(record),
    modalities: {
      story: storyConfig,
      feed: feedConfig,
      reels: reelsConfig,
    },
    baseLikesRequired: parseNumber(record.baseLikesRequired) ?? 0,
    maxLikesRequired: parseNumber(record.maxLikesRequired) ?? undefined,
    autoApproveParticipations: Boolean(record.autoApproveParticipations),
    stats: {
      participants: Number(
        record?.stats?.participants ??
          record?.approvedParticipations ??
          record?.participantsCount ??
          0,
      ),
      avgLikes: Number(record?.stats?.avgLikes ?? record?.averageLikes ?? 0),
      couponsIssued: Number(record?.stats?.couponsIssued ?? 0),
    },
  };
}

type UiParticipationType = "story" | "feed" | "reels";
type UiParticipationStatus = "pending" | "approved" | "rejected" | "redeemed";

export function normalizeParticipationType(value?: string | null): UiParticipationType {
  switch (String(value || "").toUpperCase()) {
    case "STORY":
      return "story";
    case "REELS":
    case "REEL":
      return "reels";
    case "FEED":
    case "POST":
    default:
      return "feed";
  }
}

export function normalizeParticipationStatus(
  value?: string | null,
): UiParticipationStatus {
  switch (String(value || "").toUpperCase()) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "REDEEMED":
      return "redeemed";
    default:
      return "pending";
  }
}

export function normalizeCouponStatus(
  value?: string | null,
  letterCase: "lower" | "upper" = "lower",
) {
  const normalized = String(value || "").toUpperCase();
  const fallback = letterCase === "lower" ? "active" : "ACTIVE";

  switch (normalized) {
    case "USED":
      return letterCase === "lower" ? "used" : "USED";
    case "EXPIRED":
      return letterCase === "lower" ? "expired" : "EXPIRED";
    case "CANCELLED":
      return letterCase === "lower" ? "cancelled" : "CANCELLED";
    case "ACTIVE":
      return letterCase === "lower" ? "active" : "ACTIVE";
    default:
      return fallback;
  }
}

export function normalizeParticipation(
  record: AnyRecord | null | undefined,
): AnyRecord | null {
  if (!record) {
    return null;
  }

  const id = getEntityId(record);
  const client = normalizeClient(record.client);
  const establishment = normalizeEstablishment(record.establishment);
  const campaign = normalizeCampaign(record.campaign);
  const userHandle = normalizeHandle(record.userHandle ?? client?.instagramHandle);
  const userName = ensureText(record.userName, client?.name || stripHandle(userHandle) || "Cliente");
  const userAvatar = ensureText(
    record.userAvatar,
    client?.avatarUrl || buildAvatarFallback(userName),
  );
  const imageUrl = ensureText(record.imageUrl ?? record.mediaUrl);

  return {
    ...record,
    id,
    _id: id,
    userName,
    userHandle,
    userAvatar,
    imageUrl,
    mediaUrl: imageUrl,
    discountEarned: ensureText(record.discountEarned),
    type: normalizeParticipationType(record.type),
    status: normalizeParticipationStatus(record.status),
    likes: Number(record.likes || 0),
    client,
    campaign,
    establishment,
  };
}

export function normalizeCoupon(
  record: AnyRecord | null | undefined,
  letterCase: "lower" | "upper" = "lower",
): AnyRecord | null {
  if (!record) {
    return null;
  }

  const id = getEntityId(record);
  const client = normalizeClient(record.client);
  const campaign = normalizeCampaign(record.campaign);
  const establishment = normalizeEstablishment(record.establishment);
  const participation = normalizeParticipation(record.participation);
  const reward = ensureText(record.reward ?? record.benefit);
  const participationIds = Array.isArray(record.participationIds)
    ? record.participationIds
        .map((item) => ensureText(item))
        .filter(Boolean)
    : [];
  const primaryParticipationId = ensureText(record.participationId, participation?.id || "");

  return {
    ...record,
    id,
    _id: id,
    status: normalizeCouponStatus(record.status, letterCase),
    benefit: reward,
    reward,
    userName: ensureText(
      record.userName,
      client?.name || participation?.userName || "Cliente",
    ),
    campaignName: ensureText(record.campaignName, campaign?.title || "Campanha"),
    validUntil: formatDate(record.validUntil),
    validUntilDate: record.validUntil,
    expiresAt: record.validUntil ?? record.expiresAt,
    usedAt: record.redeemedAt ?? record.usedAt,
    participationId: primaryParticipationId,
    participationIds:
      participationIds.length > 0
        ? participationIds
        : primaryParticipationId
          ? [primaryParticipationId]
          : [],
    client,
    campaign,
    establishment,
    participation,
  };
}

export function normalizeDashboardCharts(
  record: AnyRecord | null | undefined,
): AnyRecord[] {
  const chartMap = new Map<
    string,
    { date: string; posts: number; resgates: number; cupons: number }
  >();

  for (const item of Array.isArray(record?.posts) ? record.posts : []) {
    const date = ensureText(item?.date);
    if (!date) {
      continue;
    }

    const current = chartMap.get(date) || {
      date,
      posts: 0,
      resgates: 0,
      cupons: 0,
    };

    current.posts = Number(item?.total || item?.posts || 0);
    chartMap.set(date, current);
  }

  for (const item of Array.isArray(record?.redemptions) ? record.redemptions : []) {
    const date = ensureText(item?.date);
    if (!date) {
      continue;
    }

    const current = chartMap.get(date) || {
      date,
      posts: 0,
      resgates: 0,
      cupons: 0,
    };

    current.resgates = Number(item?.redeemed || item?.resgates || 0);
    current.cupons = Number(item?.generated || item?.cupons || 0);
    chartMap.set(date, current);
  }

  return Array.from(chartMap.values())
    .sort((left, right) => +new Date(left.date) - +new Date(right.date))
    .map((item) => ({
      ...item,
      name:
        new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }).format(new Date(item.date)) || item.date,
    }));
}

export function normalizeNotification(
  record: AnyRecord | null | undefined,
): AnyRecord | null {
  if (!record) {
    return null;
  }

  const type = String(record.type || "").toUpperCase();
  const titles: Record<string, string> = {
    ACTIVE: "Novo cupom liberado",
    APPROVED: "Postagem aprovada",
    CANCELLED: "Cupom cancelado",
    EXPIRED: "Cupom expirado",
    PENDING: "Postagem em análise",
    REDEEMED: "Benefício resgatado",
    REJECTED: "Postagem reprovada",
    USED: "Cupom utilizado",
  };

  return {
    ...record,
    id: ensureText(record.id, `notification-${type}-${record.createdAt || Date.now()}`),
    title: ensureText(record.title, titles[type] || "Atualização"),
    read: false,
  };
}
