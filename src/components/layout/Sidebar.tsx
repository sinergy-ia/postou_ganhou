"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { establishmentApi } from '@/services/establishment-api';
import { 
  BarChart3, 
  Megaphone, 
  Image as ImageIcon, 
  Sparkles,
  Star,
  Ticket, 
  Settings,
  Store
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function canUseAiPosts(planType?: string) {
  return planType === "pro" || planType === "scale";
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Campanhas', href: '/dashboard/campanhas', icon: Megaphone },
  { name: 'Postagens', href: '/dashboard/postagens', icon: ImageIcon },
  { name: 'Cupons', href: '/dashboard/cupons', icon: Ticket },
  { name: 'Destaques', href: '/dashboard/destaques-patrocinados', icon: Star, superAdminOnly: true },
  { name: 'Publicações IA', href: '/dashboard/publicacoes-ia', icon: Sparkles, proScaleOnly: true },
  { name: 'Resultados', href: '/dashboard/resultados', icon: BarChart3, requiredFeature: 'advancedAnalytics' }, // Using BarChart3 again or LineChart
  { name: 'Configurações', href: '/dashboard/configuracoes', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  const { data: user } = useQuery({
    queryKey: ['establishment-me'],
    queryFn: establishmentApi.getMe
  });

  const establishmentName = user?.name || 'Estabelecimento';
  const currentUserName = user?.currentUser?.name || establishmentName;
  const currentUserRole = user?.currentUser?.role || 'owner';
  const isSuperAdmin = Boolean(user?.superAdmin || user?.currentUser?.superAdmin);
  const planName = user?.plan || 'Free';
  const planType = user?.planAccess?.planType || "free";
  const hasAiPostsPlan = canUseAiPosts(planType);
  const visibleNavigation = navigation.filter((item) => {
    if (item.superAdminOnly) {
      return isSuperAdmin;
    }

    if (!item.requiredFeature) {
      return true;
    }

    return Boolean(user?.planAccess?.features?.[item.requiredFeature]);
  });

  return (
    <div className="flex flex-col w-64 bg-slate-900 text-slate-300 h-screen fixed top-0 left-0 border-r border-slate-800">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <span className="font-heading font-bold text-xl text-white">Marque &amp; Ganhe</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {visibleNavigation.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isPlanLocked = Boolean(item.proScaleOnly && !hasAiPostsPlan);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive ? 'bg-primary-600 text-white' : 'hover:bg-slate-800 hover:text-white',
                  isPlanLocked && !isActive ? 'text-slate-400' : '',
                  'group flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors'
                )}
              >
                <span className="flex min-w-0 items-center">
                  <item.icon
                    className={cn(
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white',
                      'mr-3 flex-shrink-0 h-5 w-5 transition-colors'
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                {isPlanLocked ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      isActive
                        ? "bg-white/15 text-white"
                        : "bg-slate-800 text-slate-400"
                    )}
                  >
                    Pro/Scale
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2 rounded-full">
            <Store className="w-5 h-5 text-primary-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white line-clamp-1" title={currentUserName}>{currentUserName}</span>
            <span className="text-xs text-slate-500">{currentUserRole} • {planName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
