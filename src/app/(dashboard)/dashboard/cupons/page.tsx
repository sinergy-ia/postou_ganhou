"use client";

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PaginationControls from '@/components/dashboard/PaginationControls';
import FeatureUpgradeNotice from '@/components/dashboard/FeatureUpgradeNotice';
import { downloadCsvFile } from '@/lib/csv';
import { establishmentApi } from '@/services/establishment-api';
import {
  MARKETPLACE_PLATFORMS,
  normalizeExternalSyncStatus,
  normalizeMarketplacePlatform,
  type MarketplacePlatform,
} from '@/services/marketplace-api';
import { Search, Filter, Download, Ticket, Ban, RefreshCw, Eye, Loader2, X } from 'lucide-react';

interface CouponDetails {
  id: string;
  code: string;
  participationId?: string;
  participationIds?: string[];
  userName?: string;
  campaignName?: string;
  benefit?: string;
  validUntil?: string;
  status?: 'active' | 'used' | 'expired' | 'cancelled' | string;
  usedAt?: string | null;
  createdAt?: string | null;
  client?: {
    id?: string;
    instagramHandle?: string;
  } | null;
  participation?: {
    id?: string;
    userHandle?: string;
  } | null;
  externalPlatform?: string;
  externalCouponId?: string;
  externalCouponCode?: string;
  externalSyncStatus?: string;
  externalSyncError?: string;
  externalSyncedAt?: string | null;
}

const PAGE_SIZE = 20;
const BULK_FETCH_LIMIT = 100;

type ManualSyncResult = {
  status: 'SUCCESS' | 'FAILED';
  message: string;
  at: string;
};

export default function CuponsPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('Todos');
  const filters = ['Todos', 'Ativos', 'Usados', 'Expirados'];
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCoupon, setSelectedCoupon] = useState<CouponDetails | null>(null);
  const [syncTargetByCoupon, setSyncTargetByCoupon] = useState<Record<string, MarketplacePlatform>>({});
  const [bulkSyncPlatform, setBulkSyncPlatform] = useState<MarketplacePlatform>('NUVEMSHOP');
  const [syncFeedback, setSyncFeedback] = useState('');
  const [manualSyncResultByCoupon, setManualSyncResultByCoupon] = useState<Record<string, ManualSyncResult>>({});
  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ['establishment-me'],
    queryFn: establishmentApi.getMe,
  });
  const canManageCoupons = (me?.currentUser?.role || 'owner') !== 'viewer';
  const canExportAdvanced = Boolean(me?.planAccess?.features?.advancedExports);

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return 'Nao informado';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Nao informado' : date.toLocaleString('pt-BR');
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as { response?: unknown }).response === 'object'
    ) {
      const response = (error as { response?: { data?: { message?: unknown } } }).response;
      const message = response?.data?.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  };

  const getParticipationIds = (coupon: CouponDetails) => {
    if (Array.isArray(coupon.participationIds) && coupon.participationIds.length > 0) {
      return coupon.participationIds.filter(Boolean);
    }

    const fallbackId = coupon.participationId || coupon.participation?.id;
    return fallbackId ? [fallbackId] : [];
  };

  const getStatus = (filter: string) => {
    switch (filter) {
      case 'Ativos': return 'ACTIVE';
      case 'Usados': return 'USED';
      case 'Expirados': return 'EXPIRED';
      default: return undefined;
    }
  };

  const formatExternalSyncStatusLabel = (value?: string) => {
    if (!value) {
      return 'Nao informado';
    }

    const normalized = normalizeExternalSyncStatus(value);

    switch (normalized) {
      case 'SYNCED':
        return 'Sincronizado';
      case 'FAILED':
        return 'Falhou';
      case 'SKIPPED':
        return 'Ignorado';
      case 'UNSUPPORTED':
        return 'Nao suportado';
      case 'PENDING':
      default:
        return 'Pendente';
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['coupons', activeFilter, search, page],
    queryFn: () =>
      establishmentApi.getCoupons({
        page,
        limit: PAGE_SIZE,
        status: getStatus(activeFilter),
        search,
      })
  });
  
  const coupons: CouponDetails[] = data?.items || [];

  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => establishmentApi.getMetrics(),
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

  const syncExternalMutation = useMutation({
    mutationFn: async (coupon: CouponDetails) => {
      const targetPlatform =
        syncTargetByCoupon[coupon.code] ||
        (normalizeMarketplacePlatform(coupon.externalPlatform) as MarketplacePlatform) ||
        'NUVEMSHOP';
      await syncCouponNow(coupon, targetPlatform);
      return {
        code: coupon.code,
        targetPlatform,
      };
    },
    onSuccess: (result) => {
      setSyncFeedback('Sincronizacao externa solicitada com sucesso.');
      setManualSyncResultByCoupon((current) => ({
        ...current,
        [result.code]: {
          status: 'SUCCESS',
          message: `Sincronizado em ${result.targetPlatform}`,
          at: new Date().toISOString(),
        },
      }));
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (error, coupon) => {
      const message = getErrorMessage(error, 'Nao foi possivel sincronizar o cupom externamente.');
      setSyncFeedback(message);
      setManualSyncResultByCoupon((current) => ({
        ...current,
        [coupon.code]: {
          status: 'FAILED',
          message,
          at: new Date().toISOString(),
        },
      }));
    },
  });

  const syncCouponNow = async (
    coupon: CouponDetails,
    targetPlatform: MarketplacePlatform,
  ) => {
    const participationId = coupon.participationId || coupon.participation?.id;
    try {
      return await establishmentApi.syncCouponExternal(coupon.code, {
        externalPlatform: targetPlatform,
        participationId,
      });
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404 && participationId) {
        return establishmentApi.approveParticipation(participationId, {
          syncExternalCoupon: true,
          externalPlatform: targetPlatform,
        });
      }
      throw error;
    }
  };

  const bulkSyncMutation = useMutation({
    mutationFn: async () => {
      const allFilteredCoupons: CouponDetails[] = [];
      let fetchPage = 1;
      let total = 0;

      do {
        const response = await establishmentApi.getCoupons({
          page: fetchPage,
          limit: BULK_FETCH_LIMIT,
          status: getStatus(activeFilter),
          search,
        });
        const pageItems = Array.isArray(response?.items)
          ? (response.items as CouponDetails[])
          : [];
        total = Number(response?.total || 0);
        allFilteredCoupons.push(...pageItems);
        fetchPage += 1;
      } while (allFilteredCoupons.length < total);

      const eligibleCoupons = allFilteredCoupons.filter((coupon) => coupon.status === 'active');
      if (eligibleCoupons.length === 0) {
        throw new Error('Nao ha cupons ativos para sincronizar.');
      }

      let successCount = 0;
      let errorCount = 0;
      const results: Record<string, ManualSyncResult> = {};

      for (const coupon of eligibleCoupons) {
        try {
          await syncCouponNow(coupon, bulkSyncPlatform);
          successCount += 1;
          results[coupon.code] = {
            status: 'SUCCESS',
            message: `Sincronizado em ${bulkSyncPlatform}`,
            at: new Date().toISOString(),
          };
        } catch (error) {
          errorCount += 1;
          results[coupon.code] = {
            status: 'FAILED',
            message: getErrorMessage(error, 'Falha na sincronizacao'),
            at: new Date().toISOString(),
          };
        }
      }

      return { successCount, errorCount, total: eligibleCoupons.length, results };
    },
    onSuccess: (result) => {
      setSyncFeedback(
        `Sincronizacao em lote concluida: ${result.successCount}/${result.total} com sucesso` +
          (result.errorCount > 0 ? ` (${result.errorCount} falharam).` : '.'),
      );
      setManualSyncResultByCoupon((current) => ({
        ...current,
        ...result.results,
      }));
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (error) => {
      setSyncFeedback(getErrorMessage(error, 'Nao foi possivel sincronizar os cupons em lote.'));
    },
  });

  const closeSelectedCouponModal = () => {
    setSelectedCoupon(null);
    setSyncFeedback('');
  };

  useEffect(() => {
    if (!selectedCoupon) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedCoupon(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [selectedCoupon]);

  const handleExportCoupons = () => {
    downloadCsvFile(
      'cupons.csv',
      ['Codigo', 'Cliente', 'Campanha', 'Beneficio', 'Validade', 'Status'],
      coupons.map((coupon) => [
        coupon.code,
        coupon.userName,
        coupon.campaignName,
        coupon.benefit,
        coupon.validUntil,
        coupon.status,
      ]),
    );
  };

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
          <p className="text-slate-500 mt-1">Acompanhe os cupons emitidos, inclusive cupons acumulados por cliente, e valide resgates reais.</p>
        </div>
        <button
          type="button"
          onClick={handleExportCoupons}
          disabled={!canExportAdvanced || coupons.length === 0}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
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

      {canManageCoupons && !canExportAdvanced ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
          Exportações avançadas em CSV ficam disponíveis no plano Scale White Label.
        </div>
      ) : null}

      {syncFeedback ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
          {syncFeedback}
        </div>
      ) : null}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ativos', value: coupons.filter((coupon) => coupon.status === 'active').length || 0, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Usados (Total)', value: metrics?.couponsRedeemed || 0, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Emitido', value: metrics?.couponsIssued || 0, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'Cancelados', value: coupons.filter((coupon) => coupon.status === 'cancelled').length || 0, color: 'text-red-600', bg: 'bg-red-50' },
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
                onClick={() => {
                  setActiveFilter(filter);
                  setPage(1);
                }}
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
            {canManageCoupons ? (
              <>
                <select
                  value={bulkSyncPlatform}
                  onChange={(event) => setBulkSyncPlatform(event.target.value as MarketplacePlatform)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {MARKETPLACE_PLATFORMS.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={bulkSyncMutation.isPending || coupons.length === 0}
                  onClick={() => bulkSyncMutation.mutate()}
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Ativar sincronizacao para todos os cupons ativos da lista atual"
                >
                  {bulkSyncMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Ativar todos
                </button>
              </>
            ) : null}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar código ou cliente..." 
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
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
                <th className="px-6 py-4 font-semibold text-center">Ativação</th>
                <th className="px-6 py-4 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
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
                    <div>{coupon.benefit}</div>
                    {coupon.externalPlatform ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Marketplace: {normalizeMarketplacePlatform(coupon.externalPlatform) || coupon.externalPlatform}
                      </div>
                    ) : null}
                    {getParticipationIds(coupon).length > 1 ? (
                      <div className="mt-1 text-xs font-semibold text-primary-600">
                        {getParticipationIds(coupon).length} participacoes acumuladas
                      </div>
                    ) : null}
                    {coupon.externalSyncStatus ? (
                      <div className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                        Sync: {formatExternalSyncStatusLabel(coupon.externalSyncStatus)}
                      </div>
                    ) : null}
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
                  <td className="px-6 py-4 text-center">
                    {manualSyncResultByCoupon[coupon.code]?.status === 'SUCCESS' ? (
                      <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-full bg-green-50 text-green-700 border border-green-200">
                        Sucesso
                      </span>
                    ) : null}
                    {manualSyncResultByCoupon[coupon.code]?.status === 'FAILED' ? (
                      <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
                        Falha
                      </span>
                    ) : null}
                    {!manualSyncResultByCoupon[coupon.code] ? (
                      <span className="text-xs text-slate-400">-</span>
                    ) : null}
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

                      {canManageCoupons && (
                        <button
                          type="button"
                          disabled={syncExternalMutation.isPending}
                          onClick={() => syncExternalMutation.mutate(coupon)}
                          className="p-1.5 text-slate-400 hover:text-violet-700 hover:bg-violet-50 rounded transition-colors disabled:opacity-50"
                          title="Sincronizar agora no marketplace"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedCoupon(coupon)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                        title="Ver detalhes"
                      >
                         <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={page}
          limit={PAGE_SIZE}
          total={Number(data?.total || 0)}
          isLoading={isLoading}
          itemLabel="cupons"
          onPageChange={setPage}
        />
      </div>

      {selectedCoupon ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm sm:flex sm:items-center sm:justify-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeSelectedCouponModal();
            }
          }}
        >
          <div
            className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {(() => {
              const linkedParticipationIds = getParticipationIds(selectedCoupon);
              const isAccumulatedCoupon = linkedParticipationIds.length > 1;

              return (
                <>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
                  Detalhes do cupom
                </div>
                <h2 className="mt-1 font-heading text-2xl font-bold text-slate-900">
                  {selectedCoupon.code}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedCoupon.campaignName} • {selectedCoupon.userName}
                </p>
                {isAccumulatedCoupon ? (
                  <p className="mt-2 text-xs font-semibold text-primary-600">
                    Cupom acumulado com {linkedParticipationIds.length} participacoes aprovadas
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeSelectedCouponModal}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar detalhes do cupom"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
              {[
                { label: 'Codigo', value: selectedCoupon.code || 'Nao informado' },
                { label: 'Status', value: selectedCoupon.status || 'Nao informado' },
                { label: 'Cliente', value: selectedCoupon.userName || 'Nao informado' },
                { label: 'Instagram', value: selectedCoupon.client?.instagramHandle || selectedCoupon.participation?.userHandle || 'Nao informado' },
                { label: 'Campanha', value: selectedCoupon.campaignName || 'Nao informado' },
                { label: 'Beneficio', value: selectedCoupon.benefit || 'Nao informado' },
                { label: 'Valido ate', value: selectedCoupon.validUntil || 'Nao informado' },
                { label: 'Utilizado em', value: formatDateTime(selectedCoupon.usedAt) },
                { label: 'Criado em', value: formatDateTime(selectedCoupon.createdAt) },
                  { label: 'Participacao principal', value: selectedCoupon.participationId || selectedCoupon.participation?.id || 'Nao informado' },
                  { label: 'Participacoes vinculadas', value: linkedParticipationIds.length > 0 ? linkedParticipationIds.join(', ') : 'Nao informado' },
                { label: 'Cliente ID', value: selectedCoupon.client?.id || 'Nao informado' },
                { label: 'Cupom ID', value: selectedCoupon.id || 'Nao informado' },
                {
                  label: 'Marketplace',
                  value:
                    normalizeMarketplacePlatform(selectedCoupon.externalPlatform) ||
                    selectedCoupon.externalPlatform ||
                    'Nao informado',
                },
                {
                  label: 'Cupom externo ID',
                  value: selectedCoupon.externalCouponId || 'Nao informado',
                },
                {
                  label: 'Cupom externo codigo',
                  value: selectedCoupon.externalCouponCode || 'Nao informado',
                },
                {
                  label: 'Status sync externo',
                  value: formatExternalSyncStatusLabel(selectedCoupon.externalSyncStatus),
                },
                {
                  label: 'Ultima sync externa',
                  value: formatDateTime(selectedCoupon.externalSyncedAt),
                },
                {
                  label: 'Erro sync externo',
                  value: selectedCoupon.externalSyncError || 'Nao informado',
                },
                {
                  label: 'Resultado ativacao manual',
                  value:
                    manualSyncResultByCoupon[selectedCoupon.code]?.status === 'SUCCESS'
                      ? `Sucesso em ${formatDateTime(manualSyncResultByCoupon[selectedCoupon.code]?.at)}`
                      : manualSyncResultByCoupon[selectedCoupon.code]?.status === 'FAILED'
                        ? `Falha: ${manualSyncResultByCoupon[selectedCoupon.code]?.message}`
                        : 'Nao executado',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-1 break-words text-sm font-medium text-slate-900">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {canManageCoupons ? (
              <div className="border-t border-slate-100 px-6 py-4 space-y-3">
                <div className="text-sm font-bold text-slate-900">Sincronizacao externa manual</div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Plataforma
                    </span>
                    <select
                      value={
                        syncTargetByCoupon[selectedCoupon.code] ||
                        (normalizeMarketplacePlatform(selectedCoupon.externalPlatform) as MarketplacePlatform) ||
                        'NUVEMSHOP'
                      }
                      onChange={(event) =>
                        setSyncTargetByCoupon((current) => ({
                          ...current,
                          [selectedCoupon.code]: event.target.value as MarketplacePlatform,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                    >
                      {MARKETPLACE_PLATFORMS.map((platform) => (
                        <option key={platform} value={platform}>
                          {platform}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={syncExternalMutation.isPending}
                    onClick={() => syncExternalMutation.mutate(selectedCoupon)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {syncExternalMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Sincronizar agora
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Esta acao tenta reenviar a sincronizacao para o marketplace selecionado.
                </p>
              </div>
            ) : null}

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={closeSelectedCouponModal}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}

    </div>
  );
}
