"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FeatureUpgradeNotice from '@/components/dashboard/FeatureUpgradeNotice';
import { establishmentApi } from '@/services/establishment-api';
import { Search, Filter, Download, Ticket, Ban, RefreshCw, Eye, Loader2 } from 'lucide-react';

export default function CuponsPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('Todos');
  const filters = ['Todos', 'Ativos', 'Usados', 'Expirados'];
  const [search, setSearch] = useState('');
  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ['establishment-me'],
    queryFn: establishmentApi.getMe,
  });
  const canManageCoupons = (me?.currentUser?.role || 'owner') !== 'viewer';

  const getStatus = (filter: string) => {
    switch (filter) {
      case 'Ativos': return 'ACTIVE';
      case 'Usados': return 'USED';
      case 'Expirados': return 'EXPIRED';
      default: return undefined;
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['coupons', activeFilter, search],
    queryFn: () => establishmentApi.getCoupons({ status: getStatus(activeFilter), search })
  });
  
  const coupons: Array<Record<string, any>> = data?.items || [];

  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: establishmentApi.getMetrics
  });

  const redeemMutation = useMutation({
    mutationFn: (code: string) => establishmentApi.redeemCoupon(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (code: string) => establishmentApi.cancelCoupon(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    }
  });

  if (isLoadingMe) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-3xl text-slate-900">Gerenciamento de Cupons</h1>
          <p className="text-slate-500 mt-1">Acompanhe os cupons emitidos e valide resgates reais.</p>
        </div>
        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Exportar Relatório
        </button>
      </div>

      {!canManageCoupons ? (
        <FeatureUpgradeNotice
          badge="Perfil viewer"
          title="Seu acesso nesta área é somente leitura"
          description="Você pode acompanhar os cupons do estabelecimento, mas apenas owner e manager podem resgatar ou cancelar cupons."
          ctaLabel="Entendi"
          ctaHref="/dashboard"
        />
      ) : null}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ativos', value: coupons.filter((c: any) => c.status === 'active').length || 0, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Usados (Total)', value: metrics?.couponsRedeemed || 0, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Emitido', value: metrics?.couponsIssued || 0, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'Cancelados', value: coupons.filter((c: any) => c.status === 'cancelled').length || 0, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 leading-none mb-1">{stat.value}</div>
              <div className="text-xs font-medium text-slate-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main List Area */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {filters.map(filter => (
              <button 
                key={filter} 
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 font-medium text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeFilter === filter 
                    ? 'bg-primary-50 text-primary-700 font-bold border border-primary-200 shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar código ou cliente..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 caret-primary-600 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase">
              <tr>
                <th className="px-6 py-4 font-semibold">Código</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Campanha</th>
                <th className="px-6 py-4 font-semibold">Benefício</th>
                <th className="px-6 py-4 font-semibold">Validade</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Nenhum cupom encontrado.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded border border-primary-100 uppercase tracking-wider">
                      {coupon.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{coupon.userName}</div>
                  </td>
                  <td className="px-6 py-4 max-w-[200px] truncate text-slate-600" title={coupon.campaignName}>
                    {coupon.campaignName}
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-medium">
                    {coupon.benefit}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {coupon.validUntil}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {coupon.status === 'active' && <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-full bg-green-50 text-green-700 border border-green-200">Ativo</span>}
                    {coupon.status === 'used' && <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Usado</span>}
                    {coupon.status === 'expired' && <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">Expirado</span>}
                    {coupon.status === 'cancelled' && <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-full bg-red-50 text-red-700 border border-red-200">Cancelado</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {coupon.status === 'active' && (
                        <>
                           <button 
                             disabled={redeemMutation.isPending}
                             onClick={() => redeemMutation.mutate(coupon.code)}
                             className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50" 
                             title="Marcar como usado">
                             <Ticket className="w-4 h-4" />
                           </button>
                           <button 
                             disabled={cancelMutation.isPending}
                             onClick={() => cancelMutation.mutate(coupon.code)}
                             className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50" 
                             title="Cancelar">
                             <Ban className="w-4 h-4" />
                           </button>
                        </>
                      )}
                      
                      {coupon.status === 'expired' && (
                        <button className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors" title="Reenviar/Renovar">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Ver detalhes">
                         <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
