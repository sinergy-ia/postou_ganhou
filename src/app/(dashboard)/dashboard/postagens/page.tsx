"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PaginationControls from '@/components/dashboard/PaginationControls';
import DashboardDialog from '@/components/ui/DashboardDialog';
import FeatureUpgradeNotice from '@/components/dashboard/FeatureUpgradeNotice';
import { establishmentApi } from '@/services/establishment-api';
import {
  getConfiguredMarketplacePlatforms,
  marketplaceApi,
  type MarketplacePlatform,
} from '@/services/marketplace-api';
import {
  formatCampaignQuantityLabel,
  getCampaignModalityConfig,
  getCampaignTypeLabel,
} from '@/services/marque-e-ganhe-normalizers';
import { Search, Check, X, MessageSquare, Tag, Loader2, ImageOff } from 'lucide-react';

const MONTHLY_COUNT_PAGE_SIZE = 100;
const LIST_PAGE_SIZE = 20;

interface MonthlyParticipationPage {
  items: Array<{
    createdAt?: string;
  }>;
  total: number;
}

interface PostCampaign {
  title?: string;
  rules?: string[];
  type?: string;
  storyBaseReward?: string;
  storyBaseQuantity?: number;
  storyMaxReward?: string;
  storyMaxQuantity?: number;
  feedBaseReward?: string;
  feedBaseQuantity?: number;
  feedMaxReward?: string;
  feedMaxQuantity?: number;
  reelsBaseReward?: string;
  reelsBaseQuantity?: number;
  reelsMaxReward?: string;
  reelsMaxQuantity?: number;
  rewardSummary?: string;
}

interface PostItem {
  id: string;
  imageUrl?: string;
  userHandle?: string;
  userAvatar?: string;
  userName?: string;
  discountEarned?: string;
  type: 'story' | 'feed' | 'reels' | string;
  status?: 'pending' | 'approved' | 'redeemed' | 'rejected' | string;
  createdAt?: string;
  client?: {
    name?: string;
  } | null;
  campaign?: PostCampaign | null;
}

type FeedbackState = {
  title: string;
  description: string;
};

function getErrorMessage(error: unknown, fallback: string) {
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
}

function normalizeSearchValue(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function PostImageFallback({
  src,
  alt,
  className,
  fallbackClassName,
  iconClassName,
}: {
  src?: string;
  alt: string;
  className: string;
  fallbackClassName: string;
  iconClassName: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={fallbackClassName}>
        <ImageOff className={iconClassName} />
      </div>
    );
  }

  return <img src={src} className={className} alt={alt} onError={() => setHasError(true)} />;
}

function isCurrentMonth(value?: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

async function fetchCurrentMonthParticipationCount() {
  let page = 1;
  let totalCurrentMonthItems = 0;
  let shouldContinue = true;

  while (shouldContinue) {
    const response = (await establishmentApi.getParticipations({
      page,
      limit: MONTHLY_COUNT_PAGE_SIZE,
    })) as MonthlyParticipationPage;
    const items = Array.isArray(response.items) ? response.items : [];

    if (items.length === 0) {
      break;
    }

    const currentMonthItems = items.filter((item) => isCurrentMonth(item.createdAt));
    totalCurrentMonthItems += currentMonthItems.length;

    // Stop as soon as this page no longer contains only items from the current month.
    shouldContinue =
      items.length === MONTHLY_COUNT_PAGE_SIZE && currentMonthItems.length === items.length;
    page += 1;
  }

  return totalCurrentMonthItems;
}

export default function PostagensPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isPostDetailModalOpen, setIsPostDetailModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [syncExternalCoupon, setSyncExternalCoupon] = useState(false);
  const [externalPlatform, setExternalPlatform] = useState<MarketplacePlatform>('NUVEMSHOP');
  const tabs = ['Todas', 'Pendentes', 'Aprovadas', 'Reprovadas'];
  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ['establishment-me'],
    queryFn: establishmentApi.getMe,
  });
  const canModeratePosts = (me?.currentUser?.role || 'owner') !== 'viewer';
  const { data: marketplaceIntegrationsData } = useQuery({
    queryKey: ['marketplace-integrations'],
    queryFn: marketplaceApi.getIntegrations,
    enabled: canModeratePosts,
    retry: false,
  });
  const monthlyParticipationLimit = me?.planAccess?.limits?.maxMonthlyParticipations ?? null;
  const hasMonthlyParticipationLimit = typeof monthlyParticipationLimit === 'number';
  const configuredMarketplacePlatforms = useMemo(
    () => getConfiguredMarketplacePlatforms(marketplaceIntegrationsData?.integrations),
    [marketplaceIntegrationsData?.integrations],
  );
  const hasConfiguredMarketplaces = configuredMarketplacePlatforms.length > 0;
  const defaultMarketplacePlatform = configuredMarketplacePlatforms[0] || 'NUVEMSHOP';
  const effectiveExternalPlatform = configuredMarketplacePlatforms.includes(externalPlatform)
    ? externalPlatform
    : defaultMarketplacePlatform;
  const isExternalSyncEnabled = hasConfiguredMarketplaces && syncExternalCoupon;
  const marketplaceConfigHref = '/dashboard/configuracoes?section=marketplace';

  const getStatus = (tab: string) => {
    switch (tab) {
      case 'Pendentes': return 'PENDING';
      case 'Aprovadas': return 'APPROVED';
      case 'Reprovadas': return 'REJECTED';
      default: return undefined;
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['participations', activeTab, page],
    queryFn: () =>
      establishmentApi.getParticipations({
        page,
        limit: LIST_PAGE_SIZE,
        status: getStatus(activeTab),
      })
  });

  const posts = useMemo<PostItem[]>(
    () => (Array.isArray(data?.items) ? (data.items as PostItem[]) : []),
    [data],
  );
  const filteredPosts = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(searchTerm);

    if (!normalizedSearch) {
      return posts;
    }

    return posts.filter((post) => {
      const handle = normalizeSearchValue(post.userHandle);
      const userName = normalizeSearchValue(post.userName);
      const clientName = normalizeSearchValue(post.client?.name);

      return [handle, userName, clientName].some((value) => value.includes(normalizedSearch));
    });
  }, [posts, searchTerm]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => establishmentApi.getMetrics(),
  });

  const { data: conversionData } = useQuery({
    queryKey: ['analytics-conversion'],
    queryFn: () => establishmentApi.getAnalyticsConversion()
  });

  const { data: monthlyParticipationCount = 0, isLoading: isLoadingMonthlyParticipations } = useQuery({
    queryKey: ['participations-monthly-usage'],
    queryFn: fetchCurrentMonthParticipationCount,
    enabled: hasMonthlyParticipationLimit,
  });

  const selectedPost = filteredPosts.find(p => p.id === selectedPostId) || filteredPosts[0];
  const campaign = selectedPost?.campaign || {};
  const selectedModality =
    selectedPost?.type === 'story'
      ? 'story'
      : selectedPost?.type === 'reels'
        ? 'reels'
        : 'feed';
  const selectedModalityConfig = getCampaignModalityConfig(campaign, selectedModality);
  const selectedRewardValue =
    selectedPost?.discountEarned ||
    selectedModalityConfig.baseReward ||
    'Benefício configurado no backend';
  const checklistRules = (() => {
    const baseRules = Array.isArray(selectedPost?.campaign?.rules)
      ? selectedPost.campaign.rules
      : [];

    if (selectedPost?.type !== 'story') {
      return baseRules;
    }

    const storyRules = [
      'Na modalidade Story, por enquanto a postagem deve ser apenas com imagem. Videos em story ainda nao entram nesse fluxo.',
      'A hashtag e o arroba do estabelecimento precisam estar visiveis no story. Nao pode ser escrita transparente, branca, escondida ou muito pequena.',
    ];

    return [...baseRules, ...storyRules.filter((rule) => !baseRules.includes(rule))];
  })();
  const hasReachedMonthlyParticipationLimit = Boolean(
    hasMonthlyParticipationLimit &&
      monthlyParticipationLimit !== null &&
      monthlyParticipationCount >= monthlyParticipationLimit,
  );

  const approveMutation = useMutation({
    mutationFn: ({
      id,
      syncExternal,
      platform,
    }: {
      id: string;
      syncExternal: boolean;
      platform: MarketplacePlatform;
    }) =>
      {
        if (syncExternal && !hasConfiguredMarketplaces) {
          throw new Error('Configure um marketplace antes de habilitar a sincronizacao externa.');
        }

        if (syncExternal && !configuredMarketplacePlatforms.includes(platform)) {
          throw new Error('Selecione um marketplace configurado antes de aprovar.');
        }

        return establishmentApi.approveParticipation(id, {
          syncExternalCoupon: syncExternal,
          externalPlatform: syncExternal ? platform : undefined,
        });
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participations'] });
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setIsPostDetailModalOpen(false);
      setFeedback({
        title: 'Postagem aprovada',
        description: 'A participação foi aprovada e o cupom foi recalculado com sucesso.',
      });
    },
    onError: (mutationError) => {
      setFeedback({
        title: 'Nao foi possivel aprovar',
        description: getErrorMessage(
          mutationError,
          'Tente novamente em instantes para concluir a aprovacao da postagem.',
        ),
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason: string }) => establishmentApi.rejectParticipation(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participations'] });
      setIsRejectModalOpen(false);
      setRejectReason('');
      setIsPostDetailModalOpen(false);
      setFeedback({
        title: 'Postagem reprovada',
        description: 'O motivo da recusa foi registrado com sucesso.',
      });
    },
    onError: () => {
      setFeedback({
        title: 'Nao foi possivel reprovar',
        description: 'Tente novamente em instantes para registrar a recusa da postagem.',
      });
    },
  });

  const openRejectModal = () => {
    if (!selectedPost) {
      return;
    }

    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleRejectPost = () => {
    if (!selectedPost || !rejectReason.trim()) {
      return;
    }

    rejectMutation.mutate({ id: selectedPost.id, reason: rejectReason.trim() });
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
      <div>
        <h1 className="font-heading font-bold text-3xl text-slate-900">Moderação de Postagens</h1>
        <p className="text-slate-500 mt-1">Valide as participações dos seus clientes e libere os cupons.</p>
      </div>

      {!canModeratePosts ? (
        <FeatureUpgradeNotice
          badge="Perfil viewer"
          title="Seu acesso nesta área é somente leitura"
          description="Você pode acompanhar as postagens do estabelecimento, mas apenas owner e manager podem aprovar ou reprovar participações."
          ctaLabel="Entendi"
          ctaHref="/dashboard"
        />
      ) : null}

      {hasMonthlyParticipationLimit ? (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-medium ${
            !isLoadingMonthlyParticipations && hasReachedMonthlyParticipationLimit
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          Participações deste mês:{" "}
          <span className="font-bold">
            {isLoadingMonthlyParticipations ? 'calculando...' : monthlyParticipationCount} / {monthlyParticipationLimit}
          </span>
          {!isLoadingMonthlyParticipations && hasReachedMonthlyParticipationLimit ? (
            <span>
              {" "}
              O limite do seu plano foi atingido. Novas aprovações ficam bloqueadas
              até o próximo ciclo ou até o upgrade do plano.
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Aguardando', value: metrics?.pendingPosts || 0, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
          { label: 'Total Postagens', value: metrics?.totalPosts || 0, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
          { label: 'Reprovadas Atuais', value: posts.filter((post) => post.status === 'rejected').length || 0, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
          { label: 'Taxa de Conversão', value: conversionData?.rate || '0%', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg} ${stat.border}`}>
            <div className="text-xs font-semibold text-slate-600 mb-1">{stat.label}</div>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col lg:min-w-0 lg:flex-row">
        
        {/* Sidebar List */}
        <div className="flex h-[600px] w-full flex-col border-r border-slate-100 lg:w-[380px] lg:shrink-0 xl:w-[420px]">
          <div className="p-4 border-b border-slate-100">
            <div className="mb-4 flex gap-2 overflow-x-auto hide-scrollbar lg:flex-wrap lg:overflow-visible">
              {tabs.map(tab => (
                <button 
                  key={tab} 
                  onClick={() => {
                    setActiveTab(tab);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 font-medium text-xs rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por @usuario..." 
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 caret-primary-600 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                {searchTerm ? 'Nenhuma postagem encontrada para esse usuario.' : 'Nenhuma postagem encontrada para esta aba.'}
              </div>
            ) : (
              filteredPosts.map((post) => (
                <button 
                  key={post.id} 
                  onClick={() => {
                    setSelectedPostId(post.id);

                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setIsPostDetailModalOpen(true);
                    }
                  }}
                  className={`w-full text-left p-4 border-b border-slate-50 transition-colors flex gap-3 group outline-none ${selectedPost?.id === post.id ? 'bg-primary-50 border-l-4 border-l-primary-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0 relative">
                    <PostImageFallback
                      src={post.imageUrl}
                      alt={post.userName || post.userHandle || 'Postagem'}
                      className="w-full h-full object-cover"
                      fallbackClassName="flex h-full w-full items-center justify-center bg-slate-100"
                      iconClassName="w-5 h-5 text-slate-400"
                    />
                    {post.status === 'pending' && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-white"></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-bold text-sm text-slate-900 truncate">{post.userHandle}</span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatDateTime(post.createdAt)}</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate mb-1.5">{post.discountEarned}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        {post.type}
                      </span>
                      {post.status === 'pending' && <span className="text-[10px] font-bold text-yellow-600">Requer ação</span>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <PaginationControls
            page={page}
            limit={LIST_PAGE_SIZE}
            total={Number(data?.total || 0)}
            isLoading={isLoading}
            itemLabel="postagens"
            onPageChange={setPage}
          />
        </div>
        
        {/* Main detail view */}
        <div className="hidden h-[600px] min-w-0 flex-1 flex-col overflow-y-auto bg-slate-50/50 p-6 lg:flex">
          {selectedPost ? (
            <>
              {/* Detail Header */}
              <div className="flex items-start justify-between mb-6 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <img src={selectedPost.userAvatar || `https://ui-avatars.com/api/?name=${selectedPost.userName || selectedPost.userHandle}`} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="" />
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{selectedPost.userName || selectedPost.client?.name}</h3>
                    <a href="#" className="text-primary-600 font-medium text-sm hover:underline">{selectedPost.userHandle}</a>
                  </div>
                </div>
                <div className="text-right">
                  {selectedPost.status === 'pending' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 font-bold border border-yellow-200 rounded-full text-xs mb-2">
                      Pendente de Validação
                    </span>
                  )}
                  {selectedPost.status === 'approved' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 font-bold border border-green-200 rounded-full text-xs mb-2">
                      Aprovado
                    </span>
                  )}
                  {selectedPost.status === 'redeemed' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 rounded-full text-xs mb-2">
                      Resgatado
                    </span>
                  )}
                  {selectedPost.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 font-bold border border-red-200 rounded-full text-xs mb-2">
                      Reprovado
                    </span>
                  )}
                  <div className="text-xs text-slate-500">
                    Postado em {formatDateTime(selectedPost.createdAt)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Image Preview */}
                <div className="bg-slate-200 rounded-2xl aspect-[4/5] relative overflow-hidden shadow-inner flex items-center justify-center">
                  <PostImageFallback
                    src={selectedPost.imageUrl}
                    alt={selectedPost.userName || selectedPost.userHandle || 'Postagem'}
                    className="w-full h-full object-cover"
                    fallbackClassName="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-100 text-slate-500"
                    iconClassName="w-12 h-12 text-slate-300"
                  />
                </div>
            
            {/* Info and Actions */}
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Detalhes da Participação</div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Campanha</span>
                    <span className="font-medium text-slate-900 text-right">{selectedPost.campaign?.title || 'Campanha Excluída'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tipo Exigido</span>
                    <span className="font-medium text-slate-900">{getCampaignTypeLabel(selectedPost.type)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Recompensa</span>
                    <span className="font-bold text-primary-600 flex items-center gap-1"><Tag className="w-3 h-3"/> {selectedRewardValue}</span>
                  </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Checklist de Regras</div>
                <div className="space-y-2">
                  {checklistRules.length > 0 ? (
                    checklistRules.map((rule: string, index: number) => (
                      <label key={`${rule}-${index}`} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" defaultChecked className="text-primary-600 rounded focus:ring-primary-600" />
                        {rule}
                      </label>
                    ))
                  ) : (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      A campanha não possui regras cadastradas.
                    </div>
                  )}
                </div>
              </div>

              {selectedPost.status === 'pending' && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                    Regra da Modalidade
                  </div>

                  <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-900">
                          {getCampaignTypeLabel(selectedPost.type)}
                        </div>
                        <div className="text-sm text-slate-600">
                          Recompensa base: {selectedModalityConfig.baseReward || 'não configurada'}
                        </div>
                    </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>
                          Meta base:{' '}
                          {selectedModalityConfig.baseQuantity
                            ? formatCampaignQuantityLabel(
                                selectedModality,
                                selectedModalityConfig.baseQuantity,
                              )
                            : 'não configurada'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {selectedModalityConfig.maxReward && selectedModalityConfig.maxQuantity
                      ? `Ao atingir ${formatCampaignQuantityLabel(
                          selectedModality,
                          selectedModalityConfig.maxQuantity,
                        )}, o backend atualiza o mesmo cupom para ${selectedModalityConfig.maxReward}.`
                      : 'Essa modalidade opera apenas com a meta base configurada para a campanha.'}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    A aprovação continua manual, mas o backend recalcula o benefício usando
                    o total aprovado do cliente nesta campanha e nesta modalidade.
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-3">
                    <label
                      className={`inline-flex items-center gap-2 text-sm font-medium ${
                        hasConfiguredMarketplaces ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!hasConfiguredMarketplaces}
                        checked={isExternalSyncEnabled}
                        onChange={(event) => setSyncExternalCoupon(event.target.checked)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      Sincronizar cupom externo no marketplace ao aprovar
                    </label>

                    {hasConfiguredMarketplaces ? (
                      isExternalSyncEnabled ? (
                        <div className="space-y-1">
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Plataforma externa
                          </span>
                          <select
                            value={effectiveExternalPlatform}
                            onChange={(event) =>
                              setExternalPlatform(event.target.value as MarketplacePlatform)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                          >
                            {configuredMarketplacePlatforms.map((platform) => (
                              <option key={platform} value={platform}>
                                {platform}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Apenas marketplaces configurados aparecem para sincronizacao.
                        </p>
                      )
                    ) : (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Nenhum marketplace esta configurado para enviar o cupom automaticamente.
                        <Link
                          href={marketplaceConfigHref}
                          className="mt-3 inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                        >
                          Configurar marketplace
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {selectedPost.status === 'pending' && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
                  <button 
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                    onClick={openRejectModal}
                    className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors border border-red-200 disabled:opacity-50"
                  >
                    <X className="w-5 h-5" /> Reprovar
                  </button>
                  <button 
                    disabled={
                      rejectMutation.isPending ||
                      approveMutation.isPending ||
                      hasReachedMonthlyParticipationLimit
                    }
                    onClick={() =>
                      approveMutation.mutate({
                        id: selectedPost.id,
                        syncExternal: isExternalSyncEnabled,
                        platform: effectiveExternalPlatform,
                      })
                    }
                    className="flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors shadow-md shadow-green-200 disabled:opacity-50"
                  >
                    {approveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Aprovar e recalcular cupom
                  </button>
                </div>
              )}

              {selectedPost.status === 'pending' ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  O cupom é calculado no backend com base na progressão acumulada do cliente
                  dentro da campanha. Ao aprovar esta participação, o sistema pode liberar a
                  recompensa base ou promover o mesmo cupom para o nível máximo da modalidade.
                </div>
              ) : null}

              {selectedPost.status === 'pending' && hasReachedMonthlyParticipationLimit ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  O plano atual já consumiu o limite mensal de participações. Você ainda
                  pode revisar e reprovar postagens, mas novas aprovações exigem upgrade
                  ou a virada do próximo ciclo.
                </div>
              ) : null}
              
              <button
                type="button"
                onClick={openRejectModal}
                disabled={rejectMutation.isPending || approveMutation.isPending || selectedPost.status !== 'pending'}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquare className="w-4 h-4" /> Enviar mensagem com motivo da recusa
              </button>
            </div>
          </div>
          </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Check className="w-12 h-12 mb-4 text-slate-300" />
              <p>Selecione uma postagem para analisar.</p>
            </div>
          )}
        </div>
      </div>

      <DashboardDialog
        open={isPostDetailModalOpen && Boolean(selectedPost)}
        onClose={() => setIsPostDetailModalOpen(false)}
        title="Detalhes da postagem"
        description="No mobile, os detalhes aparecem em modal para facilitar a revisao."
        maxWidthClassName="max-w-4xl"
      >
        {selectedPost ? (
          <div className="max-h-[75vh] space-y-6 overflow-y-auto pr-1">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedPost.userAvatar ||
                    `https://ui-avatars.com/api/?name=${selectedPost.userName || selectedPost.userHandle}`
                  }
                  className="h-12 w-12 rounded-full border-2 border-white shadow-sm"
                  alt=""
                />
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-lg text-slate-900">
                    {selectedPost.userName || selectedPost.client?.name}
                  </h3>
                  <div className="truncate text-sm font-medium text-primary-600">
                    {selectedPost.userHandle}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                {selectedPost.status === 'pending' && (
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700">
                    Pendente
                  </span>
                )}
                {selectedPost.status === 'approved' && (
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    Aprovado
                  </span>
                )}
                {selectedPost.status === 'redeemed' && (
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Resgatado
                  </span>
                )}
                {selectedPost.status === 'rejected' && (
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                    Reprovado
                  </span>
                )}
                <div className="text-xs text-slate-500">
                  Postado em {formatDateTime(selectedPost.createdAt)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-slate-200 shadow-inner">
                <PostImageFallback
                  src={selectedPost.imageUrl}
                  alt={selectedPost.userName || selectedPost.userHandle || 'Postagem'}
                  className="h-full w-full object-cover"
                  fallbackClassName="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-100 text-slate-500"
                  iconClassName="w-12 h-12 text-slate-300"
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="border-b border-slate-200 pb-2 text-sm font-bold text-slate-900">
                    Resumo da participacao
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">Campanha</span>
                    <span className="text-right font-medium text-slate-900">
                      {selectedPost.campaign?.title || 'Campanha Excluida'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">Tipo</span>
                    <span className="font-medium text-slate-900">
                      {getCampaignTypeLabel(selectedPost.type)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">Recompensa</span>
                    <span className="flex items-center gap-1 font-bold text-primary-600">
                      <Tag className="h-3 w-3" />
                      {selectedRewardValue}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="border-b border-slate-200 pb-2 text-sm font-bold text-slate-900">
                    Checklist
                  </div>
                  <div className="space-y-2">
                    {checklistRules.length > 0 ? (
                      checklistRules.map((rule, index) => (
                        <label
                          key={`${rule}-${index}`}
                          className="flex items-start gap-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            defaultChecked
                            className="mt-0.5 rounded text-primary-600 focus:ring-primary-600"
                          />
                          <span>{rule}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">
                        A campanha nao possui regras cadastradas.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedPost.status === 'pending' ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                O cupom e calculado no backend com base na progressao acumulada do cliente
                dentro da campanha.
              </div>
            ) : null}

            {selectedPost.status === 'pending' ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <label
                  className={`inline-flex items-center gap-2 text-sm font-medium ${
                    hasConfiguredMarketplaces ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!hasConfiguredMarketplaces}
                    checked={isExternalSyncEnabled}
                    onChange={(event) => setSyncExternalCoupon(event.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  Sincronizar cupom externo no marketplace
                </label>

                {hasConfiguredMarketplaces ? (
                  isExternalSyncEnabled ? (
                    <select
                      value={effectiveExternalPlatform}
                      onChange={(event) =>
                        setExternalPlatform(event.target.value as MarketplacePlatform)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-primary-500"
                    >
                      {configuredMarketplacePlatforms.map((platform) => (
                        <option key={platform} value={platform}>
                          {platform}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Apenas marketplaces configurados aparecem para sincronizacao.
                    </p>
                  )
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Nenhum marketplace esta configurado para sincronizar cupons.
                    <Link
                      href={marketplaceConfigHref}
                      className="mt-3 inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                    >
                      Configurar marketplace
                    </Link>
                  </div>
                )}
              </div>
            ) : null}

            {selectedPost.status === 'pending' && hasReachedMonthlyParticipationLimit ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                O plano atual ja consumiu o limite mensal de participacoes. Novas
                aprovacoes exigem upgrade ou a virada do proximo ciclo.
              </div>
            ) : null}

            {selectedPost.status === 'pending' && canModeratePosts ? (
              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={rejectMutation.isPending || approveMutation.isPending}
                  onClick={openRejectModal}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                >
                  <X className="h-5 w-5" /> Reprovar
                </button>
                <button
                  type="button"
                  disabled={
                    rejectMutation.isPending ||
                    approveMutation.isPending ||
                    hasReachedMonthlyParticipationLimit
                  }
                  onClick={() =>
                    approveMutation.mutate({
                      id: selectedPost.id,
                      syncExternal: isExternalSyncEnabled,
                      platform: effectiveExternalPlatform,
                    })
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-bold text-white transition-colors hover:bg-green-600 shadow-md shadow-green-200 disabled:opacity-50"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                  Aprovar
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </DashboardDialog>

      <DashboardDialog
        open={isRejectModalOpen}
        onClose={() => {
          if (rejectMutation.isPending) {
            return;
          }

          setIsRejectModalOpen(false);
          setRejectReason('');
        }}
        title="Motivo da recusa"
        description="Escreva a mensagem que deve acompanhar a reprovacao da postagem. Evite texto genérico para o cliente entender exatamente o ajuste necessário."
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectReason('');
              }}
              disabled={rejectMutation.isPending}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRejectPost}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Confirmar recusa
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-700">
            Mensagem para a recusa
          </label>
          <textarea
            rows={5}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Ex.: O story nao mostrou o arroba do estabelecimento de forma legivel."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
          />
          <p className="text-xs text-slate-500">
            Essa justificativa fica registrada no fluxo da participacao e deve orientar a correcao do cliente.
          </p>
        </div>
      </DashboardDialog>

      <DashboardDialog
        open={Boolean(feedback)}
        onClose={() => setFeedback(null)}
        title={feedback?.title || ''}
        description={feedback?.description}
        footer={
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            Entendi
          </button>
        }
      />

    </div>
  );
}
