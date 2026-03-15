"use client";

export type DashboardRuntimeNotificationType = "success" | "error" | "info";

export type DashboardRuntimeNotification = {
  id: string;
  type: DashboardRuntimeNotificationType;
  title: string;
  message: string;
  createdAt: string;
  href?: string;
  read: boolean;
};

const STORAGE_KEY = "dashboard_runtime_notifications_v1";
const EVENT_NAME = "dashboard-runtime-notifications:changed";
const MAX_NOTIFICATIONS = 20;

function normalizeNotification(
  value: Partial<DashboardRuntimeNotification> | null | undefined,
): DashboardRuntimeNotification | null {
  if (!value) {
    return null;
  }

  const title = String(value.title || "").trim();
  const message = String(value.message || "").trim();

  if (!title || !message) {
    return null;
  }

  return {
    id: String(value.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    type:
      value.type === "success" || value.type === "error" || value.type === "info"
        ? value.type
        : "info",
    title,
    message,
    createdAt: String(value.createdAt || new Date().toISOString()),
    href: String(value.href || "").trim() || undefined,
    read: Boolean(value.read),
  };
}

function dispatchNotificationsChangeEvent() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(EVENT_NAME));
}

export function getDashboardRuntimeNotifications() {
  if (typeof window === "undefined") {
    return [] as DashboardRuntimeNotification[];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeNotification(item))
      .filter(Boolean)
      .slice(0, MAX_NOTIFICATIONS) as DashboardRuntimeNotification[];
  } catch {
    return [];
  }
}

function setDashboardRuntimeNotifications(
  notifications: DashboardRuntimeNotification[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)),
  );
  dispatchNotificationsChangeEvent();
}

export function addDashboardRuntimeNotification(
  notification: Omit<DashboardRuntimeNotification, "id" | "createdAt" | "read"> & {
    id?: string;
    createdAt?: string;
    read?: boolean;
  },
) {
  const nextNotification = normalizeNotification(notification);

  if (!nextNotification) {
    return null;
  }

  const notifications = getDashboardRuntimeNotifications();
  setDashboardRuntimeNotifications([nextNotification, ...notifications]);
  return nextNotification;
}

export function markAllDashboardRuntimeNotificationsAsRead() {
  const notifications = getDashboardRuntimeNotifications();

  if (notifications.length === 0) {
    return;
  }

  setDashboardRuntimeNotifications(
    notifications.map((notification) => ({
      ...notification,
      read: true,
    })),
  );
}

export function clearDashboardRuntimeNotifications() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  dispatchNotificationsChangeEvent();
}

export function subscribeDashboardRuntimeNotifications(
  listener: (notifications: DashboardRuntimeNotification[]) => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => {
    listener(getDashboardRuntimeNotifications());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    handleChange();
  };

  window.addEventListener(EVENT_NAME, handleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}
