"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  clearEstablishmentSelectionContext,
  establishmentApi,
} from '@/services/establishment-api';
import { Loader2, Store, User, Mail, Lock } from 'lucide-react';

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

export default function CadastroPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    establishmentName: '',
    email: '',
    password: '',
  });

  // Real registration via API
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const registerMutation = useMutation({
    mutationFn: establishmentApi.register,
    onSuccess: () => {
      clearEstablishmentSelectionContext();
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard'); // Direct to dashboard upon token reception
      }, 1500);
    },
    onError: (error) => {
      setError(
        getErrorMessage(
          error,
          'Erro ao criar conta. Verifique os dados e tente novamente.',
        ),
      );
    }
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    registerMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Left side: Visual/Marketing */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-primary-900 to-indigo-900 text-white p-12 flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 -m-32 blur-3xl rounded-full bg-primary-500/30 w-96 h-96" />
        <div className="absolute bottom-0 left-0 -m-32 blur-3xl rounded-full bg-secondary-500/20 w-96 h-96" />
        
        <div className="relative z-10 max-w-lg mx-auto">
          <Link href="/" className="font-heading font-black text-3xl text-white mb-12 block">
            P,G!
          </Link>
          
          <h2 className="font-heading font-black text-4xl leading-tight mb-6">
            Junte-se à revolução do marketing boca a boca.
          </h2>
          <p className="text-primary-100 text-lg leading-relaxed mb-8">
            Crie campanhas em minutos, valide as publicações dos seus clientes e veja o movimento do seu estabelecimento crescer com a força da prova social.
          </p>
          
          <div className="space-y-4">
            {[
              "Sem taxas de adesão escondidas",
              "Integração rápida com o Instagram",
              "Dashboard analítico completo"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-medium text-slate-200">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Right side: Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-6 left-6 md:hidden">
          <Link href="/" className="font-heading font-black text-2xl text-primary-600">
            P,G!
          </Link>
        </div>
        
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="font-heading font-black text-3xl text-slate-900 mb-2">Crie sua conta</h1>
            <p className="text-slate-500 text-sm">Comece a atrair mais clientes hoje mesmo.</p>
          </div>
          
          {success ? (
            <div className="bg-green-50 text-green-700 p-6 rounded-2xl border border-green-100 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Conta criada com sucesso!</h3>
              <p className="text-sm">Redirecionando para o seu dashboard...</p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleRegister}>
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Seu Nome</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="João Silva" 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Estabelecimento</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Store className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      name="establishmentName"
                      required
                      value={formData.establishmentName}
                      onChange={handleChange}
                      placeholder="Nome do local" 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none" 
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Email corporativo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="email" 
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="contato@seunegocio.com.br" 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="password" 
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••" 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none" 
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={registerMutation.isPending}
                  className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-md shadow-primary-200 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {registerMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                  Criar conta
                </button>
                <p className="mt-3 text-center text-xs text-slate-500">
                  Seu cadastro já começa no plano <span className="font-bold text-slate-700">Free</span>, sem custo fixo para validar a estratégia.
                </p>
              </div>
            </form>
          )}
          
          <div className="mt-8 pt-8 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              Já possui uma conta? {' '}
              <Link href="/login" className="text-primary-600 font-bold hover:underline">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
