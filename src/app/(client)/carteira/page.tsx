"use client";

import { useQuery } from '@tanstack/react-query';
import { clientApi } from '@/services/client-api';
import { Tag, MapPin, Clock, AlertCircle, Loader2, Info } from 'lucide-react';
import Link from 'next/link';

export default function CarteiraPage() {
  const { data: walletData, isLoading } = useQuery({
    queryKey: ['client-wallet'],
    queryFn: clientApi.getWallet,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const participations = walletData?.participations || [];
  const coupons = walletData?.coupons || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-heading font-black text-3xl md:text-4xl text-slate-900 mb-2">Minha Carteira</h1>
        <p className="text-slate-600 text-lg">Acumule cupons e acompanhe suas recompensas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        
        {/* Avaliações Pendentes ou Rejeitadas */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-xl text-slate-900">Postagens e Avaliações</h2>
            <Link href="/vincular-post" className="text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline">
              Não achou seu post?
            </Link>
          </div>

          <div className="space-y-4">
            {participations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center flex flex-col items-center justify-center text-slate-500 shadow-sm">
                <Info className="w-8 h-8 mb-3 opacity-50" />
                <p>Nenhuma postagem recente encontrada.<br/>Participe de promoções para ver seu status aqui.</p>
              </div>
            ) : participations.map((p: any) => (
              <div key={p.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex gap-5">
                <div className="w-20 h-28 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                  <img src={p.imageUrl} alt="Seu post" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-slate-900 line-clamp-1">{p.campaign?.title || 'Campanha'}</span>
                    {p.status === 'PENDING' && (
                      <span className="ml-auto px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">Em análise</span>
                    )}
                    {p.status === 'REJECTED' && (
                      <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Recusado</span>
                    )}
                    {p.status === 'APPROVED' && (
                      <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Aprovado</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" /> {p.establishment?.name || 'Local'}
                  </div>
                  
                  {p.status === 'REJECTED' && p.rejectionReason && (
                    <div className="mt-auto px-3 py-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <div>Motivo: {p.rejectionReason}</div>
                    </div>
                  )}
                  {p.status === 'PENDING' && (
                    <div className="mt-auto text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                      O estabelecimento está avaliando sua marcação. Em breve seu cupom será liberado.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cupons */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-xl text-slate-900">Seus Cupons</h2>
          </div>

          <div className="space-y-4">
            {coupons.length === 0 ? (
               <div className="bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-3xl p-8 text-center flex flex-col items-center justify-center text-primary-900 shadow-sm h-48">
                 <Tag className="w-8 h-8 mb-3 opacity-50" />
                 <p className="font-medium">Você ainda não possui cupons.</p>
               </div>
            ) : coupons.map((c: any) => (
              <div key={c.id} className={`p-1 rounded-3xl ${c.status === 'ACTIVE' ? 'bg-gradient-to-br from-primary-400 to-secondary-500 shadow-lg shadow-primary-500/20' : 'bg-slate-200'} relative overflow-hidden group`}>
                <div className={`bg-white rounded-[1.35rem] p-5 h-full ${c.status !== 'ACTIVE' ? 'opacity-80' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full overflow-hidden shrink-0 border border-slate-200">
                        <img src={c.establishment?.avatar || `https://ui-avatars.com/api/?name=${c.establishment?.name}`} alt="Store" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 leading-tight">{c.establishment?.name || 'Local'}</div>
                        <div className="text-secondary-600 font-bold text-sm">{c.reward}</div>
                      </div>
                    </div>
                    {c.status === 'ACTIVE' && (
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wide">Válido</span>
                    )}
                    {c.status === 'USED' && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full uppercase tracking-wide">Usado</span>
                    )}
                    {c.status === 'EXPIRED' && (
                      <span className="px-2.5 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full uppercase tracking-wide">Expirado</span>
                    )}
                  </div>
                  
                  {c.status === 'ACTIVE' ? (
                    <div className="mt-5 border-t border-dashed border-slate-200 pt-5 text-center">
                      <div className="inline-block px-6 py-2 bg-slate-100 rounded-xl font-mono text-2xl font-black text-slate-800 tracking-widest border border-slate-200 shadow-inner">
                        {c.code}
                      </div>
                      <p className="text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Válido até {new Date(c.expiresAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                       <div className="text-sm font-mono text-slate-400 line-through">{c.code}</div>
                       {c.usedAt && <div className="text-xs text-slate-500">Usado em {new Date(c.usedAt).toLocaleDateString('pt-BR')}</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
