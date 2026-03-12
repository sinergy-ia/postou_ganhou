"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  establishmentApi,
  type EstablishmentLoginMembership,
} from '@/services/establishment-api';
import { Loader2 } from 'lucide-react';

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectionToken, setSelectionToken] = useState('');
  const [memberships, setMemberships] = useState<EstablishmentLoginMembership[]>([]);

  const loginMutation = useMutation({
    mutationFn: establishmentApi.login,
    onSuccess: (result) => {
      if (result.requiresEstablishmentSelection) {
        setSelectionToken(result.selectionToken || '');
        setMemberships(result.memberships || []);
        return;
      }

      router.push('/dashboard');
    },
    onError: (error) => {
      setError(getErrorMessage(error, 'Erro ao realizar login'));
    }
  });

  const selectMembershipMutation = useMutation({
    mutationFn: establishmentApi.selectMembership,
    onSuccess: () => {
      router.push('/dashboard');
    },
    onError: (error) => {
      setError(
        getErrorMessage(
          error,
          'Nao foi possivel acessar o estabelecimento selecionado.',
        ),
      );
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ email, password });
  };

  if (memberships.length > 0 && selectionToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl bg-white rounded-[2rem] p-8 md:p-12 shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="font-heading font-black text-3xl text-primary-600 mb-2">
              Escolha o estabelecimento
            </h1>
            <p className="text-slate-500 text-sm">
              Este e-mail possui acesso a mais de uma conta.
            </p>
          </div>

          <div className="space-y-4">
            {memberships.map((membership) => (
              <button
                key={membership.teamUserId}
                type="button"
                onClick={() =>
                  selectMembershipMutation.mutate({
                    selectionToken,
                    teamUserId: membership.teamUserId,
                  })
                }
                disabled={selectMembershipMutation.isPending}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition-colors hover:border-primary-300 hover:bg-primary-50"
              >
                <div className="font-bold text-slate-900">
                  {membership.establishmentName}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Papel {membership.role} • Plano {membership.plan}
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setMemberships([]);
              setSelectionToken('');
            }}
            className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-[2rem] p-8 md:p-12 shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="font-heading font-black text-3xl text-primary-600 mb-2">Marque &amp; Ganhe</h1>
            <p className="text-slate-500 text-sm">Painel do Estabelecimento</p>
          </div>
          
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Email corporativo</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nome@seunegocio.com.br" 
                className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none" 
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-slate-700">Senha</label>
                <Link href="/login/esqueci-senha" className="text-xs font-bold text-primary-600 hover:text-primary-700">Esqueci a senha</Link>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••" 
                className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none" 
              />
            </div>
            
            <div className="flex items-center gap-2 py-2">
              <input type="checkbox" id="remember" className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-600" />
              <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">Lembrar meu acesso</label>
            </div>
            
            <button 
              type="submit" 
              disabled={loginMutation.isPending}
              className="block w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md text-center disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loginMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
              Entrar no Painel
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Ainda não é parceiro? <br/>
              <Link href="/para-estabelecimentos" className="text-primary-600 font-bold hover:underline">
                Solicite um convite
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-primary-600 to-indigo-900 text-white p-12 flex-col justify-center items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 -m-32 blur-3xl rounded-full bg-primary-400/40 w-96 h-96" />
        <div className="absolute bottom-0 left-0 -m-32 blur-3xl rounded-full bg-secondary-500/30 w-96 h-96" />
        
        <div className="relative z-10 max-w-lg text-center">
          <div className="w-20 h-20 bg-white/10 rounded-3xl mx-auto mb-8 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <span className="text-4xl">🚀</span>
          </div>
          <h2 className="font-heading font-black text-4xl leading-tight mb-6">
            Gerencie suas recompensas em um só lugar
          </h2>
          <p className="text-primary-100 text-lg leading-relaxed">
            Acompanhe postagens, aprove cupons e descubra quem são os clientes que mais promovem sua marca.
          </p>
        </div>
      </div>
    </div>
  );
}
