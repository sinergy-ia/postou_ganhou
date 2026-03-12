/* eslint-disable @typescript-eslint/no-explicit-any */

import { api } from "./api";
import {
  normalizeClient,
  normalizeCoupon,
  normalizeNotification,
  normalizeParticipation,
  stripHandle,
} from "./marque-e-ganhe-normalizers";

const CLIENT_INSTAGRAM_OAUTH_STATE_KEY =
  "marque_e_ganhe_client_instagram_oauth_state";

function buildClientInstagramOAuthState() {
  if (typeof window === "undefined") {
    return "";
  }

  if (typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  window.crypto?.getRandomValues?.(bytes);

  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function readClientInstagramOAuthState() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(CLIENT_INSTAGRAM_OAUTH_STATE_KEY) || "";
}

export function clearClientInstagramOAuthState() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(CLIENT_INSTAGRAM_OAUTH_STATE_KEY);
}

function persistClientInstagramOAuthState(state: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (state) {
    window.sessionStorage.setItem(CLIENT_INSTAGRAM_OAUTH_STATE_KEY, state);
    return;
  }

  clearClientInstagramOAuthState();
}

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
    const state = buildClientInstagramOAuthState();
    persistClientInstagramOAuthState(state);

    const { data } = await api.get<{ url: string }>(
      "/api/auth/client/instagram",
      {
        params: {
          redirect: false,
          state: state || undefined,
        },
      },
    );

    return {
      ...data,
      state,
    };
  },

  instagramCallback: async (code: string, state?: string) => {
    const { data } = await api.get("/api/auth/client/callback", {
      params: { code, state },
    });

    import("./api").then(({ setAuthToken }) =>
      setAuthToken(data.token, "client"),
    );
    clearClientInstagramOAuthState();

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
