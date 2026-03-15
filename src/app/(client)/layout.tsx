"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { clientApi } from "@/services/client-api";
import {
  Bell,
  Loader2,
  LogOut,
  Menu,
  User,
  Wallet,
  X,
} from "lucide-react";

type ClientNotification = {
  id: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["client-me"],
    queryFn: clientApi.getMe,
    retry: false,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ["client-notifications"],
    queryFn: () => clientApi.getNotifications({ limit: 5 }),
    refetchInterval: 30000,
    enabled: !!profile,
  });

  useEffect(() => {
    if (error) {
      router.push("/");
    }
  }, [error, router]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const notifications: ClientNotification[] = Array.isArray(notificationsData?.items)
    ? notificationsData.items
    : [];
  const unreadCount = notificationsData?.unreadCount ?? notifications.length;

  const handleLogout = () => {
    import("@/services/api").then(({ setAuthToken }) => {
      setAuthToken(undefined, "client");
      router.push("/");
    });
  };

  const toggleMenu = () => {
    setIsNotifOpen(false);
    setIsMenuOpen((current) => !current);
  };

  const toggleNotifications = () => {
    setIsMenuOpen(false);
    setIsNotifOpen((current) => !current);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="font-heading text-xl font-black text-primary-600">
              P,G!
            </Link>
            <span className="hidden h-6 w-px bg-slate-200 md:inline-block" />
            <nav className="hidden items-center gap-6 md:flex">
              <Link
                href="/carteira"
                className={`text-sm font-bold ${
                  pathname === "/carteira"
                    ? "text-primary-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Minha Carteira
              </Link>
              <Link
                href="/promocoes"
                className="text-sm font-bold text-slate-600 hover:text-slate-900"
              >
                Buscar Promocoes
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={toggleNotifications}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                aria-label="Abrir notificacoes"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-slate-100 bg-red-500" />
                ) : null}
              </button>

              {isNotifOpen ? (
                <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                  <div className="border-b border-slate-100 p-4 font-bold text-slate-900">
                    Notificacoes
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        Nenhuma notificacao
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`border-b border-slate-50 p-4 text-sm ${
                            !notification.read ? "bg-primary-50" : "bg-white"
                          }`}
                        >
                          <div className="mb-1 font-medium text-slate-900">
                            {notification.title}
                          </div>
                          <div className="text-slate-600">{notification.message}</div>
                          <div className="mt-2 text-xs text-slate-400">
                            {notification.createdAt
                              ? new Date(notification.createdAt).toLocaleDateString("pt-BR")
                              : ""}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <div className="text-right">
                <div className="line-clamp-1 max-w-[120px] text-sm font-bold text-slate-900">
                  {profile.name || profile.instagramHandle}
                </div>
                <div className="text-xs text-slate-500">
                  {profile.displayHandle || `@${profile.instagramHandle}`}
                </div>
              </div>
              <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-200 shadow-sm">
                <img
                  src={
                    profile.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${profile.name || profile.instagramHandle}`
                  }
                  alt="User"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 md:flex"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {isMenuOpen ? (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-30 bg-slate-950/35 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed inset-x-0 top-16 z-40 border-b border-slate-200 bg-white md:hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 p-4">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-200 shadow-sm">
                <img
                  src={
                    profile.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${profile.name || profile.instagramHandle}`
                  }
                  alt="User"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-900">
                  {profile.name || profile.instagramHandle}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {profile.displayHandle || `@${profile.instagramHandle}`}
                </div>
              </div>
            </div>
            <nav className="flex flex-col gap-2 p-4">
              <Link
                href="/carteira"
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-medium ${
                  pathname === "/carteira"
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-700"
                }`}
              >
                <Wallet className="h-5 w-5" /> Minha Carteira
              </Link>
              <Link
                href="/promocoes"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 font-medium text-slate-700"
              >
                <User className="h-5 w-5" /> Buscar Promocoes
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-medium text-red-500"
              >
                <LogOut className="h-5 w-5" /> Sair
              </button>
            </nav>
          </div>
        </>
      ) : null}

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
