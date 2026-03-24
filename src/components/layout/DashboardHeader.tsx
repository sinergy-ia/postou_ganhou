"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearDashboardRuntimeNotifications,
  getDashboardRuntimeNotifications,
  markAllDashboardRuntimeNotificationsAsRead,
  subscribeDashboardRuntimeNotifications,
  type DashboardRuntimeNotification,
} from "@/lib/dashboard-runtime-notifications";
import {
  clearEstablishmentSelectionContext,
  establishmentApi,
  readEstablishmentSelectionContext,
  type EstablishmentLoginMembership,
  type EstablishmentSelectionContext,
} from "@/services/establishment-api";
import {
  Bell,
  ChevronDown,
  CreditCard,
  Loader2,
  LogOut,
  Menu,
  Store,
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

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    const message = response?.data?.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
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
  const [switchContext, setSwitchContext] = useState<EstablishmentSelectionContext>({
    selectionToken: "",
    memberships: [],
  });
  const [switchError, setSwitchError] = useState("");
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { data: user } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });
  const switchMembershipMutation = useMutation({
    mutationFn: establishmentApi.selectMembership,
    onMutate: () => {
      setSwitchError("");
    },
    onSuccess: () => {
      setIsUserMenuOpen(false);
      queryClient.clear();
      router.replace("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      setSwitchError(
        getErrorMessage(
          error,
          "Nao foi possivel trocar de estabelecimento. Faca login novamente para atualizar seus acessos.",
        ),
      );
    },
  });

  const userName = user?.currentUser?.name || user?.name || "Usuario";
  const currentRole = roleLabel(user?.currentUser?.role);
  const initial = userName.charAt(0).toUpperCase();
  const unreadNotificationsCount = notifications.filter((notification) => !notification.read).length;
  const currentEstablishmentId = String(user?.id || user?._id || "").trim();
  const currentTeamUserId = String(user?.currentUser?.id || "").trim();
  const canSwitchEstablishments =
    Boolean(switchContext.selectionToken) && switchContext.memberships.length > 1;

  useEffect(() => {
    setNotifications(getDashboardRuntimeNotifications());
    return subscribeDashboardRuntimeNotifications(setNotifications);
  }, []);

  useEffect(() => {
    setSwitchContext(readEstablishmentSelectionContext());
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
    clearEstablishmentSelectionContext();
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

  const handleSwitchMembership = (membership: EstablishmentLoginMembership) => {
    const isCurrentMembership =
      (currentTeamUserId && membership.teamUserId === currentTeamUserId) ||
      (currentEstablishmentId &&
        membership.establishmentId === currentEstablishmentId);

    if (!switchContext.selectionToken || isCurrentMembership) {
      return;
    }

    switchMembershipMutation.mutate({
      selectionToken: switchContext.selectionToken,
      teamUserId: membership.teamUserId,
    });
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
              <div
                className={`absolute right-0 top-full z-50 mt-2 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${
                  canSwitchEstablishments ? "w-80" : "w-52"
                }`}
              >
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
                {canSwitchEstablishments ? (
                  <div className="mb-1 border-t border-slate-100 px-1 pt-2">
                    <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Trocar estabelecimento
                    </div>
                    <div className="space-y-1">
                      {switchContext.memberships.map((membership) => {
                        const isCurrentMembership =
                          (currentTeamUserId &&
                            membership.teamUserId === currentTeamUserId) ||
                          (currentEstablishmentId &&
                            membership.establishmentId === currentEstablishmentId);
                        const isSwitchingThisMembership =
                          switchMembershipMutation.isPending &&
                          switchMembershipMutation.variables?.teamUserId ===
                            membership.teamUserId;

                        return (
                          <button
                            key={membership.teamUserId}
                            type="button"
                            onClick={() => handleSwitchMembership(membership)}
                            disabled={
                              isCurrentMembership ||
                              switchMembershipMutation.isPending
                            }
                            className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                              isCurrentMembership
                                ? "bg-slate-50 text-slate-500"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                              {isSwitchingThisMembership ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Store className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold text-slate-900">
                                  {membership.establishmentName}
                                </span>
                                {isCurrentMembership ? (
                                  <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                    Atual
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {roleLabel(membership.role)} • Plano {membership.plan}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {switchError ? (
                      <div className="px-2 pt-2 text-xs text-red-600">
                        {switchError}
                      </div>
                    ) : null}
                  </div>
                ) : null}
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
