import axios from "axios";
import Cookies from "js-cookie";

export type AuthTokenType = "establishment" | "client";

const TOKEN_COOKIE_KEY: Record<AuthTokenType, string> = {
  establishment: "establishment_token",
  client: "client_token",
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
});

function normalizeApiPath(url?: string) {
  if (!url) {
    return "";
  }

  try {
    return new URL(url, api.defaults.baseURL).pathname;
  } catch {
    return url;
  }
}

function resolveTokenType(url?: string): AuthTokenType | null {
  const path = normalizeApiPath(url);

  if (
    !path.startsWith("/api") ||
    path.startsWith("/api/public") ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/api/webhooks")
  ) {
    return null;
  }

  if (path.startsWith("/api/client")) {
    return "client";
  }

  return "establishment";
}

api.interceptors.request.use((config) => {
  const tokenType = resolveTokenType(config.url);
  const headers = (config.headers ?? {}) as Record<string, string>;

  if (!tokenType) {
    delete headers.Authorization;
    config.headers = headers;
    return config;
  }

  const token = Cookies.get(TOKEN_COOKIE_KEY[tokenType]);

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    delete headers.Authorization;
  }

  config.headers = headers;
  return config;
});

export function setAuthToken(
  token?: string,
  type: AuthTokenType = "establishment",
) {
  const cookieKey = TOKEN_COOKIE_KEY[type];

  if (token) {
    Cookies.set(cookieKey, token, { expires: 7 });
    return;
  }

  Cookies.remove(cookieKey);
}

export function getAuthToken(type: AuthTokenType = "establishment") {
  return Cookies.get(TOKEN_COOKIE_KEY[type]);
}
