import { api } from "./api";

export type SponsoredPlacement =
  | "home"
  | "listing"
  | "map"
  | "search"
  | "carousel";

export type SponsoredBillingModel = "recurring" | "one_time";

export type SponsoredCampaignStatus =
  | "scheduled"
  | "active"
  | "paused"
  | "ended"
  | "cancelled"
  | "expired"
  | "pending_payment";

export type SponsoredOrigin =
  | "inside_sales"
  | "self_service"
  | "partner"
  | "upsell";

export interface SponsoredFormat {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayLocation: SponsoredPlacement;
  maxSlots: number;
  defaultDurationDays: number;
  suggestedPrice: number;
  billingModel: SponsoredBillingModel;
  isActive: boolean;
  renderPriority: number;
  soldCampaigns?: number;
  activeCampaigns?: number;
  totalRevenue?: number;
  occupancyRate?: number;
}

export interface SponsoredCampaign {
  id: string;
  establishmentId: string;
  establishmentName: string;
  establishmentPlan: string;
  establishmentCategory: string;
  establishmentAvatarUrl: string;
  formatId: string;
  formatName: string;
  formatSlug: string;
  displayLocation: SponsoredPlacement;
  billingModel: SponsoredBillingModel;
  internalTitle: string;
  startDate: string;
  endDate: string;
  finalPrice: number;
  saleOrigin: SponsoredOrigin;
  internalNotes: string;
  manualPriority: number;
  cityRegion: string;
  category: string;
  landingPage: string;
  imageUrl: string;
  status: SponsoredCampaignStatus;
  simulatedCtr: number;
  estimatedViews: number;
  estimatedClicks: number;
  durationDays: number;
}

export interface SponsoredOverview {
  metrics: {
    monthRevenue: number;
    activeCampaigns: number;
    availableSlots: number;
    occupiedSlots: number;
    occupancyRate: number;
    upcomingExpirations: number;
  };
  revenueSeries: Array<{ month: string; revenue: number }>;
  calendar: Array<{
    date: string;
    label: string;
    activeCampaigns: number;
    occupiedSlots: number;
    campaigns: string[];
  }>;
  topEstablishments: Array<{
    establishmentId: string;
    name: string;
    plan: string;
    totalRevenue: number;
    campaigns: number;
    activeCampaigns: number;
  }>;
  topFormats: Array<{
    formatId: string;
    name: string;
    revenue: number;
    soldCount: number;
    activeCount: number;
  }>;
  occupancyByArea: Array<{
    area: SponsoredPlacement;
    label: string;
    occupiedSlots: number;
    totalSlots: number;
    occupancyRate: number;
  }>;
  expiringSoon: SponsoredCampaign[];
  recentCampaigns: SponsoredCampaign[];
}

export interface SponsoredSlotArea {
  area: SponsoredPlacement;
  label: string;
  totalSlots: number;
  occupiedSlots: number;
  availableSlots: number;
  occupancyRate: number;
  slots: Array<{
    id: string;
    slotLabel: string;
    state: "occupied" | "available";
    campaign: SponsoredCampaign | null;
  }>;
}

export interface SponsoredRules {
  prioritizeByPlan: boolean;
  regionCapEnabled: boolean;
  rotationEnabled: boolean;
  maxImpressionsPerUser: number;
  conflictStrategy: "highest_bid" | "highest_priority" | "balanced_mix";
  fallbackMode: "organic" | "house_ads" | "best_converting";
  boostPlans: string[];
  maxCampaignsPerRegion: number;
  rotationIntervalMinutes: number;
}

export interface SponsoredPreview {
  sections: Array<{
    key: string;
    label: string;
    description: string;
    desktop: Array<{
      id: string;
      slotLabel: string;
      title: string;
      establishmentName: string;
      badge: string;
      imageUrl: string;
      cta: string;
    }>;
    mobile: Array<{
      id: string;
      slotLabel: string;
      title: string;
      establishmentName: string;
      badge: string;
      imageUrl: string;
      cta: string;
    }>;
  }>;
}

export interface SponsoredReports {
  summary: {
    totalRevenue: number;
    averageTicket: number;
    ctrAverage: number;
    averageOccupancy: number;
    expiringSoon: number;
  };
  revenueByFormat: Array<{
    formatId: string;
    name: string;
    revenue: number;
    soldCount: number;
    activeCount: number;
  }>;
  revenueByPeriod: Array<{ month: string; revenue: number }>;
  ctrByFormat: Array<{ formatId: string; name: string; ctr: number }>;
  occupancyByArea: Array<{
    area: SponsoredPlacement;
    label: string;
    occupancyRate: number;
  }>;
  averageTicketByEstablishment: Array<{
    establishmentId: string;
    name: string;
    averageTicket: number;
    totalRevenue: number;
    campaigns: number;
  }>;
  topFormats: Array<{
    formatId: string;
    name: string;
    revenue: number;
    soldCount: number;
    activeCount: number;
  }>;
  campaignsExpiringSoon: SponsoredCampaign[];
}

export interface SponsoredLookups {
  establishments: Array<{
    id: string;
    name: string;
    category: string;
    plan: string;
    cityRegion: string;
    avatarUrl: string;
  }>;
  formats: SponsoredFormat[];
  regions: Array<{ value: string; label: string }>;
  categories: Array<{ value: string; label: string }>;
  origins: Array<{ value: SponsoredOrigin; label: string }>;
  landingPages: Array<{ value: string; label: string }>;
  statuses: Array<{ value: SponsoredCampaignStatus; label: string }>;
}

export interface SponsoredCampaignListResponse {
  items: SponsoredCampaign[];
  total: number;
  page: number;
  limit: number;
}

export interface SponsoredFormatPayload {
  name: string;
  slug?: string;
  description?: string;
  displayLocation: SponsoredPlacement;
  maxSlots: number;
  defaultDurationDays: number;
  suggestedPrice: number;
  billingModel: SponsoredBillingModel;
  isActive: boolean;
  renderPriority: number;
}

export interface SponsoredCampaignPayload {
  establishmentId: string;
  formatId: string;
  internalTitle: string;
  startDate: string;
  endDate: string;
  finalPrice: number;
  saleOrigin: SponsoredOrigin;
  internalNotes?: string;
  manualPriority: number;
  cityRegion: string;
  category: string;
  landingPage: string;
  imageUrl?: string;
  initialStatus: SponsoredCampaignStatus;
}

export const sponsoredHighlightsApi = {
  async getOverview() {
    const { data } = await api.get<SponsoredOverview>("/api/sponsored-highlights/overview");
    return data;
  },

  async getFormats(params?: {
    search?: string;
    placement?: string;
    active?: boolean;
  }) {
    const { data } = await api.get<SponsoredFormat[]>("/api/sponsored-highlights/formats", {
      params,
    });
    return data;
  },

  async getFormat(id: string) {
    const { data } = await api.get<SponsoredFormat>(`/api/sponsored-highlights/formats/${id}`);
    return data;
  },

  async createFormat(payload: SponsoredFormatPayload) {
    const { data } = await api.post<SponsoredFormat>("/api/sponsored-highlights/formats", payload);
    return data;
  },

  async updateFormat(id: string, payload: Partial<SponsoredFormatPayload>) {
    const { data } = await api.put<SponsoredFormat>(
      `/api/sponsored-highlights/formats/${id}`,
      payload,
    );
    return data;
  },

  async getCampaigns(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    origin?: string;
    formatId?: string;
    cityRegion?: string;
  }) {
    const { data } = await api.get<SponsoredCampaignListResponse>(
      "/api/sponsored-highlights/campaigns",
      { params },
    );
    return data;
  },

  async getPublicCampaigns() {
    try {
      const { data } = await api.get<SponsoredCampaignListResponse>(
        "/api/sponsored-highlights/campaigns",
        {
          params: {
            status: "active",
            limit: 100,
          },
        },
      );

      return Array.isArray(data?.items) ? data.items : [];
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Nao foi possivel carregar campanhas patrocinadas publicas.", error);
      }

      return [];
    }
  },

  async getCampaign(id: string) {
    const { data } = await api.get<SponsoredCampaign>(`/api/sponsored-highlights/campaigns/${id}`);
    return data;
  },

  async createCampaign(payload: SponsoredCampaignPayload) {
    const { data } = await api.post<SponsoredCampaign>(
      "/api/sponsored-highlights/campaigns",
      payload,
    );
    return data;
  },

  async updateCampaign(id: string, payload: Partial<SponsoredCampaignPayload>) {
    const { data } = await api.put<SponsoredCampaign>(
      `/api/sponsored-highlights/campaigns/${id}`,
      payload,
    );
    return data;
  },

  async activateCampaign(id: string) {
    const { data } = await api.post<SponsoredCampaign>(
      `/api/sponsored-highlights/campaigns/${id}/activate`,
    );
    return data;
  },

  async pauseCampaign(id: string) {
    const { data } = await api.post<SponsoredCampaign>(
      `/api/sponsored-highlights/campaigns/${id}/pause`,
    );
    return data;
  },

  async cancelCampaign(id: string) {
    const { data } = await api.post<SponsoredCampaign>(
      `/api/sponsored-highlights/campaigns/${id}/cancel`,
    );
    return data;
  },

  async renewCampaign(id: string) {
    const { data } = await api.post<SponsoredCampaign>(
      `/api/sponsored-highlights/campaigns/${id}/renew`,
    );
    return data;
  },

  async duplicateCampaign(id: string) {
    const { data } = await api.post<SponsoredCampaign>(
      `/api/sponsored-highlights/campaigns/${id}/duplicate`,
    );
    return data;
  },

  async getSlots() {
    const { data } = await api.get<SponsoredSlotArea[]>("/api/sponsored-highlights/slots");
    return data;
  },

  async getRules() {
    const { data } = await api.get<SponsoredRules>("/api/sponsored-highlights/rules");
    return data;
  },

  async updateRules(payload: Partial<SponsoredRules>) {
    const { data } = await api.put<SponsoredRules>("/api/sponsored-highlights/rules", payload);
    return data;
  },

  async getPreview() {
    const { data } = await api.get<SponsoredPreview>("/api/sponsored-highlights/preview");
    return data;
  },

  async getReports() {
    const { data } = await api.get<SponsoredReports>("/api/sponsored-highlights/reports");
    return data;
  },

  async getLookups() {
    const { data } = await api.get<SponsoredLookups>("/api/sponsored-highlights/lookups");
    return data;
  },
};
