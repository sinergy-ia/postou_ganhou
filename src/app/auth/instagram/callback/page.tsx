"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clientApi } from '@/services/client-api';
import { Loader2 } from 'lucide-react';

function InstagramCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const hasProviderError = Boolean(
    searchParams.get('error') || searchParams.get('error_reason'),
  );
  const [error, setError] = useState(
    hasProviderError ? 'Autenticacao cancelada pelo usuario.' : '',
  );

  useEffect(() => {
    if (code) {
      clientApi.instagramCallback(code)
        .then(() => {
          router.push('/carteira');
        })
        .catch((err) => {
          console.error(err);
          setError('Falha ao autenticar com o Instagram. Tente novamente.');
        });
    } else if (!hasProviderError) {
      router.push('/');
    }
  }, [code, hasProviderError, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      {error ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ✕
          </div>
          <h1 className="font-bold text-xl text-slate-900 mb-2">Erro na Autenticação</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all"
          >
            Voltar para o Início
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-pink-600 animate-spin mb-4" />
          <h1 className="font-bold text-xl text-slate-900">Conectando ao Instagram...</h1>
          <p className="text-slate-500 mt-2">Preparando sua carteira de cupons, aguarde um momento.</p>
        </div>
      )}
    </div>
  );
}

export default function InstagramCallback() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-12 h-12 text-pink-600 animate-spin" /></div>}>
      <InstagramCallbackContent />
    </Suspense>
  );
}
