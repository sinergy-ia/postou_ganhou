"use client";

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { establishmentApi } from '@/services/establishment-api';

type CampaignFormState = {
  title: string;
  description: string;
  type: string;
  baseReward: string;
  baseLikesRequired: string;
  maxReward: string;
  maxLikesRequired: string;
  autoApproveParticipations: boolean;
  hashtagRequired: string;
  expiresAt: string;
  isActive: boolean;
};

const defaultFormData: CampaignFormState = {
  title: '',
  description: '',
  type: 'story',
  baseReward: '',
  baseLikesRequired: '0',
  maxReward: '',
  maxLikesRequired: '',
  autoApproveParticipations: false,
  hashtagRequired: '',
  expiresAt: '',
  isActive: true,
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

function buildInitialFormData(campaignToEdit?: Awaited<ReturnType<typeof establishmentApi.getCampaign>> | null): CampaignFormState {
  if (!campaignToEdit) {
    return defaultFormData;
  }

  return {
    title: campaignToEdit.title || '',
    description: campaignToEdit.description || '',
    type: campaignToEdit.type || 'story',
    baseReward: campaignToEdit.baseReward || '',
    baseLikesRequired: String(campaignToEdit.baseLikesRequired ?? 0),
    maxReward: campaignToEdit.maxReward || '',
    maxLikesRequired:
      campaignToEdit.maxLikesRequired !== undefined
        ? String(campaignToEdit.maxLikesRequired)
        : '',
    autoApproveParticipations: Boolean(campaignToEdit.autoApproveParticipations),
    hashtagRequired: String(campaignToEdit.hashtagRequired || ''),
    expiresAt: campaignToEdit.expiresAt
      ? new Date(campaignToEdit.expiresAt).toISOString().split('T')[0]
      : '',
    isActive: campaignToEdit.isActive ?? true,
  };
}

function CampaignForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('id');
  const isEditing = !!campaignId;

  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ['establishment-me'],
    queryFn: establishmentApi.getMe,
  });
  const canUseProgressiveRewards = Boolean(
    me?.planAccess?.features?.progressiveRewards,
  );
  const canUseAutoApproval = Boolean(me?.planAccess?.features?.autoApproval);
  const [draftFormData, setDraftFormData] = useState<CampaignFormState | null>(null);

  const { data: campaignToEdit, isLoading: isFetching } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => establishmentApi.getCampaign(campaignId!),
    enabled: isEditing
  });
  const initialFormData = useMemo(
    () => buildInitialFormData(campaignToEdit),
    [campaignToEdit],
  );
  const formData = draftFormData ?? initialFormData;

  const createMutation = useMutation({
    mutationFn: establishmentApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      router.push('/dashboard/campanhas');
    },
    onError: (error) => setError(getErrorMessage(error, 'Erro ao criar campanha.'))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: Record<string, unknown> }) =>
      establishmentApi.updateCampaign(id, payload),
    onSuccess: (updatedCampaign, variables) => {
      queryClient.setQueryData(['campaign', variables.id], updatedCampaign);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.id] });
      router.push('/dashboard/campanhas');
    },
    onError: (error) => setError(getErrorMessage(error, 'Erro ao atualizar campanha.'))
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Prepare JSON payload
    let expiresAtDate = new Date();
    if (formData.expiresAt) {
      expiresAtDate = new Date(formData.expiresAt);
    } else {
      // Default to 30 days from now if left blank
      expiresAtDate.setDate(expiresAtDate.getDate() + 30);
    }

    const payload = {
      ...formData,
      baseLikesRequired: formData.baseLikesRequired || '0',
      maxLikesRequired: formData.maxReward ? formData.maxLikesRequired : '',
      expiresAt: expiresAtDate.toISOString(),
      badges: ["nova"],
      rules: ["Marcar o estabelecimento no story e usar a hashtag da promoção"]
    };

    if (isEditing) {
      updateMutation.mutate({ id: campaignId!, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setDraftFormData((prev) => ({ ...(prev ?? initialFormData), [e.target.name]: e.target.value }));
  };

  if (isLoadingMe) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/campanhas" 
          className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-heading font-bold text-3xl text-slate-900">{isEditing ? 'Editar Campanha' : 'Criar Nova Campanha'}</h1>
          <p className="text-slate-500 mt-1">{isEditing ? 'Atualize as informações desta promoção.' : 'Configure as regras e recompensas da sua promoção.'}</p>
        </div>
      </div>

      {isFetching ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Título da Campanha</label>
              <input 
                required
                type="text" 
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Compartilhou, Ganhou 20% OFF" 
                className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Descrição</label>
              <textarea 
                required
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Descreva o que seu cliente precisa fazer..." 
                className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Tipo de Postagem</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              >
                <option value="story">Apenas Stories</option>
                <option value="post" disabled>Post no Feed / Reels - Em breve</option>
                <option value="both" disabled>Story ou Feed - Em breve</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Hashtag Obrigatória</label>
              <input 
                required
                type="text" 
                name="hashtagRequired"
                value={formData.hashtagRequired}
                onChange={handleChange}
                placeholder="Ex: #MeuRestaurante" 
                className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">Essa hashtag sera usada no tracking automatico da campanha.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Recompensa Base</label>
              <input 
                required
                type="text" 
                name="baseReward"
                value={formData.baseReward}
                onChange={handleChange}
                placeholder="Ex: 10% OFF, Sobremesa grátis" 
                className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Likes mínimos para Recompensa Base</label>
              <input 
                type="number" 
                min="0"
                name="baseLikesRequired"
                value={formData.baseLikesRequired}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Recompensa Máxima (Opcional)</label>
              <input 
                type="text" 
                name="maxReward"
                value={formData.maxReward}
                onChange={handleChange}
                placeholder="Ex: 30% OFF (Para perfis grandes)" 
                disabled={!canUseProgressiveRewards}
                className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                {canUseProgressiveRewards
                  ? 'A moderacao so libera essa recompensa manualmente quando a meta configurada for atingida.'
                  : 'Recompensas progressivas por likes estao disponiveis a partir do plano Pro.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Likes mínimos para Recompensa Máxima</label>
              <input 
                type="number" 
                min="0"
                name="maxLikesRequired"
                value={formData.maxLikesRequired}
                onChange={handleChange}
                placeholder="Ex: 100"
                disabled={!canUseProgressiveRewards}
                className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Data de Término (Opcional)</label>
              <input 
                type="date" 
                name="expiresAt"
                value={formData.expiresAt}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">Se não preencher, vale por 30 dias.</p>
            </div>
            
            <div className="flex items-center pt-8">
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer relative">
                  <input 
                    type="checkbox" 
                    name="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setDraftFormData((prev) => ({
                        ...(prev ?? initialFormData),
                        isActive: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 transition-all cursor-pointer"
                  />
                  <span className="font-bold text-slate-700 select-none">Ativar imediatamente</span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer relative">
                  <input 
                    type="checkbox" 
                    name="autoApproveParticipations"
                    checked={formData.autoApproveParticipations}
                    onChange={(e) =>
                      setDraftFormData((prev) => ({
                        ...(prev ?? initialFormData),
                        autoApproveParticipations: e.target.checked,
                      }))
                    }
                    disabled={!canUseAutoApproval}
                    className="mt-0.5 w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 transition-all cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-700 select-none block">
                      Aprovar postagens automaticamente
                    </span>
                    <span className="text-xs text-slate-500">
                      {canUseAutoApproval
                        ? 'Quando essa opção estiver ativa, o backend aprova sozinho as participações elegíveis e já gera o cupom sem moderador humano.'
                        : 'O plano Free opera com validacao manual. Faça upgrade para liberar autoaprovacao.'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={isPending}
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isPending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Campanha'}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}

export default function NovaCampanhaPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500" /></div>}>
      <CampaignForm />
    </Suspense>
  )
}
