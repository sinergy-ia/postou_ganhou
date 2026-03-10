"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FeatureUpgradeNotice from '@/components/dashboard/FeatureUpgradeNotice';
import { establishmentApi } from '@/services/establishment-api';
import { Search, Check, X, MessageSquare, Tag, Heart, Loader2 } from 'lucide-react';

const PAGE_SIZE = 100;

interface MonthlyParticipationPage {
  items: Array<{
    createdAt?: string;
  }>;
  total: number;
}

interface PostCampaign {
  title?: string;
  rules?: string[];
  baseReward?: string;
  baseLikesRequired?: number;
  maxReward?: string;
  maxLikesRequired?: number;
}

interface PostItem {
  id: string;
  imageUrl?: string;
  userHandle?: string;
  userAvatar?: string;
  userName?: string;
  discountEarned?: string;
  type: string;
  likes?: number;
  status?: 'pending' | 'approved' | 'redeemed' | 'rejected' | string;
  createdAt?: string;
  client?: {
    name?: string;
  } | null;
  campaign?: PostCampaign | null;
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

async function fetchAllParticipationPages() {
  const firstPage = (await establishmentApi.getParticipations({
    page: 1,
    limit: PAGE_SIZE,
  })) as MonthlyParticipationPage;
  const totalPages = Math.max(
    1,
    Math.ceil((firstPage.total || firstPage.items.length) / PAGE_SIZE),
  );

  if (totalPages === 1) {
    return firstPage.items;
  }

  const otherPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      establishmentApi.getParticipations({
        page: index + 2,
        limit: PAGE_SIZE,
      }) as Promise<MonthlyParticipationPage>,
    ),
  );

  return [firstPage, ...otherPages].flatMap((page) => page.items);
}

export default function PostagensPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Pendentes');
  const tabs = ['Todas', 'Pendentes', 'Aprovadas', 'Reprovadas'];
  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ['establishment-me'],
    queryFn: establishmentApi.getMe,
  });
  const canModeratePosts = (me?.currentUser?.role || 'owner') !== 'viewer';
  const monthlyParticipationLimit = me?.planAccess?.limits?.maxMonthlyParticipations ?? null;
  const hasMonthlyParticipationLimit = typeof monthlyParticipationLimit === 'number';

  const getStatus = (tab: string) => {
    switch (tab) {
      case 'Pendentes': return 'PENDING';
      case 'Aprovadas': return 'APPROVED';
      case 'Reprovadas': return 'REJECTED';
      default: return undefined;
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['participations', activeTab],
    queryFn: () => establishmentApi.getParticipations({ status: getStatus(activeTab) })
  });

  const posts: PostItem[] = data?.items || [];
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedRewardTierByPostId, setSelectedRewardTierByPostId] = useState<Record<string, 'BASE' | 'MAX'>>({});

  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: establishmentApi.getMetrics
  });

  const { data: conversionData } = useQuery({
    queryKey: ['analytics-conversion'],
    queryFn: () => establishmentApi.getAnalyticsConversion()
  });

  const { data: monthlyParticipationCount = 0, isLoading: isLoadingMonthlyParticipations } = useQuery({
    queryKey: ['participations-monthly-usage'],
    queryFn: async () => {
      const items = await fetchAllParticipationPages();
      return items.filter((item) => isCurrentMonth(item.createdAt)).length;
    },
    enabled: hasMonthlyParticipationLimit,
  });

  const selectedPost = posts.find(p => p.id === selectedPostId) || posts[0];
  const campaign = selectedPost?.campaign || {};
  const actualLikes = Number(selectedPost?.likes || 0);
  const baseLikesRequired = Number(campaign?.baseLikesRequired ?? 0);
  const maxLikesRequired = campaign?.maxLikesRequired !== undefined && campaign?.maxLikesRequired !== null
    ? Number(campaign.maxLikesRequired)
    : undefined;
  const selectedRewardTier = selectedPost
    ? selectedRewardTierByPostId[selectedPost.id] || 'BASE'
    : 'BASE';
  const canApproveBase = actualLikes >= baseLikesRequired;
  const canApproveMax = Boolean(
    campaign?.maxReward &&
      (maxLikesRequired === undefined || actualLikes >= maxLikesRequired),
  );
  const selectedRewardValue =
    selectedRewardTier === 'MAX' && campaign?.maxReward
      ? campaign.maxReward
      : campaign?.baseReward || selectedPost?.discountEarned || 'Brinde';
  const canApproveSelectedTier =
    selectedRewardTier === 'MAX' ? canApproveMax : canApproveBase;
  const hasReachedMonthlyParticipationLimit = Boolean(
    hasMonthlyParticipationLimit &&
      monthlyParticipationLimit !== null &&
      monthlyParticipationCount >= monthlyParticipationLimit,
  );

  const approveMutation = useMutation({
    mutationFn: ({ id, rewardTier }: { id: string; rewardTier: 'BASE' | 'MAX' }) =>
      establishmentApi.approveParticipation(id, { rewardTier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participations'] });
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason: string }) => establishmentApi.rejectParticipation(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participations'] });
    }
  });

  if (isLoadingMe || (hasMonthlyParticipationLimit && isLoadingMonthlyParticipations)) {
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
            hasReachedMonthlyParticipationLimit
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          Participações deste mês:{" "}
          <span className="font-bold">
            {monthlyParticipationCount} / {monthlyParticipationLimit}
          </span>
          {hasReachedMonthlyParticipationLimit ? (
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
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col lg:flex-row">
        
        {/* Sidebar List */}
        <div className="w-full lg:w-1/3 border-r border-slate-100 flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100">
            <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
              {tabs.map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
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
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 caret-primary-600 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : posts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Nenhuma postagem encontrada para esta aba.
              </div>
            ) : (
              posts.map((post) => (
                <button 
                  key={post.id} 
                  onClick={() => setSelectedPostId(post.id)}
                  className={`w-full text-left p-4 border-b border-slate-50 transition-colors flex gap-3 group outline-none ${selectedPost?.id === post.id ? 'bg-primary-50 border-l-4 border-l-primary-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0 relative">
                    <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />
                    {post.status === 'pending' && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-white"></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-bold text-sm text-slate-900 truncate">{post.userHandle}</span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{post.createdAt ? new Date(post.createdAt).toLocaleDateString('pt-BR') : ''}</span>
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
        </div>
        
        {/* Main detail view */}
        <div className="w-full lg:w-2/3 bg-slate-50/50 p-6 flex flex-col h-[600px] overflow-y-auto">
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
                    Postado em {selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleDateString('pt-BR') : ''}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Image Preview */}
                <div className="bg-slate-200 rounded-2xl aspect-[4/5] relative overflow-hidden shadow-inner flex items-center justify-center">
                  {selectedPost.imageUrl ? (
                    <img src={selectedPost.imageUrl} className="w-full h-full object-cover" alt="Post" />
                  ) : (
                    <span className="text-slate-400">Sem imagem provida</span>
                  )}
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur rounded-lg px-3 py-1.5 text-white text-xs font-bold flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 fill-white" /> {selectedPost.likes || 0} likes
                  </div>
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
                    <span className="font-medium text-slate-900 capitalize">{selectedPost.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Recompensa</span>
                    <span className="font-bold text-primary-600 flex items-center gap-1"><Tag className="w-3 h-3"/> {selectedPost.discountEarned || 'Brinde'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Likes atuais</span>
                    <span className="font-medium text-slate-900">{actualLikes}</span>
                  </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Checklist de Regras</div>
                <div className="space-y-2">
                  {(selectedPost.campaign?.rules || []).length > 0 ? (
                    (selectedPost.campaign?.rules || []).map((rule: string, index: number) => (
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
                    Variações de Recompensa por Likes
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRewardTierByPostId((prev) => ({
                        ...prev,
                        [selectedPost.id]: 'BASE',
                      }))
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      selectedRewardTier === 'BASE'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-900">
                          Recompensa Base
                        </div>
                        <div className="text-sm text-slate-600">
                          {campaign?.baseReward || 'Brinde'}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>Meta: {baseLikesRequired} likes</div>
                        <div className={canApproveBase ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                          {canApproveBase ? 'Meta atingida' : 'Meta pendente'}
                        </div>
                      </div>
                    </div>
                  </button>

                  {campaign?.maxReward ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRewardTierByPostId((prev) => ({
                          ...prev,
                          [selectedPost.id]: 'MAX',
                        }))
                      }
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        selectedRewardTier === 'MAX'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-slate-900">
                            Recompensa Máxima
                          </div>
                          <div className="text-sm text-slate-600">
                            {campaign.maxReward}
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <div>
                            Meta: {maxLikesRequired !== undefined ? `${maxLikesRequired} likes` : 'sem meta configurada'}
                          </div>
                          <div className={canApproveMax ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                            {canApproveMax ? 'Meta atingida' : 'Meta pendente'}
                          </div>
                        </div>
                      </div>
                    </button>
                  ) : null}

                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    A aprovacao continua manual, mas o sistema agora respeita a meta de likes configurada na campanha para liberar cada variacao.
                  </div>
                </div>
              )}
              
              {selectedPost.status === 'pending' && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
                  <button 
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                    onClick={() => {
                      const reason = prompt("Descreva o motivo da recusa:");
                      if (reason) {
                        rejectMutation.mutate({ id: selectedPost.id, reason });
                      }
                    }}
                    className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors border border-red-200 disabled:opacity-50"
                  >
                    <X className="w-5 h-5" /> Reprovar
                  </button>
                  <button 
                    disabled={
                      rejectMutation.isPending ||
                      approveMutation.isPending ||
                      !canApproveSelectedTier ||
                      hasReachedMonthlyParticipationLimit
                    }
                    onClick={() =>
                      approveMutation.mutate({
                        id: selectedPost.id,
                        rewardTier: selectedRewardTier,
                      })
                    }
                    className="flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors shadow-md shadow-green-200 disabled:opacity-50"
                  >
                    {approveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Aprovar com {selectedRewardValue}
                  </button>
                </div>
              )}

              {selectedPost.status === 'pending' && !canApproveSelectedTier ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {selectedRewardTier === 'MAX'
                    ? `Essa postagem ainda nao atingiu a meta de ${maxLikesRequired ?? 0} likes para liberar a recompensa maxima.`
                    : `Essa postagem ainda nao atingiu a meta minima de ${baseLikesRequired} likes para ser aprovada com a recompensa base.`}
                </div>
              ) : null}

              {selectedPost.status === 'pending' && hasReachedMonthlyParticipationLimit ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  O plano atual já consumiu o limite mensal de participações. Você ainda
                  pode revisar e reprovar postagens, mas novas aprovações exigem upgrade
                  ou a virada do próximo ciclo.
                </div>
              ) : null}
              
              <button className="w-full flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors mt-2">
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

    </div>
  );
}
