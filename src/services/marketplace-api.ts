import { api } from "./api";

export const MARKETPLACE_PLATFORMS = ["NUVEMSHOP", "SHOPIFY", "IFOOD"] as const;
export type MarketplacePlatform = (typeof MARKETPLACE_PLATFORMS)[number];

export const MARKETPLACE_TEST_STATUSES = [
  "NEVER_TESTED",
  "SUCCESS",
  "FAILED",
  "SKIPPED",
] as const;
export type MarketplaceTestStatus = (typeof MARKETPLACE_TEST_STATUSES)[number];

export const EXTERNAL_COUPON_SYNC_STATUSES = [
  "PENDING",
  "SYNCED",
  "FAILED",
  "SKIPPED",
  "UNSUPPORTED",
] as const;
export type ExternalCouponSyncStatus = (typeof EXTERNAL_COUPON_SYNC_STATUSES)[number];

type AnyRecord = Record<string, unknown>;

function ensureText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getEntityId(record: AnyRecord | null | undefined) {
  if (!record) {
    return "";
  }

  return String(record.id ?? record._id ?? "");
}

export function normalizeMarketplacePlatform(
  value?: string | null,
): MarketplacePlatform | "" {
  const normalized = String(value || "").toUpperCase().trim();
  if (normalized === "NUVEMSHOP" || normalized === "SHOPIFY" || normalized === "IFOOD") {
    return normalized;
  }
  return "";
}

export function normalizeMarketplaceTestStatus(
  value?: string | null,
): MarketplaceTestStatus {
  const normalized = String(value || "").toUpperCase().trim();
  if (
    normalized === "NEVER_TESTED" ||
    normalized === "SUCCESS" ||
    normalized === "FAILED" ||
    normalized === "SKIPPED"
  ) {
    return normalized;
  }
  return "NEVER_TESTED";
}

export function normalizeExternalSyncStatus(
  value?: string | null,
): ExternalCouponSyncStatus {
  const normalized = String(value || "").toUpperCase().trim();
  if (
    normalized === "PENDING" ||
    normalized === "SYNCED" ||
    normalized === "FAILED" ||
    normalized === "SKIPPED" ||
    normalized === "UNSUPPORTED"
  ) {
    return normalized;
  }
  return "PENDING";
}

export type MarketplaceIntegrationRecord = {
  id: string;
  _id: string;
  establishmentId?: string;
  platform: MarketplacePlatform;
  enabled: boolean;
  shopIdentifier: string;
  shopUrl: string;
  capabilities: {
    createCoupon: boolean;
    updateCoupon: boolean;
    deactivateCoupon: boolean;
    validateConnection: boolean;
  };
  settings: {
    apiVersion?: string;
    userAgent?: string;
    itemEan?: string;
    itemEans?: string[];
    currencyCode?: string;
  } & AnyRecord;
  hasCredentials: boolean;
  credentialKeys: string[];
  credentialsPreview: Record<string, string>;
  token?: {
    hasAccessToken?: boolean;
    hasRefreshToken?: boolean;
    tokenType?: string;
    expiresIn?: number;
    obtainedAt?: string;
    expiresAt?: string;
  };
  ifoodLink?: {
    hasPendingUserCode?: boolean;
    pendingUserCode?: string;
    pendingUserCodeExpiresAt?: string;
    verificationUrl?: string;
    verificationUrlComplete?: string;
  };
  lastTestStatus: MarketplaceTestStatus;
  lastTestedAt?: string | null;
  lastTestError?: string;
  connected: boolean;
  createdAt?: string;
  updatedAt?: string;
} & AnyRecord;

function normalizeMarketplaceIntegration(
  record: AnyRecord | null | undefined,
): MarketplaceIntegrationRecord | null {
  if (!record) {
    return null;
  }

  const id = getEntityId(record);
  const platform = normalizeMarketplacePlatform(String(record.platform || ""));

  if (!platform) {
    return null;
  }

  return {
    ...(record as AnyRecord),
    id,
    _id: id,
    establishmentId: ensureText(record.establishmentId),
    platform,
    enabled: Boolean(record.enabled),
    shopIdentifier: ensureText(record.shopIdentifier),
    shopUrl: ensureText(record.shopUrl),
    capabilities: {
      createCoupon: Boolean((record.capabilities as AnyRecord)?.createCoupon),
      updateCoupon: Boolean((record.capabilities as AnyRecord)?.updateCoupon),
      deactivateCoupon: Boolean((record.capabilities as AnyRecord)?.deactivateCoupon),
      validateConnection: Boolean((record.capabilities as AnyRecord)?.validateConnection),
    },
    settings:
      record.settings && typeof record.settings === "object"
        ? (record.settings as MarketplaceIntegrationRecord["settings"])
        : {},
    hasCredentials: Boolean(record.hasCredentials),
    credentialKeys: Array.isArray(record.credentialKeys)
      ? record.credentialKeys
          .map((item) => ensureText(item))
          .filter(Boolean)
      : [],
    credentialsPreview:
      record.credentialsPreview && typeof record.credentialsPreview === "object"
        ? (record.credentialsPreview as Record<string, string>)
        : {},
    lastTestStatus: normalizeMarketplaceTestStatus(String(record.lastTestStatus || "")),
    lastTestedAt: record.lastTestedAt ? String(record.lastTestedAt) : null,
    lastTestError: ensureText(record.lastTestError),
    connected: Boolean(record.connected),
    createdAt: ensureText(record.createdAt),
    updatedAt: ensureText(record.updatedAt),
  };
}

export type MarketplaceIntegrationsResponse = {
  availablePlatforms: MarketplacePlatform[];
  integrations: MarketplaceIntegrationRecord[];
};

export type UpsertMarketplaceIntegrationPayload = {
  platform?: MarketplacePlatform;
  enabled?: boolean;
  shopIdentifier?: string;
  shopUrl?: string;
  clearCredentials?: boolean;
  credentials?: Record<string, unknown>;
  settings?: Record<string, unknown>;
};

export type IfoodLinkPayload = {
  enabled?: boolean;
  shopIdentifier?: string;
  clientId?: string;
  clientSecret?: string;
  merchantId?: string;
  settings?: Record<string, unknown>;
};

export type IfoodExchangeCodePayload = {
  authorizationCode: string;
  merchantId?: string;
  shopIdentifier?: string;
  authorizationCodeVerifier?: string;
  clientId?: string;
  clientSecret?: string;
};

export type IfoodRefreshTokenPayload = {
  refreshToken?: string;
};

export type IfoodLinkResponse = {
  integration: MarketplaceIntegrationRecord | null;
  link?: {
    userCode?: string;
    verificationUrl?: string;
    verificationUrlComplete?: string;
    expiresIn?: number;
    expiresAt?: string;
  };
};

export type IfoodTokenResponse = {
  success: boolean;
  integration: MarketplaceIntegrationRecord | null;
  token?: {
    hasAccessToken?: boolean;
    hasRefreshToken?: boolean;
    tokenType?: string;
    expiresIn?: number;
    obtainedAt?: string;
    expiresAt?: string;
  };
};

export type TestMarketplaceIntegrationResponse = {
  success: boolean;
  status: MarketplaceTestStatus;
  integration: MarketplaceIntegrationRecord | null;
  responsePreview?: Record<string, unknown>;
  error?: string;
};

export const marketplaceApi = {
  getIntegrations: async (): Promise<MarketplaceIntegrationsResponse> => {
    const { data } = await api.get("/api/marketplace-integrations");
    const availablePlatforms = Array.isArray(data?.availablePlatforms)
      ? data.availablePlatforms
          .map((item: unknown) => normalizeMarketplacePlatform(String(item || "")))
          .filter(Boolean)
      : [];
    const integrations = Array.isArray(data?.integrations)
      ? data.integrations
          .map((item: AnyRecord) => normalizeMarketplaceIntegration(item))
          .filter(Boolean)
      : [];

    return {
      availablePlatforms:
        availablePlatforms.length > 0
          ? (availablePlatforms as MarketplacePlatform[])
          : [...MARKETPLACE_PLATFORMS],
      integrations: integrations as MarketplaceIntegrationRecord[],
    };
  },

  upsertIntegration: async (
    platform: MarketplacePlatform,
    payload: UpsertMarketplaceIntegrationPayload,
  ) => {
    const { data } = await api.put(`/api/marketplace-integrations/${platform}`, payload);
    return normalizeMarketplaceIntegration((data?.integration || data) as AnyRecord);
  },

  testIntegration: async (
    platform: MarketplacePlatform,
  ): Promise<TestMarketplaceIntegrationResponse> => {
    const { data } = await api.post(`/api/marketplace-integrations/${platform}/test`);
    return {
      success: Boolean(data?.success),
      status: normalizeMarketplaceTestStatus(String(data?.status || "")),
      integration: normalizeMarketplaceIntegration((data?.integration || null) as AnyRecord),
      responsePreview:
        data?.responsePreview && typeof data.responsePreview === "object"
          ? (data.responsePreview as Record<string, unknown>)
          : undefined,
      error: ensureText(data?.error),
    };
  },

  linkIfoodIntegration: async (
    payload: IfoodLinkPayload,
  ): Promise<IfoodLinkResponse> => {
    const { data } = await api.post("/api/marketplace-integrations/IFOOD/link", payload);
    return {
      integration: normalizeMarketplaceIntegration((data?.integration || null) as AnyRecord),
      link:
        data?.link && typeof data.link === "object"
          ? {
              userCode: ensureText(data.link.userCode),
              verificationUrl: ensureText(data.link.verificationUrl),
              verificationUrlComplete: ensureText(data.link.verificationUrlComplete),
              expiresIn:
                typeof data.link.expiresIn === "number" && Number.isFinite(data.link.expiresIn)
                  ? data.link.expiresIn
                  : undefined,
              expiresAt: ensureText(data.link.expiresAt),
            }
          : undefined,
    };
  },

  exchangeIfoodCode: async (
    payload: IfoodExchangeCodePayload,
  ): Promise<IfoodTokenResponse> => {
    const { data } = await api.post(
      "/api/marketplace-integrations/IFOOD/exchange-code",
      payload,
    );
    return {
      success: Boolean(data?.success),
      integration: normalizeMarketplaceIntegration((data?.integration || null) as AnyRecord),
      token:
        data?.token && typeof data.token === "object"
          ? {
              hasAccessToken: Boolean(data.token.hasAccessToken),
              hasRefreshToken: Boolean(data.token.hasRefreshToken),
              tokenType: ensureText(data.token.tokenType),
              expiresIn:
                typeof data.token.expiresIn === "number" && Number.isFinite(data.token.expiresIn)
                  ? data.token.expiresIn
                  : undefined,
              obtainedAt: ensureText(data.token.obtainedAt),
              expiresAt: ensureText(data.token.expiresAt),
            }
          : undefined,
    };
  },

  refreshIfoodToken: async (
    payload?: IfoodRefreshTokenPayload,
  ): Promise<IfoodTokenResponse> => {
    const { data } = await api.post(
      "/api/marketplace-integrations/IFOOD/refresh-token",
      payload || {},
    );
    return {
      success: Boolean(data?.success),
      integration: normalizeMarketplaceIntegration((data?.integration || null) as AnyRecord),
      token:
        data?.token && typeof data.token === "object"
          ? {
              hasAccessToken: Boolean(data.token.hasAccessToken),
              hasRefreshToken: Boolean(data.token.hasRefreshToken),
              tokenType: ensureText(data.token.tokenType),
              expiresIn:
                typeof data.token.expiresIn === "number" && Number.isFinite(data.token.expiresIn)
                  ? data.token.expiresIn
                  : undefined,
              obtainedAt: ensureText(data.token.obtainedAt),
              expiresAt: ensureText(data.token.expiresAt),
            }
          : undefined,
    };
  },
};
