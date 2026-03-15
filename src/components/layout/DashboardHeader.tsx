"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearDashboardRuntimeNotifications,
  getDashboardRuntimeNotifications,
  markAllDashboardRuntimeNotificationsAsRead,
  subscribeDashboardRuntimeNotifications,
  type DashboardRuntimeNotification,
} from "@/lib/dashboard-runtime-notifications";
import { establishmentApi } from "@/services/establishment-api";
import {
  Bell,
  ChevronDown,
  CreditCard,
  LogOut,
  Menu,
  Users,
} from "lucide-react";

function roleLabel(role?: string) {
  switch (role) {
    case "owner":
      return "Owner";
    case "manager":
      return "Manager";
    case "viewer":
      return "Viewer";
    default:
      return "Logado";
  }
}

type DashboardHeaderProps = {
  onOpenSidebar?: () => void;
};

export default function DashboardHeader({
  onOpenSidebar,
}: DashboardHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardRuntimeNotification[]>([]);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { data: user } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });

  const userName = user?.currentUser?.name || user?.name || "Usuario";
  const currentRole = roleLabel(user?.currentUser?.role);
  const initial = userName.charAt(0).toUpperCase();
  const unreadNotificationsCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    setNotifications(getDashboardRuntimeNotifications());
    return subscribeDashboardRuntimeNotifications(setNotifications);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }

      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    import("@/services/api").then(({ setAuthToken }) => {
      setAuthToken(undefined, "establishment");
      queryClient.clear();
      router.push("/login");
    });
  };

  const handleOpenTeam = () => {
    setIsUserMenuOpen(false);
    router.push("/dashboard/configuracoes?section=team");
  };

  const handleOpenBilling = () => {
    setIsNotificationsOpen(false);
    setIsUserMenuOpen(false);
    router.push("/dashboard/configuracoes?section=billing");
  };

  const handleOpenNotificationCenter = () => {
    setIsNotificationsOpen((current) => {
      const nextOpenState = !current;

      if (nextOpenState) {
        markAllDashboardRuntimeNotificationsAsRead();
      }

      return nextOpenState;
    });
  };

  const handleNotificationClick = (href?: string) => {
    setIsNotificationsOpen(false);

    if (href) {
      router.push(href);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Abrir menu lateral"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Painel</div>
            <div className="hidden truncate text-xs text-slate-500 sm:block">
              Acompanhe campanhas, cupons e desempenho da operacao.
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleOpenBilling}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-500"
            aria-label="Abrir faturamento"
            title="Faturamento"
          >
            <CreditCard className="h-5 w-5" />
          </button>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={handleOpenNotificationCenter}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-500"
              aria-label="Abrir notificacoes"
            >
              <Bell className="h-5 w-5" />
              {unreadNotificationsCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                  {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                </span>
              ) : null}
            </button>

            {isNotificationsOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Notificacoes</div>
                    <div className="text-xs text-slate-500">
                      {notifications.length > 0
                        ? `${notifications.length} atualizacoes recentes`
                        : "Sem atualizacoes recentes"}
                    </div>
                  </div>
                  {notifications.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearDashboardRuntimeNotifications}
                      className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700"
                    >
                      Limpar
                    </button>
                  ) : null}
                </div>

                {notifications.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Bem-vindo ao painel. As atualizacoes importantes aparecerao aqui.
                  </div>
                ) : (
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification.href)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                          notification.read
                            ? "border-slate-200 bg-white hover:bg-slate-50"
                            : "border-primary-100 bg-primary-50 hover:bg-primary-100/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">
                              {notification.title}
                            </div>
                            <div className="mt-1 text-xs leading-relaxed text-slate-600">
                              {notification.message}
                            </div>
                          </div>
                          <div className="shrink-0 text-[11px] text-slate-400">
                            {notification.createdAt
                              ? new Date(notification.createdAt).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((current) => !current)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50 sm:gap-3"
            >
              <div className="hidden min-w-0 text-right sm:block">
                <span className="block truncate text-sm font-medium text-slate-700">
                  {userName}
                </span>
                <span className="block text-xs text-slate-500">{currentRole}</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 font-medium text-primary-700">
                {initial}
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  isUserMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isUserMenuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="rounded-xl px-3 py-2 sm:hidden">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {userName}
                  </div>
                  <div className="text-xs text-slate-500">{currentRole}</div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenTeam}
                  className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Users className="h-4 w-4" />
                  Equipe
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
