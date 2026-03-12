"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { Camera, MapPin, Tag, ArrowRight, Star, Heart, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import PublicSponsoredCard from '@/components/sponsored-highlights/PublicSponsoredCard';
import {
  buildPublicSponsoredCards,
  filterPublicSponsoredCards,
} from '@/lib/sponsored-highlights-public';
import { publicApi } from '@/services/public-api';
import { sponsoredHighlightsApi } from '@/services/sponsored-highlights-api';

interface HomePlace {
  id: string;
  name: string;
  cover: string;
  avatar: string;
  category?: string;
  distance?: string;
  description?: string;
}

export default function Home() {
  const { data: establishmentsData, isLoading: isLoadingPlaces } = useQuery({
    queryKey: ['public-establishments'],
    queryFn: () => publicApi.getEstablishments()
  });

  const { data: sponsoredCampaigns } = useQuery({
    queryKey: ['public-sponsored-campaigns', 'home'],
    queryFn: sponsoredHighlightsApi.getPublicCampaigns,
  });

  const featuredPlaces: HomePlace[] = (establishmentsData?.slice(0, 3) || []) as HomePlace[];
  const heroPlace: Pick<HomePlace, 'name' | 'cover'> = featuredPlaces[0] || {
    name: 'Marque & Ganhe',
    cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
  };
  const sponsoredCards = useMemo(
    () => buildPublicSponsoredCards(sponsoredCampaigns),
    [sponsoredCampaigns],
  );
  const homeSponsoredCards = useMemo(
    () => filterPublicSponsoredCards(sponsoredCards, { placement: 'home' }).slice(0, 3),
    [sponsoredCards],
  );
  const carouselSponsoredCards = useMemo(
    () => filterPublicSponsoredCards(sponsoredCards, { placement: 'carousel' }).slice(0, 6),
    [sponsoredCards],
  );

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-20 lg:py-32">
        <div className="absolute top-0 right-0 -m-32 blur-3xl rounded-full bg-primary-200/50 w-96 h-96" />
        <div className="absolute bottom-0 left-0 -m-32 blur-3xl rounded-full bg-secondary-200/50 w-96 h-96" />
        
        <div className="container relative z-10 mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <h1 className="font-heading font-black text-5xl lg:text-7xl tracking-tighter text-slate-900 leading-[1.1]">
              Poste, ganhe <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-500">descontos</span> e descubra lugares incríveis
            </h1>
            <p className="text-lg text-slate-600 max-w-xl mx-auto lg:mx-0">
              A primeira plataforma onde seus stories valem cupons e recompensas exclusivas nos melhores restaurantes e lojas da cidade.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link href="/promocoes" className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-full transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-2 group">
                Explorar Promoções
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/para-estabelecimentos" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 font-medium rounded-full transition-all shadow-sm flex items-center justify-center">
                Para Estabelecimentos
              </Link>
            </div>
            
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500 font-medium">
              <div className="flex -space-x-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                  </div>
                ))}
              </div>
              <p>+10.000 clientes já ganharam</p>
            </div>
          </div>
          
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            {/* Visual Composition / Mockup */}
            <div className="relative w-full aspect-[4/5] bg-gradient-to-tr from-primary-100 to-secondary-100 rounded-[2.5rem] p-6 shadow-2xl rotate-2">
              <div className="w-full h-full bg-white rounded-3xl shadow-sm overflow-hidden border-8 border-white relative">
                {/* App like UI Mock */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="font-heading font-bold text-lg">Marque &amp; Ganhe</div>
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center"><Heart className="w-4 h-4" /></div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="w-full h-40 bg-slate-200 animate-pulse rounded-xl overflow-hidden relative group">
                    <img src={heroPlace.cover} className="w-full h-full object-cover" alt={heroPlace.name} />
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white">
                      <div className="font-bold">{heroPlace.name}</div>
                      <div className="text-xs opacity-90">Ganhe 15% OFF</div>
                    </div>
                  </div>
                  <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-primary-900">Cupom Liberado 🎉</div>
                      <div className="text-xs text-primary-700">YURUZU20OFF</div>
                    </div>
                    <div className="px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-full">Usar</div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -left-8 top-32 p-3 bg-white rounded-2xl shadow-xl flex items-center gap-3 animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Tag className="w-5 h-5"/></div>
                  <div>
                    <div className="text-xs font-bold">R$ 25 economizados</div>
                    <div className="text-[10px] text-slate-500">Há 5 min</div>
                  </div>
                </div>
                <div className="absolute -right-6 bottom-32 p-3 bg-white rounded-2xl shadow-xl flex items-center gap-3 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                  <div className="w-10 h-10 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center"><Camera className="w-5 h-5"/></div>
                  <div>
                    <div className="text-xs font-bold">+100 likes batidos</div>
                    <div className="text-[10px] text-slate-500">Recompensa máxima!</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-slate-900">Como funciona?</h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">Em apenas três passos você compartilha seu momento e garante vantagens reais.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 text-center flex flex-col items-center group hover:-translate-y-2 transition-transform duration-300">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary-600 mb-6 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                <MapPin className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl mb-3">1. Encontre a Promoção</h3>
              <p className="text-slate-600">Navegue pelas ofertas próximas e escolha o lugar que quer visitar.</p>
            </div>
            
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 text-center flex flex-col items-center group hover:-translate-y-2 transition-transform duration-300">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary-600 mb-6 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl mb-3">2. Poste nas Redes</h3>
              <p className="text-slate-600">Faça um Story caprichado marcando o estabelecimento.</p>
            </div>
            
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 text-center flex flex-col items-center group hover:-translate-y-2 transition-transform duration-300 relative">
              <div className="absolute top-4 right-4 text-secondary-500 animate-pulse">✨</div>
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary-600 mb-6 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                <Tag className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl mb-3">3. Ganhe seu Cupom</h3>
              <p className="text-slate-600">O sistema valida automaticamente e libera seu desconto na hora!</p>
            </div>
          </div>
        </div>
      </section>

      {homeSponsoredCards.length > 0 ? (
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <h2 className="font-heading font-bold text-3xl md:text-4xl text-slate-900">
                  Patrocinados do Momento
                </h2>
                <p className="mt-4 text-slate-600 max-w-2xl">
                  Campanhas com visibilidade extra para quem quer descobrir ofertas em destaque agora.
                </p>
              </div>
              <Link href="/promocoes" className="text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1 group">
                Ver promoções <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {homeSponsoredCards.map((card) => (
                <PublicSponsoredCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Estabelecimentos Destaque */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-slate-900">Lugares em Destaque</h2>
              <p className="mt-4 text-slate-600">Estabelecimentos com as melhores recompensas hoje.</p>
            </div>
            <Link href="/promocoes" className="text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1 group">
              Ver todos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoadingPlaces ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : featuredPlaces.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
                Nenhum estabelecimento em destaque encontrado no momento.
              </div>
            ) : featuredPlaces.map((place) => (
              <div key={place.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-shadow group">
                <div className="h-48 relative overflow-hidden">
                  <img src={place.cover} alt={place.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-accent-500 fill-accent-500" /> 4.9
                  </div>
                </div>
                <div className="p-6 relative">
                  <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden absolute -top-10 shadow-sm">
                    <img src={place.avatar} alt={place.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="mt-6 flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-xl text-slate-900">{place.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {[
                          place.category && place.category !== "Sem categoria"
                            ? place.category
                            : null,
                          place.distance || null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-slate-600 text-sm line-clamp-2">{place.description}</p>
                  <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                    <Link href={`/promocoes?est=${place.id}`} className="text-primary-600 font-bold hover:text-primary-700 text-sm">
                      Ver promoções ativas
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {carouselSponsoredCards.length > 0 ? (
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="mb-10">
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-slate-900">
                Vitrine Patrocinada
              </h2>
              <p className="mt-4 text-slate-600 max-w-2xl">
                Uma faixa rotativa de campanhas patrocinadas para ampliar a descoberta de restaurantes e lojas.
              </p>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-3">
              {carouselSponsoredCards.map((card) => (
                <PublicSponsoredCard
                  key={card.id}
                  card={card}
                  compact
                  className="min-w-[300px] max-w-[320px] shrink-0"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA Final */}
      <section className="py-24 bg-primary-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 -m-20 blur-3xl rounded-full bg-primary-500/30 w-96 h-96" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h2 className="font-heading font-bold text-3xl md:text-5xl text-white max-w-2xl mx-auto">
            Pronto para transformar seus posts em benefícios?
          </h2>
          <p className="mt-6 text-primary-100 text-lg max-w-xl mx-auto">
            Junte-se a milhares de clientes e estabelecimentos que estão mudando a forma de interagir.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/promocoes" className="px-8 py-4 bg-white text-primary-900 hover:bg-slate-50 font-bold rounded-full transition-all shadow-xl">
              Quero meus Descontos
            </Link>
            <Link href="/para-estabelecimentos" className="px-8 py-4 bg-primary-800 text-white hover:bg-primary-700 font-bold rounded-full transition-all border border-primary-700">
              Sou um Lojista
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
