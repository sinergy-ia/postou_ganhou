"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/services/public-api';
import { Search, MapPin, Filter, Star, Tag, ChevronDown, Loader2 } from 'lucide-react';

export default function PromocoesPage() {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const categories = ['Todos', 'Restaurantes', 'Cafeterias', 'Hamburguerias', 'Moda'];

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: [
      'public-campaigns',
      activeCategory,
      searchQuery,
      locationFilter?.lat || null,
      locationFilter?.lng || null,
    ],
    queryFn: () => publicApi.getCampaigns({
      category: activeCategory === 'Todos' ? undefined : activeCategory,
      search: searchQuery || undefined,
      lat: locationFilter?.lat,
      lng: locationFilter?.lng,
    })
  });

  const campaigns = campaignsData?.items || [];

  const handleNearMeClick = () => {
    if (locationFilter) {
      setLocationFilter(null);
      setLocationError('');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Seu navegador não suporta geolocalização.');
      return;
    }

    setIsLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationFilter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Permita o acesso à localização para ver promoções perto de você.'
            : 'Não foi possível obter sua localização agora.';
        setLocationError(message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Header / Search Area */}
      <div className="bg-primary-900 border-b border-primary-800 py-12 px-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary-800/50 to-transparent pointer-events-none" />
        <div className="container relative z-10 mx-auto max-w-5xl">
          <h1 className="font-heading font-black text-3xl md:text-5xl text-white mb-6 text-center">
            Encontre Promoções Incríveis
          </h1>
          <p className="text-primary-100 text-center mb-8 max-w-2xl mx-auto">
            Descubra os melhores lugares e seja recompensado por compartilhar suas experiências.
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-11 pr-4 py-4 rounded-xl border-0 bg-white text-slate-900 placeholder:text-slate-400 caret-primary-600 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-lg shadow-lg"
                placeholder="Buscar por restaurante, loja ou prato..."
              />
            </div>
            <button
              type="button"
              onClick={handleNearMeClick}
              disabled={isLocating}
              className={`px-8 py-4 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                locationFilter
                  ? 'bg-primary-600 hover:bg-primary-700'
                  : 'bg-accent-500 hover:bg-accent-600'
              } ${isLocating ? 'cursor-wait opacity-80' : ''}`}
            >
              {isLocating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
              {isLocating
                ? 'Localizando...'
                : locationFilter
                  ? 'Remover proximidade'
                  : 'Perto de mim'}
            </button>
          </div>
          {locationError ? (
            <p className="mt-3 text-center text-sm text-amber-200">
              {locationError}
            </p>
          ) : locationFilter ? (
            <p className="mt-3 text-center text-sm text-primary-100">
              Mostrando promoções próximas da sua localização.
            </p>
          ) : null}
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 max-w-7xl flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between font-bold text-slate-900 mb-4 pb-4 border-b border-slate-100">
              <span className="flex items-center gap-2"><Filter className="w-4 h-4" /> Filtros</span>
              <span className="text-xs text-primary-600 cursor-pointer hover:underline">Limpar</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-slate-800 mb-3">Categorias</h3>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <label key={cat} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer group">
                      <input type="radio" name="category" className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-600" defaultChecked={cat === 'Todos'} onClick={() => setActiveCategory(cat)} />
                      <span className="group-hover:text-primary-600 transition-colors">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-sm text-slate-800 mb-3">Tipo de post</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-600" />
                    <span className="group-hover:text-primary-600 transition-colors">Story</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-600" />
                    <span className="group-hover:text-primary-600 transition-colors">Post no Feed</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-sm text-slate-800 mb-3">Distância</h3>
                <input type="range" className="w-full accent-primary-600" min="1" max="20" defaultValue="5" />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1 km</span>
                  <span>20 km</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <p className="text-slate-600">Mostrando <strong>{campaigns.length} promoções</strong></p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Ordenar por:</span>
              <button className="font-medium text-slate-900 border border-slate-200 bg-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-colors">
                Mais recentes <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {isLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500 bg-white border border-slate-200 rounded-2xl">
                Nenhuma promoção encontrada. Tente buscar algo diferente.
              </div>
            ) : (
              campaigns.map((promo: any) => {
                const promoId = promo.id || promo._id;
                const est = promo.establishment || { name: 'Estabelecimento Padrão', cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&h=300&fit=crop', avatar: 'https://ui-avatars.com/api/?name=EP', distance: '1.2 km' };
                return (
                  <div key={promoId} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:border-primary-200 transition-all group flex flex-col">
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img src={est.cover} alt={est.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      {(promo.badges || []).map((badge: string) => (
                        <span key={badge} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur rounded-full text-slate-900 shadow-sm">
                          {badge}
                        </span>
                      ))}
                    </div>
                    <div className="absolute bottom-4 left-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-md">
                        <img src={est.avatar} alt={est.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-white">
                        <p className="font-bold text-lg leading-tight drop-shadow-md">{est.name}</p>
                        <p className="text-xs opacity-90 flex items-center gap-1"><MapPin className="w-3 h-3" /> {est.distance}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h2 className="font-heading font-bold text-xl text-slate-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                        {promo.title}
                      </h2>
                    </div>
                    <p className="text-sm text-slate-600 mb-6 line-clamp-2">{promo.description}</p>
                    
                    <div className="mt-auto space-y-4">
                      <div className="flex bg-slate-50 p-3 rounded-xl border border-slate-100 items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                            <Tag className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Recompensa</span>
                        </div>
                        <span className="font-bold text-primary-700">{promo.baseReward}</span>
                      </div>
                      
                      {promoId ? (
                        <Link href={`/promocoes/${promoId}`} className="block w-full text-center py-3 bg-slate-900 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors">
                          Ver Detalhes
                        </Link>
                      ) : (
                        <span className="block w-full text-center py-3 bg-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed">
                          Detalhes indisponíveis
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>

          <div className="mt-12 flex justify-center">
            <button className="px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors shadow-sm">
              Carregar mais promoções
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
