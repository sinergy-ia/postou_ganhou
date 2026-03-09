"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { establishmentApi } from '@/services/establishment-api';
import { Loader2 } from 'lucide-react';

function FacebookCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const provider = searchParams.get('provider') as 'facebook' | 'instagram' | null;
  const hasProviderError = Boolean(searchParams.get('error'));
  const [error, setError] = useState(
    hasProviderError ? 'Autenticacao cancelada ou mal-sucedida.' : '',
  );

  const getReturnPath = () => {
    if (typeof window === 'undefined') {
      return '/dashboard';
    }

    const savedPath = window.sessionStorage.getItem(
      'postou_ganhou_after_meta_connect',
    );

    if (savedPath) {
      window.sessionStorage.removeItem('postou_ganhou_after_meta_connect');
      return savedPath;
    }

    return '/dashboard';
  };

  useEffect(() => {
    if (code) {
      establishmentApi.facebookCallback(
        code,
        state || undefined,
        provider || undefined,
      )
        .then(() => {
          router.push(getReturnPath());
        })
        .catch((err) => {
          console.error(err);
          setError('Falha ao autenticar com o Facebook. Tente novamente.');
        });
    } else if (!hasProviderError) {
      router.push('/login');
    }
  }, [code, hasProviderError, provider, router, state]);

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
            onClick={() => router.push('/login')}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all"
          >
            Voltar para o Login
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
          <h1 className="font-bold text-xl text-slate-900">Autenticando com o Meta...</h1>
          <p className="text-slate-500 mt-2">Por favor, aguarde enquanto conectamos sua conta.</p>
        </div>
      )}
    </div>
  );
}

export default function FacebookCallback() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary-600 animate-spin" /></div>}>
      <FacebookCallbackContent />
    </Suspense>
  );
}
