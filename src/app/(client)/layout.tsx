"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { clientApi } from '@/services/client-api';
import { Bell, User, Wallet, LogOut, Menu, X, Loader2 } from 'lucide-react';

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
    queryKey: ['client-me'],
    queryFn: clientApi.getMe,
    retry: false,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['client-notifications'],
    queryFn: () => clientApi.getNotifications({ limit: 5 }),
    refetchInterval: 30000, // Poll every 30s
    enabled: !!profile,
  });

  useEffect(() => {
    if (error) {
      // Redirect to home or logic page
      router.push('/');
    }
  }, [error, router]);

  const notifications: ClientNotification[] = Array.isArray(notificationsData?.items)
    ? notificationsData.items
    : [];
  const unreadCount = notificationsData?.unreadCount ?? notifications.length;

  const handleLogout = () => {
    import('@/services/api').then(({ setAuthToken }) => {
      setAuthToken(undefined, 'client');
      router.push('/');
    });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  // If no profile yet, don't flash content (redirect will happen)
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-heading font-black text-xl text-primary-600">
              P,G!
            </Link>
            <span className="hidden md:inline-block w-px h-6 bg-slate-200" />
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/carteira" className={`text-sm font-bold ${pathname === '/carteira' ? 'text-primary-600' : 'text-slate-600 hover:text-slate-900'}`}>Minha Carteira</Link>
              <Link href="/promocoes" className="text-sm font-bold text-slate-600 hover:text-slate-900">Buscar Promoções</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Desktop Notifications */}
            <div className="relative hidden md:block">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-100" />
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 font-bold text-slate-900">Notificações</div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">Nenhuma notificação</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-4 border-b border-slate-50 text-sm ${!n.read ? 'bg-primary-50' : 'bg-white'}`}>
                          <div className="font-medium text-slate-900 mb-1">{n.title}</div>
                          <div className="text-slate-600">{n.message}</div>
                          <div className="text-xs text-slate-400 mt-2">
                            {n.createdAt ? new Date(n.createdAt).toLocaleDateString('pt-BR') : ''}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <div className="font-bold text-sm text-slate-900 line-clamp-1 max-w-[120px]">{profile.name || profile.instagramHandle}</div>
                <div className="text-xs text-slate-500">{profile.displayHandle || `@${profile.instagramHandle}`}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shadow-sm">
                <img src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.name || profile.instagramHandle}`} alt="User" />
              </div>
            </div>

            <button onClick={handleLogout} className="hidden md:flex w-10 h-10 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6 text-slate-600" /> : <Menu className="w-6 h-6 text-slate-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200">
          <div className="p-4 flex items-center gap-3 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shadow-sm">
              <img src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.name || profile.instagramHandle}`} alt="User" />
            </div>
            <div>
              <div className="font-bold text-slate-900">{profile.name || profile.instagramHandle}</div>
              <div className="text-xs text-slate-500">{profile.displayHandle || `@${profile.instagramHandle}`}</div>
            </div>
          </div>
          <nav className="flex flex-col p-4 space-y-4">
            <Link href="/carteira" onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-3 font-medium ${pathname === '/carteira' ? 'text-primary-600' : 'text-slate-700'}`}>
              <Wallet className="w-5 h-5" /> Minha Carteira
            </Link>
            <Link href="/promocoes" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 font-medium text-slate-700">
              <User className="w-5 h-5" /> Buscar Promoções
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-3 font-medium text-red-500 text-left w-full">
              <LogOut className="w-5 h-5" /> Sair
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
