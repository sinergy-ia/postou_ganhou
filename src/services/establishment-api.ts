/* eslint-disable @typescript-eslint/no-explicit-any */

import { api, setAuthToken } from "./api";
import {
  formatCompactNumber,
  formatPercentage,
  normalizeCampaign,
  normalizeCoupon,
  normalizeDashboardCharts,
  normalizeEstablishment,
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

function normalizeCampaignPayload(payload: Record<string, any>) {
  const normalizeThreshold = (value: unknown) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    ...payload,
    type: toBackendCampaignType(payload?.type),
    baseLikesRequired: normalizeThreshold(payload?.baseLikesRequired) ?? 0,
    maxLikesRequired: normalizeThreshold(payload?.maxLikesRequired),
    badges: Array.isArray(payload?.badges) ? payload.badges.filter(Boolean) : [],
    rules: Array.isArray(payload?.rules) ? payload.rules.filter(Boolean) : [],
  };
}

export const establishmentApi = {
  login: async (credentials: { email: string; password?: string }) => {
    const { data } = await api.post<EstablishmentLoginResponse>(
      "/api/auth/establishment/login",
      credentials,
    );
    if (data.token) {
      setAuthToken(data.token, "establishment");
    }
    return {
      ...data,
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
    if (data.token) {
      setAuthToken(data.token, "establishment");
    }

    return {
      ...data,
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
    if (data.token) {
      setAuthToken(data.token, "establishment");
    }

    return {
      ...data,
      establishment: normalizeEstablishment(data?.establishment),
    };
  },

  getMe: async () => {
    const { data } = await api.get("/api/establishment/me");
    return normalizeEstablishment(data);
  },

  getMetrics: async (): Promise<Metric> => {
    const { data } = await api.get("/api/dashboard/metrics");
    return {
      activeCampaigns: Number(data?.activeCampaigns || 0),
      totalPosts: Number(data?.totalParticipations ?? data?.totalPosts ?? 0),
      pendingPosts: Number(data?.pendingParticipations ?? 0),
      couponsIssued: Number(data?.totalCoupons ?? data?.couponsIssued ?? 0),
      couponsRedeemed: Number(data?.redeemedCoupons ?? data?.couponsRedeemed ?? 0),
    };
  },

  getCharts: async (params?: { startDate?: string; endDate?: string }) => {
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
    payload?: { rewardTier?: "BASE" | "MAX"; discountEarned?: string },
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

  getAnalyticsRoi: async () => {
    const { data } = await api.get("/api/analytics/roi");
    return {
      ...data,
      roi: formatPercentage(data?.estimatedRoiPercentage),
      totalParticipations: Number(data?.totals?.participations || 0),
      totalLikes: formatCompactNumber(data?.totals?.likes),
    };
  },

  getAnalyticsConversion: async () => {
    const { data } = await api.get("/api/analytics/conversion");
    return {
      ...data,
      approvalRate: Number(data?.rates?.approvalRate || 0),
      rejectionRate: Number(data?.rates?.rejectionRate || 0),
      redemptionRate: Number(data?.rates?.redemptionRate || 0),
      rate: formatPercentage(data?.rates?.redemptionRate),
    };
  },

  getAnalyticsInsights: async () => {
    const { data } = await api.get("/api/analytics/insights");
    return {
      ...data,
      cards: Array.isArray(data?.cards) ? data.cards : [],
    };
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
    if (data.token) {
      setAuthToken(data.token, "establishment");
    }
    return {
      ...data,
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
    if (data.token) {
      setAuthToken(data.token, "establishment");
    }
    return {
      ...data,
      establishment: normalizeEstablishment(data?.establishment),
    };
  },

  resetPassword: async (payload: { token: string; password: string }) => {
    const { data } = await api.post("/api/auth/establishment/reset-password", payload);
    return data;
  },
};
