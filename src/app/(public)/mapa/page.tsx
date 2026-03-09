"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/services/public-api';
import { Map as MapIcon, MapPin, Navigation, Tag, Star, Loader2 } from 'lucide-react';

export default function MapaPage() {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: establishmentsData, isLoading: isLoadingEst } = useQuery({
    queryKey: ['public-establishments-map', searchQuery, activeCategory],
    queryFn: () =>
      publicApi.getEstablishments({
        search: searchQuery || undefined,
        category: activeCategory || undefined,
      })
  });

  const { data: campaignsData } = useQuery({
    queryKey: ['public-campaigns-map'],
    queryFn: () => publicApi.getCampaigns()
  });

  const establishments = establishmentsData || [];
  const campaigns = campaignsData?.items || [];

  const selectedEst = selectedPin ? establishments.find((e: any) => e.id === selectedPin) : null;
  const selectedPromo = selectedEst ? campaigns.find((p: any) => p.establishmentId === selectedEst.id || p.establishment?.id === selectedEst.id) : null;
  const selectedPromoId = selectedPromo?.id || selectedPromo?._id;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-100 relative">
      
      {/* Search / Filters Overlay */}
      <div className="absolute top-4 inset-x-0 z-20 pointer-events-none px-4 flex flex-col items-center">
        <div className="w-full max-w-md bg-white p-2 rounded-2xl shadow-xl border border-slate-200 pointer-events-auto flex items-center">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar lugares próximos..."
            className="flex-1 border-none bg-transparent px-4 py-2 text-slate-900 placeholder:text-slate-400 caret-primary-600 outline-none focus:ring-0"
          />
          <div className="w-px h-6 bg-slate-200 mx-2"></div>
          <button className="p-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors">
            <MapIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex gap-2 mt-4 pointer-events-auto overflow-x-auto w-full max-w-lg pb-2 scrollbar-none px-4 justify-center">
          {['Restaurantes', 'Cafeterias', 'Moda', 'Hamburguerias'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory((current) => current === cat ? null : cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium shadow-sm transition-colors ${
                activeCategory === cat
                  ? 'bg-primary-600 text-white border border-primary-600'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mock Map Area */}
      <div className="flex-1 relative cursor-grab active:cursor-grabbing bg-[#e5e3df] flex items-center justify-center overflow-hidden">
        <div className="opacity-40 pointer-events-none absolute inset-0">
          {/* Simulated map graphic */}
          <div className="absolute h-full w-full bg-[url('https://www.transparenttextures.com/patterns/clean-gray-paper.png')]" />
          
          {/* Decorative lines for streets */}
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 200 Q 250 150 500 300 T 1000 200" stroke="#fff" strokeWidth="12" fill="none" />
            <path d="M200 0 Q 300 250 150 500 T 300 1000" stroke="#fff" strokeWidth="8" fill="none" />
            <path d="M0 400 Q 500 550 800 200 T 1200 400" stroke="#fff" strokeWidth="16" fill="none" />
          </svg>
        </div>

        {/* Map Pins */}
        {isLoadingEst ? (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : establishments.map((est: any, i: number) => {
          // Fake positions for the mockup
          const positions = [
            { top: '30%', left: '40%' },
            { top: '50%', left: '60%' },
            { top: '40%', left: '20%' },
            { top: '70%', left: '45%' },
          ];
          const pos = positions[i % positions.length];
          const isActive = selectedPin === est.id;

          return (
            <div 
              key={est.id} 
              className={`absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 z-10 ${isActive ? 'scale-125 z-30' : 'hover:scale-110 cursor-pointer'}`}
              style={pos}
              onClick={() => setSelectedPin(est.id)}
            >
              <div className="flex flex-col items-center">
                <div className={`relative flex items-center justify-center rounded-full p-1 shadow-xl ${isActive ? 'bg-primary-600' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-slate-100">
                    <img src={est.avatar} alt={est.name} className="w-full h-full object-cover" />
                  </div>
                  {isActive && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-500 border border-white"></span>
                    </span>
                  )}
                </div>
                <div className={`w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent mt-0.5 drop-shadow-md ${isActive ? 'border-t-primary-600' : 'border-t-white'}`}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Location Card Outline (Overlay on bottom) */}
      <div className={`absolute bottom-6 inset-x-0 px-4 md:px-0 flex justify-center w-full transition-transform duration-500 ${selectedEst ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
        {selectedEst && selectedPromo && (
          <div className="bg-white p-4 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/3 aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden relative shrink-0">
              <img src={selectedEst.cover} className="w-full h-full object-cover" alt={selectedEst.name} />
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-[10px] font-bold text-slate-700 flex items-center gap-1">
                <Star className="w-3 h-3 text-accent-500 fill-accent-500" /> 4.9
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <h3 className="font-bold text-lg text-slate-900 leading-tight">{selectedEst.name}</h3>
                <p className="text-xs text-slate-500 mb-2">{selectedEst.category} • {selectedEst.distance}</p>
                
                <div className="bg-primary-50 border border-primary-100 p-2 rounded-xl mt-2 mb-3">
                  <div className="text-[10px] font-bold text-primary-600 uppercase tracking-wide">Promoção Ativa</div>
                  <div className="text-sm font-bold text-primary-900 line-clamp-1">{selectedPromo.title}</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-1">
                  <Navigation className="w-4 h-4" /> Rota
                </button>
                {selectedPromoId ? (
                  <Link href={`/promocoes/${selectedPromoId}`} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold py-2 rounded-xl transition-colors text-center flex items-center justify-center">
                    Ver Cupom
                  </Link>
                ) : (
                  <span className="flex-1 bg-slate-200 text-slate-500 text-sm font-bold py-2 rounded-xl text-center flex items-center justify-center cursor-not-allowed">
                    Indisponível
                  </span>
                )}
              </div>
            </div>
            
            {/* Close button */}
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedPin(null); }}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
