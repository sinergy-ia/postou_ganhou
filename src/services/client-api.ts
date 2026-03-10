/* eslint-disable @typescript-eslint/no-explicit-any */

import { api } from "./api";
import {
  normalizeClient,
  normalizeCoupon,
  normalizeNotification,
  normalizeParticipation,
  stripHandle,
} from "./marque-e-ganhe-normalizers";

function normalizeClientProfile(
  record: Record<string, any> | null | undefined,
): Record<string, any> | null {
  const normalized = normalizeClient(record);

  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    instagramHandle: stripHandle(normalized.instagramHandle),
    displayHandle: normalized.instagramHandle,
  };
}

export const clientApi = {
  getInstagramLoginUrl: async () => {
    const { data } = await api.get<{ url: string }>(
      "/api/auth/client/instagram?redirect=false",
    );
    return data;
  },

  instagramCallback: async (code: string) => {
    const { data } = await api.get("/api/auth/client/callback", {
      params: { code },
    });

    import("./api").then(({ setAuthToken }) =>
      setAuthToken(data.token, "client"),
    );

    return {
      ...data,
      client: normalizeClientProfile(data?.client),
    };
  },

  getMe: async () => {
    const { data } = await api.get("/api/client/me");
    return normalizeClientProfile(data);
  },

  getWallet: async () => {
    const { data } = await api.get("/api/client/wallet");

    return {
      client: normalizeClientProfile(data?.client),
      participations: Array.isArray(data?.participations)
        ? data.participations
            .map((item: any) => normalizeParticipation(item))
            .filter(Boolean)
            .map((item: any) => ({
              ...item,
              status: String(item.status || "").toUpperCase(),
            }))
        : [],
      coupons: Array.isArray(data?.coupons)
        ? data.coupons
            .map((item: any) => normalizeCoupon(item, "upper"))
            .filter(Boolean)
        : [],
    };
  },

  getNotifications: async (params?: { limit?: number }) => {
    const { data } = await api.get("/api/client/notifications", { params });
    return {
      ...data,
      unreadCount: Number(data?.unreadCount || 0),
      items: Array.isArray(data?.items)
        ? data.items
            .map((item: any) => normalizeNotification(item))
            .filter(Boolean)
        : [],
    };
  },

  claimPost: async (payload: {
    campaignId?: string;
    establishmentId?: string;
    platformMediaId?: string;
    mediaUrl: string;
    type: string;
    caption?: string;
  }) => {
    const { data } = await api.post("/api/client/claim-post", payload);
    return data;
  },
};
