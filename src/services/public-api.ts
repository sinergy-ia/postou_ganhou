/* eslint-disable @typescript-eslint/no-explicit-any */

import { api } from "./api";
import {
  normalizeCampaign,
  normalizeEstablishment,
  normalizeParticipation,
} from "./postou-ganhou-normalizers";

export interface PublicPricingPlan {
  id: string;
  type: "free" | "start" | "pro" | "scale";
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyEquivalentAnnual: number;
  yearlySavings: number;
  redemptionFee: number;
  shortDescription: string;
  benefits: string[];
  ctaLabel: string;
  ctaHref: string;
  badge?: string;
  badgeTone: "slate" | "blue" | "primary" | "emerald";
  highlightLabel?: string;
  isHighlighted: boolean;
  isActive: boolean;
  order: number;
  featureValues: Record<string, string | boolean>;
}

export interface PublicPricingPayload {
  sectionBadge: string;
  sectionTitle: string;
  sectionSubtitle: string;
  billingToggle: {
    monthlyLabel: string;
    annualLabel: string;
    annualBadge: string;
    annualHelper: string;
  };
  plans: PublicPricingPlan[];
  performanceFee: {
    title: string;
    description: string;
    items: Array<{
      planType: PublicPricingPlan["type"];
      planName: string;
      redemptionFee: number;
    }>;
  };
  comparison: {
    title: string;
    description: string;
    rows: Array<{
      key: string;
      label: string;
      kind: "boolean" | "text";
      values: Array<{
        planType: PublicPricingPlan["type"];
        planName: string;
        value: string | boolean;
      }>;
    }>;
  };
  reinforcement: {
    badge: string;
    title: string;
    description: string;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
  };
  trustPoints: string[];
}

export const publicApi = {
  getEstablishments: async (params?: {
    lat?: number;
    lng?: number;
    limit?: number;
    search?: string;
    category?: string;
  }) => {
    const { data } = await api.get("/api/public/establishments", { params });
    return Array.isArray(data)
      ? data.map((item: any) => normalizeEstablishment(item)).filter(Boolean)
      : [];
  },

  getCampaigns: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    establishmentId?: string;
    activeOnly?: boolean;
    lat?: number;
    lng?: number;
  }) => {
    const { data } = await api.get("/api/public/campaigns", { params });
    return {
      ...data,
      items: Array.isArray(data?.items)
        ? data.items.map((item: any) => normalizeCampaign(item)).filter(Boolean)
        : [],
      total: Number(data?.total || 0),
    };
  },

  getCampaignById: async (id: string) => {
    const { data } = await api.get(`/api/public/campaigns/${id}`);
    return normalizeCampaign(data);
  },

  getGallery: async (params?: {
    page?: number;
    limit?: number;
    establishmentId?: string;
    campaignId?: string;
  }) => {
    const { data } = await api.get("/api/public/gallery", { params });
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

  getPricing: async () => {
    const { data } = await api.get<PublicPricingPayload>("/api/public/pricing");
    return data;
  },
};
