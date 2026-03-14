"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Pause,
  Play,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/services/public-api';

const STORY_DURATION_MS = 4500;
const STORY_PROGRESS_TICK_MS = 100;
const FALLBACK_ESTABLISHMENT_NAME = 'Estabelecimento';
const FALLBACK_ESTABLISHMENT_AVATAR = 'https://ui-avatars.com/api/?name=EP';

const baseFilters = ['Recentes', 'Restaurantes', 'Lojas'] as const;
const defaultCategoryFilters = [
  'Cafeterias',
  'Hamburguerias',
  'Moda',
  'Serviços',
  'Outros',
] as const;
const knownCategoryFilterSet = new Set<string>([
  ...baseFilters,
  ...defaultCategoryFilters,
]);

type GalleryFilter = string;

interface GalleryPost {
  id: string;
  imageUrl?: string | null;
  likes?: number | null;
  discountEarned?: string | null;
  type?: string | null;
  badges?: string[] | null;
  createdAt?: string | null;
  userAvatar?: string | null;
  userName?: string | null;
  userHandle?: string | null;
  establishment?: {
    name?: string | null;
    avatar?: string | null;
    category?: string | null;
  } | null;
  client?: {
    name?: string | null;
  } | null;
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function resolveCategoryFilterLabel(category?: string | null) {
  const normalizedCategory = normalizeText(category);

  switch (normalizedCategory) {
    case 'sem categoria':
      return '';
    case 'restaurante':
    case 'restaurantes':
    case 'restaurante / bar':
    case 'bar':
    case 'bares':
      return 'Restaurantes';
    case 'cafeteria':
    case 'cafeterias':
    case 'cafe':
    case 'cafes':
      return 'Cafeterias';
    case 'hamburgueria':
    case 'hamburguerias':
      return 'Hamburguerias';
    case 'moda':
    case 'vestuario':
    case 'vestuario / moda':
      return 'Moda';
    case 'loja':
    case 'lojas':
      return 'Lojas';
    case 'servico':
    case 'servicos':
      return 'Serviços';
    case 'outro':
    case 'outros':
      return 'Outros';
    default:
      return String(category || '').trim();
  }
}

function isRestaurantCategory(category?: string | null) {
  const normalizedCategory = normalizeText(category);

  return [
    'restaurante',
    'restaurantes',
    'cafeteria',
    'cafeterias',
    'cafe',
    'cafes',
    'hamburgueria',
    'hamburguerias',
    'pizzaria',
    'lanchonete',
    'bar',
    'bares',
    'padaria',
    'sorveteria',
    'acai',
    'food',
  ].some((keyword) => normalizedCategory.includes(keyword));
}

function isStoreCategory(category?: string | null) {
  const normalizedCategory = normalizeText(category);

  return [
    'loja',
    'lojas',
    'moda',
    'vestuario',
    'vestuario / moda',
    'boutique',
    'calcado',
    'calcados',
    'acessorio',
    'acessorios',
    'cosmetico',
    'cosmeticos',
    'beleza',
  ].some((keyword) => normalizedCategory.includes(keyword));
}

function getCreatedAtTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatStoryDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(parsed);
}

export default function GaleriaPage() {
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>('Recentes');
  const [brokenImageUrls, setBrokenImageUrls] = useState<string[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);

  const { data: galleryData, isLoading } = useQuery({
    queryKey: ['public-gallery'],
    queryFn: () => publicApi.getGallery(),
  });

  const posts = useMemo<GalleryPost[]>(() => {
    return Array.isArray(galleryData?.items)
      ? (galleryData.items as GalleryPost[])
      : [];
  }, [galleryData]);

  const filters = useMemo(() => {
    const dynamicCategoryFilters = Array.from(
      new Set(
        posts
          .map((post) => resolveCategoryFilterLabel(post.establishment?.category))
          .filter(
            (filter): filter is string =>
              Boolean(filter) && !knownCategoryFilterSet.has(filter),
          ),
      ),
    ).sort((left, right) => left.localeCompare(right, 'pt-BR'));

    return [...baseFilters, ...defaultCategoryFilters, ...dynamicCategoryFilters];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const items = [...posts].sort(
      (a, b) => getCreatedAtTimestamp(b.createdAt) - getCreatedAtTimestamp(a.createdAt),
    );

    switch (activeFilter) {
      case 'Restaurantes':
        return items.filter((post) =>
          isRestaurantCategory(post.establishment?.category),
        );
      case 'Lojas':
        return items.filter((post) => isStoreCategory(post.establishment?.category));
      case 'Recentes':
        return items;
      default:
        return items.filter(
          (post) =>
            resolveCategoryFilterLabel(post.establishment?.category) === activeFilter,
        );
    }
  }, [activeFilter, posts]);

  const visiblePosts = useMemo(
    () =>
      filteredPosts.filter(
        (post) =>
          Boolean(post.imageUrl) && !brokenImageUrls.includes(post.imageUrl || ''),
      ),
    [brokenImageUrls, filteredPosts],
  );

  const topPosts = useMemo(
    () =>
      [...visiblePosts]
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 3),
    [visiblePosts],
  );

  const safeActiveStoryIndex =
    visiblePosts.length > 0 ? activeStoryIndex % visiblePosts.length : 0;
  const activeStory = visiblePosts[safeActiveStoryIndex] || null;
  const activeEstablishment = activeStory?.establishment || {
    name: FALLBACK_ESTABLISHMENT_NAME,
    avatar: FALLBACK_ESTABLISHMENT_AVATAR,
  };
  const activeEstablishmentName =
    activeEstablishment.name || FALLBACK_ESTABLISHMENT_NAME;
  const activeEstablishmentAvatar =
    activeEstablishment.avatar || FALLBACK_ESTABLISHMENT_AVATAR;
  const activeUserName =
    activeStory?.userName || activeStory?.client?.name || 'Usuário';
  const activeUserHandle = activeStory?.userHandle || '@comunidade';
  const activeUserAvatar =
    activeStory?.userAvatar ||
    `https://ui-avatars.com/api/?name=${activeStory?.userName || activeUserHandle || activeUserName}`;
  const activeCategory =
    resolveCategoryFilterLabel(activeStory?.establishment?.category) ||
    activeStory?.establishment?.category ||
    'Categoria';

  useEffect(() => {
    if (!visiblePosts.length || isStoryPaused) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setStoryProgress((currentProgress) => {
        const nextProgress =
          currentProgress + (STORY_PROGRESS_TICK_MS / STORY_DURATION_MS) * 100;

        if (nextProgress >= 100) {
          setActiveStoryIndex(
            (currentIndex) => (currentIndex + 1) % visiblePosts.length,
          );
          return 0;
        }

        return nextProgress;
      });
    }, STORY_PROGRESS_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [isStoryPaused, visiblePosts.length]);

  const handleBrokenPostImage = (imageUrl?: string | null) => {
    if (!imageUrl) {
      return;
    }

    setBrokenImageUrls((current) =>
      current.includes(imageUrl) ? current : [...current, imageUrl],
    );
  };

  const handleStoryChange = (nextIndex: number) => {
    if (!visiblePosts.length) {
      return;
    }

    const safeIndex = (nextIndex + visiblePosts.length) % visiblePosts.length;
    setActiveStoryIndex(safeIndex);
    setStoryProgress(0);
  };

  const handlePreviousStory = () => {
    handleStoryChange(activeStoryIndex - 1);
  };

  const handleNextStory = () => {
    handleStoryChange(activeStoryIndex + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-slate-900 px-4 py-16 text-white">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="mb-4 text-4xl font-black md:text-5xl">
            Galeria de <span className="text-secondary-400">Recompensas</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-slate-300 md:text-lg">
            Veja o que a comunidade esta compartilhando e os descontos que estao
            ganhando pelos lugares da cidade.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setActiveFilter(filter);
                  setActiveStoryIndex(0);
                  setStoryProgress(0);
                  setIsStoryPaused(false);
                }}
                className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                  activeFilter === filter
                    ? 'bg-secondary-500 text-white shadow-lg shadow-secondary-500/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-12 flex max-w-7xl flex-col gap-8 px-4 lg:flex-row">
        <div className="flex-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : !activeStory ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">
              Nenhuma participacao encontrada.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
                    Visualizacao estilo story
                  </div>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    {visiblePosts.length} story
                    {visiblePosts.length === 1 ? '' : 's'} na galeria
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    As postagens passam automaticamente, como um viewer de stories.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePreviousStory}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-600"
                    aria-label="Story anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsStoryPaused((current) => !current)}
                    className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    {isStoryPaused ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                    {isStoryPaused ? 'Continuar' : 'Pausar'}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStory}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-600"
                    aria-label="Proximo story"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mx-auto max-w-md">
                <div className="rounded-[38px] border border-slate-200 bg-slate-950 p-3 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.65)]">
                  <div
                    className="relative aspect-[9/16] overflow-hidden rounded-[30px] bg-slate-900"
                    onMouseEnter={() => setIsStoryPaused(true)}
                    onMouseLeave={() => setIsStoryPaused(false)}
                  >
                    <button
                      type="button"
                      onClick={handlePreviousStory}
                      className="absolute inset-y-0 left-0 z-10 w-1/2 bg-transparent"
                      aria-label="Voltar story"
                    />
                    <button
                      type="button"
                      onClick={handleNextStory}
                      className="absolute inset-y-0 right-0 z-10 w-1/2 bg-transparent"
                      aria-label="Avancar story"
                    />

                    <img
                      src={activeStory.imageUrl || undefined}
                      alt={`Story de ${activeUserName}`}
                      className="h-full w-full object-cover"
                      onError={() => handleBrokenPostImage(activeStory.imageUrl)}
                    />

                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/15 to-black/80" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_48%)]" />

                    <div className="absolute inset-x-0 top-0 z-20 p-4">
                      <div className="mb-4 flex gap-1.5">
                        {visiblePosts.map((post, index) => (
                          <button
                            key={post.id}
                            type="button"
                            onClick={() => handleStoryChange(index)}
                            className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
                            aria-label={`Abrir story ${index + 1}`}
                          >
                            <div
                              className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear"
                              style={{
                                width: `${
                                  index < safeActiveStoryIndex
                                    ? 100
                                    : index === safeActiveStoryIndex
                                      ? storyProgress
                                      : 0
                                }%`,
                              }}
                            />
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 overflow-hidden rounded-full border border-white/30 bg-white/10 shadow-lg">
                          <img
                            src={activeUserAvatar}
                            alt={activeUserName}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">
                            {activeUserName}
                          </div>
                          <div className="truncate text-xs text-white/70">
                            {activeUserHandle}
                          </div>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
                            {safeActiveStoryIndex + 1}/{visiblePosts.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 z-20 p-4">
                      <div className="rounded-[28px] border border-white/15 bg-black/35 p-4 backdrop-blur-md">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">
                            <Camera className="h-3.5 w-3.5" />
                            Formato story
                          </div>

                          <div className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">
                            {activeCategory}
                          </div>

                          {(activeStory.badges || []).includes('Top da semana') ? (
                            <div className="rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                              Top da semana
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-lg">
                            <img
                              src={activeEstablishmentAvatar}
                              alt={activeEstablishmentName}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-base font-bold text-white">
                              {activeEstablishmentName}
                            </div>
                            <div className="truncate text-sm text-white/70">
                              Recompensa: {activeStory.discountEarned || 'Recompensa'}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                              Engajamento
                            </div>
                            <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                              <Heart className="h-4 w-4 fill-white text-white" />
                              {activeStory.likes || 0} curtidas
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                              Publicado em
                            </div>
                            <div className="text-sm font-bold text-white">
                              {formatStoryDate(activeStory.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto pb-2">
                  <div className="flex gap-3">
                    {visiblePosts.map((post, index) => {
                      const storyEstablishment =
                        post.establishment || activeEstablishment;
                      const storyEstablishmentName =
                        storyEstablishment.name || FALLBACK_ESTABLISHMENT_NAME;

                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => handleStoryChange(index)}
                          className={`min-w-[148px] rounded-3xl border bg-white p-3 text-left shadow-sm transition-all ${
                            index === safeActiveStoryIndex
                              ? 'border-primary-300 ring-2 ring-primary-200'
                              : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                          }`}
                        >
                          <div className="relative mb-3 aspect-[9/16] overflow-hidden rounded-2xl bg-slate-100">
                            <img
                              src={post.imageUrl || undefined}
                              alt={`Miniatura de ${post.userName || post.userHandle || 'story'}`}
                              className="h-full w-full object-cover"
                              onError={() => handleBrokenPostImage(post.imageUrl)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                              {index + 1}
                            </div>
                          </div>

                          <div className="truncate text-sm font-bold text-slate-900">
                            {storyEstablishmentName}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {post.discountEarned || 'Recompensa'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="w-full shrink-0 lg:w-80">
          <div className="sticky top-24 rounded-3xl bg-gradient-to-br from-primary-600 to-indigo-700 p-6 text-white shadow-xl">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <span className="text-2xl">🏆</span>
            </div>
            <h3 className="mb-2 text-xl font-bold">Top 3 da Semana</h3>
            <p className="mb-6 text-sm text-primary-100">
              Os posts com maior engajamento que garantiram as maiores recompensas.
            </p>

            <div className="space-y-4">
              {topPosts.map((post, index) => (
                <div
                  key={post.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm"
                >
                  <div className="w-6 text-center text-2xl font-black text-primary-200 opacity-50">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {post.userName || post.userHandle}
                    </div>
                    <div className="truncate text-xs text-primary-200">
                      {post.discountEarned || 'Recompensa'}
                    </div>
                  </div>
                  <div className="flex h-10 w-12 flex-col items-center justify-center rounded-lg bg-white/20 px-2 text-xs font-bold">
                    <Heart className="mb-0.5 h-3 w-3 fill-secondary-300 text-secondary-300" />
                    <span>{(post.likes || 0) > 1000 ? '1k+' : post.likes || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
