"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { establishmentApi } from '@/services/establishment-api';
import { Bell, ChevronDown, LogOut } from 'lucide-react';

function roleLabel(role?: string) {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'manager':
      return 'Manager';
    case 'viewer':
      return 'Viewer';
    default:
      return 'Logado';
  }
}

export default function DashboardHeader() {
  const router = useRouter();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { data: user } = useQuery({
    queryKey: ['establishment-me'],
    queryFn: establishmentApi.getMe
  });

  const userName = user?.currentUser?.name || user?.name || 'Usuário';
  const currentRole = roleLabel(user?.currentUser?.role);
  const initial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }

      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    import('@/services/api').then(({ setAuthToken }) => {
      setAuthToken(undefined, 'establishment');
      router.push('/login');
    });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex-1" />

      <div className="ml-4 flex items-center gap-4">
        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((current) => !current)}
            className="p-2 text-slate-400 hover:text-slate-500 relative transition-colors"
          >
            <Bell className="w-5 h-5" />
          </button>

          {isNotificationsOpen ? (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="mb-2 text-sm font-bold text-slate-900">Notificações</div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Bem-vindo ao painel. Em breve, suas notificações aparecerão aqui.
              </div>
            </div>
          ) : null}
        </div>
        
        <div ref={userMenuRef} className="relative flex items-center border-l border-slate-200 pl-4 ml-2">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((current) => !current)}
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50"
          >
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-700">{userName}</span>
              <span className="text-xs text-slate-500">{currentRole}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
              {initial}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                isUserMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isUserMenuOpen ? (
            <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
