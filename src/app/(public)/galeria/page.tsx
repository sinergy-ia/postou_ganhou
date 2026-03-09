"use client";

import { useState } from 'react';
import { Camera, Heart, Tag, Search, Filter, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/services/public-api';

export default function GaleriaPage() {
  const [activeFilter, setActiveFilter] = useState('Recentes');
  const filters = ['Recentes', 'Mais Curtidos', 'Restaurantes', 'Lojas'];

  const { data: galleryData, isLoading } = useQuery({
    queryKey: ['public-gallery'],
    queryFn: () => publicApi.getGallery()
  });

  const posts = galleryData?.items || [];
  const topPosts = [...posts].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3);

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="font-heading font-black text-4xl md:text-5xl mb-4">
            Galeria de <span className="text-secondary-400">Recompensas</span>
          </h1>
          <p className="text-slate-300 md:text-lg max-w-2xl mx-auto mb-8">
            Veja o que a comunidade está compartilhando e os descontos que estão ganhando pelos lugares da cidade.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
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

      <div className="container mx-auto px-4 mt-12 max-w-7xl flex flex-col lg:flex-row gap-8">
        
        {/* Main Content: Masonry-like Grid */}
        <div className="flex-1 columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : posts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              Nenhuma participação encontrada.
            </div>
          ) : posts.map((post: any) => {
            const est = post.establishment || { name: 'Estabelecimento', avatar: 'https://ui-avatars.com/api/?name=EP' };
            
            return (
               <div key={post.id} className="break-inside-avoid bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                 <div className="relative">
                   <img src={post.imageUrl} alt="Post do usuário" className="w-full h-auto object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                   <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 shadow-sm flex items-center gap-1.5">
                     <Camera className="w-3.5 h-3.5" /> {post.type === 'story' ? 'Story' : 'Post'}
                   </div>
                   {(post.badges || []).includes('Top da semana') && (
                     <div className="absolute top-4 right-4 bg-gradient-to-r from-accent-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                       🔥 Top da semana
                     </div>
                   )}
                 </div>
                 
                 <div className="p-5">
                   {/* User info */}
                   <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100">
                       <img src={post.userAvatar || `https://ui-avatars.com/api/?name=${post.userName || post.userHandle}`} alt={post.userName} className="w-full h-full object-cover" />
                     </div>
                     <div>
                       <div className="font-bold text-slate-900 text-sm">{post.userName || ((post as any).client?.name) || 'Usuário'}</div>
                       <div className="text-slate-500 justify-between text-xs">{post.userHandle}</div>
                     </div>
                     <div className="ml-auto text-xs text-slate-400">{post.createdAt ? new Date(post.createdAt).toLocaleDateString('pt-BR') : ''}</div>
                   </div>
                   
                   {/* Reward info */}
                   <div className="bg-primary-50 rounded-2xl p-4 border border-primary-100 flex items-center justify-between">
                     <div>
                       <div className="text-xs text-primary-600 font-medium mb-1">Recompensa liberada:</div>
                       <div className="font-bold text-primary-900 flex items-center gap-1.5">
                         <Tag className="w-4 h-4" /> {post.discountEarned || 'Recompensa'}
                       </div>
                     </div>
                     <div className="flex items-center gap-1.5 text-secondary-600 bg-white px-2 py-1 rounded-full text-xs font-bold shadow-sm">
                       <Heart className="w-3.5 h-3.5 fill-secondary-600" /> {post.likes || 0}
                     </div>
                   </div>
                   
                   <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 cursor-pointer group/est">
                     <div className="w-6 h-6 rounded-md overflow-hidden shrink-0">
                       <img src={est.avatar} alt={est.name} className="w-full h-full object-cover" />
                     </div>
                     <div className="text-sm font-medium text-slate-700 group-hover/est:text-primary-600 transition-colors">
                       Em <span className="font-bold">{est.name}</span>
                     </div>
                   </div>
                 </div>
               </div>
            );
          })}
        </div>
        
        {/* Sidebar Highlight */}
        <aside className="w-full lg:w-80 shrink-0">
          <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl sticky top-24">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-2xl">🏆</span>
            </div>
            <h3 className="font-heading font-bold text-xl mb-2">Top 3 da Semana</h3>
            <p className="text-primary-100 text-sm mb-6">Os posts com maior engajamento que garantiram as maiores recompensas.</p>
            
            <div className="space-y-4">
              {topPosts.map((p: any, i) => (
                <div key={i} className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm border border-white/20 flex items-center gap-3">
                  <div className="font-black text-2xl text-primary-200 opacity-50 w-6 text-center">
                    {i+1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{p.userName || p.userHandle}</div>
                    <div className="text-xs text-primary-200 truncate">{p.discountEarned || 'Recompensa'}</div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-white/20 rounded-lg px-2 text-xs font-bold w-12 h-10">
                    <Heart className="w-3 h-3 text-secondary-300 fill-secondary-300 mb-0.5" />
                    <span>{(p.likes || 0) > 1000 ? '1k+' : p.likes || 0}</span>
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
