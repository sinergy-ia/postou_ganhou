"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {ArrowLeft, MapPin, Tag, Share2, Info, CheckCircle2, Navigation, Loader2} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/services/public-api';

export default function PromocaoDetalhes() {
  const params = useParams<{ id?: string | string[] }>();
  const campaignId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [isParticipating, setIsParticipating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'info' | 'error';
    message: string;
  } | null>(null);

  const { data: promo, isLoading } = useQuery({
    queryKey: ['public-campaign', campaignId],
    queryFn: () => publicApi.getCampaignById(campaignId as string),
    enabled: Boolean(campaignId),
  });

  const { data: galleryData } = useQuery({
    queryKey: ['public-campaign-gallery', campaignId],
    queryFn: () => publicApi.getGallery({ campaignId: campaignId as string, limit: 6 }),
    enabled: Boolean(campaignId),
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  if (!promo) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Promoção não encontrada</div>;

  const est = promo.establishment || { name: 'Estabelecimento', avatar: 'https://ui-avatars.com/api/?name=EP', cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&h=300&fit=crop', address: 'Endereço', category: 'Local', description: '' };
  const galleryItems: Array<Record<string, any>> = galleryData?.items || [];
  const visibleGalleryItems = galleryItems.filter((item: any) => Boolean(item.imageUrl));
  const instagramHandle = String(est.instagramHandle || '').replace(/^@+/, '').trim();
  const hasValidCoordinates =
    Number.isFinite(Number(est.lat)) &&
    Number.isFinite(Number(est.lng)) &&
    !(Number(est.lat) === 0 && Number(est.lng) === 0);
  const mapsDestination = hasValidCoordinates
    ? `${est.lat},${est.lng}`
    : [est.address, est.name].filter(Boolean).join(' ');

  const handleParticipate = async () => {
    setIsParticipating(true);
    setActionFeedback(null);

    try {
      if (!instagramHandle) {
        setActionFeedback({
          type: 'error',
          message: 'O Instagram do estabelecimento não está disponível no momento.',
        });
        return;
      }

      window.open(
        `https://www.instagram.com/${instagramHandle}/`,
        '_blank',
        'noopener,noreferrer',
      );

      const hashtag = String(promo.hashtagRequired || '').trim();

      if (hashtag && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(hashtag);
          setActionFeedback({
            type: 'info',
            message: `Abrimos o Instagram do estabelecimento e copiamos ${hashtag} para você.`,
          });
          return;
        } catch {
          // Ignore clipboard failures and fall back to a generic message.
        }
      }

      setActionFeedback({
        type: 'info',
        message:
          'Abrimos o Instagram do estabelecimento. Publique um story marcando o perfil e usando a hashtag da promoção.',
      });
    } finally {
      setIsParticipating(false);
    }
  };

  const handleOpenRoute = () => {
    setActionFeedback(null);

    if (!mapsDestination) {
      setActionFeedback({
        type: 'error',
        message: 'Endereço do estabelecimento indisponível para abrir a rota.',
      });
      return;
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      mapsDestination,
    )}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (!shareUrl) {
      setActionFeedback({
        type: 'error',
        message: 'Não foi possível gerar o link da promoção para compartilhar.',
      });
      return;
    }

    setIsSharing(true);
    setActionFeedback(null);

    try {
      const payload = {
        title: `${promo.title} | ${est.name}`,
        text: `Olha essa promoção: ${promo.title}${promo.baseReward ? ` - ${promo.baseReward}` : ''}`,
        url: shareUrl,
      };

      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(payload);
        setActionFeedback({
          type: 'info',
          message: 'Promoção compartilhada com sucesso.',
        });
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setActionFeedback({
          type: 'info',
          message: 'Link da promoção copiado para a área de transferência.',
        });
        return;
      }

      setActionFeedback({
        type: 'error',
        message: 'Seu navegador não suporta compartilhamento nesta página.',
      });
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        setActionFeedback({
          type: 'error',
          message: 'Não foi possível compartilhar a promoção agora.',
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Cover */}
      <div className="h-64 md:h-96 relative w-full bg-slate-200">
        <img src={est.cover} alt={est.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        
        <div className="absolute top-6 left-6 z-10">
          <Link href="/promocoes" className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        <div className="absolute bottom-0 inset-x-0">
          <div className="container mx-auto px-4 max-w-5xl translate-y-6">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-white shrink-0">
                <img src={est.avatar} alt={est.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 pb-6 text-white text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                  <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur rounded-full text-white">
                    {est.category}
                  </span>
                  {(promo.badges || []).map((b: string) => (
                    <span key={b} className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-primary-500 rounded-full text-white">
                      {b}
                    </span>
                  ))}
                </div>
                <h1 className="font-heading font-black text-3xl md:text-5xl drop-shadow-md mb-2">{est.name}</h1>
                <p className="flex items-center justify-center md:justify-start gap-1 text-slate-200 text-sm md:text-base">
                  <MapPin className="w-4 h-4" /> {est.address}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-16 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
              <h2 className="font-heading font-bold text-2xl md:text-3xl text-slate-900 mb-4">{promo.title}</h2>
              <p className="text-slate-600 text-lg leading-relaxed">{promo.description}</p>
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-primary-50 border border-primary-100 rounded-2xl">
                  <div className="text-primary-600 mb-1 font-medium text-sm">Recompensa Inicial</div>
                  <div className="font-bold text-xl text-primary-900 flex items-center gap-2">
                    <Tag className="w-5 h-5" /> {promo.baseReward}
                  </div>
                  <div className="mt-2 text-xs text-primary-700">
                    Meta de likes: {promo.baseLikesRequired ?? 0}
                  </div>
                </div>
                <div className="p-4 bg-secondary-50 border border-secondary-100 rounded-2xl">
                  <div className="text-secondary-600 mb-1 font-medium text-sm">Recompensa Máxima ✨</div>
                  <div className="font-bold text-xl text-secondary-900 flex items-center gap-2">
                    {promo.maxReward || 'Sem recompensa máxima adicional'}
                  </div>
                  <div className="mt-2 text-xs text-secondary-700">
                    {promo.maxReward && promo.maxLikesRequired !== undefined
                      ? `Meta de likes: ${promo.maxLikesRequired}`
                      : promo.maxReward
                        ? 'Meta maxima definida pelo lojista na moderacao'
                        : 'A campanha trabalha apenas com a recompensa base'}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
              <h3 className="font-heading font-bold text-2xl text-slate-900 mb-6 flex items-center gap-2">
                <Info className="w-6 h-6 text-primary-600" /> Regras da Promoção
              </h3>
              <ul className="space-y-4">
                {(promo.rules || []).map((rule: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-700">
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                    <span className="pt-0.5">{rule}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="hidden md:block">
               <h3 className="font-heading font-bold text-2xl text-slate-900 mb-6">Galeria de Participantes</h3>
               {visibleGalleryItems.length > 0 ? (
                 <div className="grid grid-cols-3 gap-4">
                   {visibleGalleryItems.map((item: any) => (
                     <div key={item.id} className="aspect-square bg-slate-200 rounded-2xl overflow-hidden relative group">
                       <img src={item.imageUrl} alt={item.userName || item.userHandle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                       <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-3 pt-6 text-white text-xs font-medium">
                         {item.userHandle} • {item.discountEarned || 'Recompensa liberada'}
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                   Ainda não existem stories públicos disponíveis para esta campanha.
                 </div>
               )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-primary-900/5 border border-primary-100 sticky top-24">
              <div className="text-center mb-6">
                <h3 className="font-bold text-slate-900 text-lg mb-1">Estatísticas</h3>
                <div className="flex items-center justify-center gap-4 text-sm mt-4">
                  <div className="text-center px-4">
                    <div className="font-black text-2xl text-primary-600">{(promo.stats as any)?.participants || 0}</div>
                    <div className="text-slate-500 text-xs">Participaram</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-center px-4">
                    <div className="font-black text-2xl text-secondary-500">{(promo.stats as any)?.avgLikes || 0}</div>
                    <div className="text-slate-500 text-xs">Média Likes</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleParticipate}
                  disabled={isParticipating}
                  className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-md shadow-primary-200 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isParticipating && <Loader2 className="w-5 h-5 animate-spin" />}
                  Quero Participar
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleOpenRoute}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" /> Rota
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={isSharing}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSharing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    Compartilhar
                  </button>
                </div>
                {actionFeedback ? (
                  <div
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      actionFeedback.type === 'error'
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-primary-100 bg-primary-50 text-primary-700'
                    }`}
                  >
                    {actionFeedback.message}
                  </div>
                ) : null}
              </div>
              <p className="text-center text-xs text-slate-400 mt-4">
                Válido até {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString('pt-BR') : 'Data Indefinida'}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200">
               <h3 className="font-bold text-slate-900 mb-4">Sobre o local</h3>
               <p className="text-sm text-slate-600 mb-4">{est.description}</p>
               <button
                 type="button"
                 onClick={handleOpenRoute}
                 className="aspect-video w-full bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 overflow-hidden relative cursor-pointer"
               >
                 <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=80" alt="Map" className="w-full h-full object-cover opacity-50 absolute" />
                 <span className="relative z-10 flex items-center gap-2 drop-shadow-md bg-white/80 px-3 py-1.5 rounded-full text-sm font-medium text-slate-800 backdrop-blur"><MapPin className="w-4 h-4 text-primary-600"/> Ver no mapa</span>
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
