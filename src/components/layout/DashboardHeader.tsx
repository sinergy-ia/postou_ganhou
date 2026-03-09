"use client";

import { useQuery } from '@tanstack/react-query';
import { establishmentApi } from '@/services/establishment-api';
import { Bell, Search } from 'lucide-react';

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
  const { data: user } = useQuery({
    queryKey: ['establishment-me'],
    queryFn: establishmentApi.getMe
  });

  const userName = user?.currentUser?.name || user?.name || 'Usuário';
  const currentRole = roleLabel(user?.currentUser?.role);
  const initial = userName.charAt(0).toUpperCase();
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex-1 flex max-w-lg">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 leading-5 text-slate-900 placeholder:text-slate-400 caret-primary-600 transition-colors focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
            placeholder="Buscar campanhas, clientes..."
          />
        </div>
      </div>

      <div className="ml-4 flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:text-slate-500 relative transition-colors">
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
          <Bell className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4 ml-2">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-slate-700">{userName}</span>
            <span className="text-xs text-slate-500">{currentRole}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
