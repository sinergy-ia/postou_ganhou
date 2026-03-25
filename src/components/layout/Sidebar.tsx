"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { clsx, type ClassValue } from "clsx";
import {
  BarChart3,
  ChevronRight,
  Image as ImageIcon,
  Megaphone,
  Settings,
  Sparkles,
  Star,
  Store,
  Ticket,
  X,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import {
  dashboardConfigSections,
  isDashboardConfigSectionId,
} from "@/lib/dashboard-config-sections";
import {
  aiPostsSections,
  isAiPostsSectionId,
} from "@/lib/ai-posts-sections";
import { establishmentApi } from "@/services/establishment-api";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function canUseAiPosts(planType?: string) {
  return planType === "pro" || planType === "scale";
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Campanhas", href: "/dashboard/campanhas", icon: Megaphone },
  { name: "Postagens", href: "/dashboard/postagens", icon: ImageIcon },
  { name: "Cupons", href: "/dashboard/cupons", icon: Ticket },
  {
    name: "Destaques",
    href: "/dashboard/destaques-patrocinados",
    icon: Star,
    superAdminOnly: true,
  },
  {
    name: "Publicacoes IA",
    href: "/dashboard/publicacoes-ia",
    icon: Sparkles,
    proScaleOnly: true,
  },
  {
    name: "Resultados",
    href: "/dashboard/resultados",
    icon: BarChart3,
    requiredFeature: "advancedAnalytics",
  },
  { name: "Configuracoes", href: "/dashboard/configuracoes", icon: Settings },
];

const sidebarConfigSections = dashboardConfigSections;

type SidebarProps = {
  isMobileOpen?: boolean;
  onClose?: () => void;
};

export default function Sidebar({
  isMobileOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isConfigRoute =
    pathname === "/dashboard/configuracoes" ||
    pathname.startsWith("/dashboard/configuracoes/");
  const isAiPostsRoute =
    pathname === "/dashboard/publicacoes-ia" ||
    pathname.startsWith("/dashboard/publicacoes-ia/");
  const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(isConfigRoute);
  const [isAiPostsMenuOpen, setIsAiPostsMenuOpen] = useState(isAiPostsRoute);

  useEffect(() => {
    setIsConfigMenuOpen(isConfigRoute);
  }, [isConfigRoute]);

  useEffect(() => {
    setIsAiPostsMenuOpen(isAiPostsRoute);
  }, [isAiPostsRoute]);

  const { data: user } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });

  const establishmentName = user?.name || "Estabelecimento";
  const currentUserName = user?.currentUser?.name || establishmentName;
  const currentUserRole = user?.currentUser?.role || "owner";
  const isSuperAdmin = Boolean(user?.superAdmin || user?.currentUser?.superAdmin);
  const planName = user?.plan || "Free";
  const planType = user?.planAccess?.planType || "free";
  const hasAiPostsPlan = canUseAiPosts(planType);
  const canAccessAiPosts = isSuperAdmin;
  const visibleNavigation = navigation.filter((item) => {
    if (item.superAdminOnly) {
      return isSuperAdmin;
    }

    if (!item.requiredFeature) {
      return true;
    }

    return Boolean(user?.planAccess?.features?.[item.requiredFeature]);
  });
  const activeConfigSection = isDashboardConfigSectionId(searchParams.get("section"))
    ? searchParams.get("section")
    : "profile";
  const configHref = `/dashboard/configuracoes?section=${activeConfigSection}`;
  const activeAiPostsSection = isAiPostsSectionId(searchParams.get("section"))
    ? searchParams.get("section")
    : "generate";
  const aiPostsHref = `/dashboard/publicacoes-ia?section=${activeAiPostsSection}`;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[86vw] flex-col overflow-hidden border-r border-slate-800 bg-slate-900 text-slate-300 shadow-2xl transition-transform duration-300 lg:z-40 lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5 lg:px-6">
        <span className="truncate font-heading text-xl font-bold text-white">
          Marque &amp; Ganhe
        </span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Fechar menu lateral"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="dashboard-sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden py-4 pr-2">
        <nav className="space-y-1 px-3">
          {visibleNavigation.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isAiPostsComingSoon =
              item.href === "/dashboard/publicacoes-ia" && !canAccessAiPosts;
            const isPlanLocked = Boolean(
              item.proScaleOnly && !hasAiPostsPlan && !canAccessAiPosts,
            );
            const shouldShowConfigSubmenu =
              item.href === "/dashboard/configuracoes" && isConfigMenuOpen;

            if (item.href === "/dashboard/configuracoes") {
              return (
                <div key={item.name}>
                  <Link
                    href={configHref}
                    onClick={(event) => {
                      if (isConfigRoute) {
                        event.preventDefault();
                        setIsConfigMenuOpen((currentState) => !currentState);
                        return;
                      }

                      setIsConfigMenuOpen(true);
                      onClose?.();
                    }}
                    className={cn(
                      isActive
                        ? "bg-primary-600 text-white"
                        : "hover:bg-slate-800 hover:text-white",
                      "group flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    )}
                    aria-expanded={shouldShowConfigSubmenu}
                  >
                    <span className="flex min-w-0 items-center">
                      <item.icon
                        className={cn(
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white",
                          "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <ChevronRight
                      className={cn(
                        isActive ? "text-white/85" : "text-slate-400 group-hover:text-white",
                        "h-4 w-4 shrink-0 transition-transform",
                        shouldShowConfigSubmenu ? "rotate-90" : "",
                      )}
                      aria-hidden="true"
                    />
                  </Link>

                  {shouldShowConfigSubmenu ? (
                    <div className="ml-5 mt-2 overflow-hidden border-l border-slate-800 pl-3">
                      <div className="space-y-1">
                        {sidebarConfigSections.map((section) => {
                          const isSectionActive = activeConfigSection === section.id;

                          return (
                            <Link
                              key={section.id}
                              href={`/dashboard/configuracoes?section=${section.id}`}
                              onClick={() => onClose?.()}
                              className={cn(
                                isSectionActive
                                  ? "bg-slate-800 text-white"
                                  : "text-slate-400 hover:bg-slate-800/80 hover:text-white",
                                "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate">{section.label}</span>
                              {!section.available ? (
                                <span className="shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                  Em breve
                                </span>
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            }

            if (item.href === "/dashboard/publicacoes-ia") {
              const shouldShowAiPostsSubmenu = canAccessAiPosts && isAiPostsMenuOpen;

              return (
                <div key={item.name}>
                  <Link
                    href={aiPostsHref}
                    onClick={(event) => {
                      if (!canAccessAiPosts) {
                        event.preventDefault();
                        onClose?.();
                        return;
                      }

                      if (isAiPostsRoute) {
                        event.preventDefault();
                        setIsAiPostsMenuOpen((currentState) => !currentState);
                        return;
                      }

                      setIsAiPostsMenuOpen(true);
                      onClose?.();
                    }}
                    className={cn(
                      isActive
                        ? "bg-primary-600 text-white"
                        : "hover:bg-slate-800 hover:text-white",
                      isPlanLocked && !isActive ? "text-slate-400" : "",
                      "group flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    )}
                    aria-expanded={shouldShowAiPostsSubmenu}
                  >
                    <span className="flex min-w-0 items-center">
                      <item.icon
                        className={cn(
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white",
                          "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {isAiPostsComingSoon ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            isActive ? "bg-white/15 text-white" : "bg-slate-800 text-slate-400",
                          )}
                        >
                          Em breve
                        </span>
                      ) : null}
                      {isPlanLocked ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            isActive ? "bg-white/15 text-white" : "bg-slate-800 text-slate-400",
                          )}
                        >
                          Pro/Scale
                        </span>
                      ) : null}
                      <ChevronRight
                        className={cn(
                          isActive ? "text-white/85" : "text-slate-400 group-hover:text-white",
                          "h-4 w-4 shrink-0 transition-transform",
                          shouldShowAiPostsSubmenu ? "rotate-90" : "",
                        )}
                        aria-hidden="true"
                      />
                    </div>
                  </Link>

                  {shouldShowAiPostsSubmenu ? (
                    <div className="ml-5 mt-2 overflow-hidden border-l border-slate-800 pl-3">
                      <div className="space-y-1">
                        {aiPostsSections.map((section) => {
                          const isSectionActive = activeAiPostsSection === section.id;

                          return (
                            <Link
                              key={section.id}
                              href={`/dashboard/publicacoes-ia?section=${section.id}`}
                              onClick={() => onClose?.()}
                              className={cn(
                                isSectionActive
                                  ? "bg-slate-800 text-white"
                                  : "text-slate-400 hover:bg-slate-800/80 hover:text-white",
                                "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate">{section.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <div key={item.name}>
                <Link
                  href={item.href}
                  onClick={() => onClose?.()}
                  className={cn(
                    isActive ? "bg-primary-600 text-white" : "hover:bg-slate-800 hover:text-white",
                    isPlanLocked && !isActive ? "text-slate-400" : "",
                    "group flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  )}
                >
                  <span className="flex min-w-0 items-center">
                    <item.icon
                      className={cn(
                        isActive ? "text-white" : "text-slate-400 group-hover:text-white",
                        "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  {isPlanLocked ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        isActive ? "bg-white/15 text-white" : "bg-slate-800 text-slate-400",
                      )}
                    >
                      Pro/Scale
                    </span>
                  ) : null}
                </Link>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-slate-800 p-2">
            <Store className="h-5 w-5 text-primary-400" />
          </div>
          <div className="min-w-0 flex flex-col">
            <span
              className="line-clamp-1 text-sm font-medium text-white"
              title={currentUserName}
            >
              {currentUserName}
            </span>
            <span className="truncate text-xs text-slate-500">
              {currentUserRole} • {planName}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
