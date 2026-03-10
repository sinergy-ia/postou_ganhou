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
  Ticket, 
  Settings,
  Store
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Destaques', href: '/dashboard/destaques-patrocinados', icon: Sparkles, superAdminOnly: true },
  { name: 'Campanhas', href: '/dashboard/campanhas', icon: Megaphone },
  { name: 'Postagens', href: '/dashboard/postagens', icon: ImageIcon },
  { name: 'Cupons', href: '/dashboard/cupons', icon: Ticket },
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
        <span className="font-heading font-bold text-xl text-white">Postou, Ganhou</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {visibleNavigation.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive ? 'bg-primary-600 text-white' : 'hover:bg-slate-800 hover:text-white',
                  'group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white',
                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors'
                  )}
                  aria-hidden="true"
                />
                {item.name}
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
