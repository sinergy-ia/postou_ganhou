"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
  Image,
  MessageSquare,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import PricingSection from '@/components/public/PricingSection';
import {
  getAiPostsGenerationLimit,
  getAiPostsVideoGenerationLimit,
} from '@/lib/ai-posts-plan-limits';
import { publicApi } from '@/services/public-api';

export default function ParaEstabelecimentosPage() {
  const proGenerationLimit = getAiPostsGenerationLimit('pro');
  const proVideoLimit = getAiPostsVideoGenerationLimit('pro');
  const scaleGenerationLimit = getAiPostsGenerationLimit('scale');
  const scaleVideoLimit = getAiPostsVideoGenerationLimit('scale');
  const [formData, setFormData] = useState({
    responsibleName: '',
    establishmentName: '',
    segment: 'Restaurante / Bar',
    whatsapp: '',
    instagram: '',
  });
  const [submitState, setSubmitState] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const contactMutation = useMutation({
    mutationFn: publicApi.submitPartnerContact,
    onSuccess: () => {
      setSubmitState({
        type: 'success',
        message:
          'Recebemos seu cadastro. Nossa equipe vai entrar em contato em breve para apresentar a plataforma.',
      });
      setFormData({
        responsibleName: '',
        establishmentName: '',
        segment: 'Restaurante / Bar',
        whatsapp: '',
        instagram: '',
      });
    },
    onError: (error: unknown) => {
      const responseMessage =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message ===
          'string'
          ? String((error as { response?: { data?: { message?: unknown } } }).response?.data?.message)
          : '';

      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível enviar seu cadastro agora. Tente novamente em instantes.';

      setSubmitState({
        type: 'error',
        message: responseMessage || fallbackMessage,
      });
    },
  });

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState(null);
    contactMutation.mutate(formData);
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 py-24 lg:py-32 border-b border-primary-900">
        <div className="absolute top-0 right-0 -m-32 blur-3xl rounded-full bg-primary-900/40 w-96 h-96" />
        <div className="absolute bottom-0 left-0 -m-32 blur-3xl rounded-full bg-secondary-900/30 w-96 h-96" />
        
        <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-white text-sm font-medium mb-8 border border-white/20">
             <span className="flex h-2 w-2 relative">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </span>
             Lançamento para novos parceiros
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl lg:text-7xl tracking-tighter text-white leading-tight mb-8">
            Transforme seus clientes em <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">promotores da sua marca</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Aumente sua visibilidade local, atraia novos clientes e fidelize os atuais oferecendo recompensas por publicações nas redes sociais.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="#cadastro" className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-full transition-all shadow-xl shadow-primary-900/50 flex items-center justify-center gap-2 group">
              Quero atrair mais clientes
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof Array */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Confiado por grandes marcas</p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
            {/* Fake logos using text for mockup */}
            <div className="font-heading font-black text-2xl text-slate-700">BURGER KING</div>
            <div className="font-heading font-black text-2xl text-slate-700">YURUZU SUSHI</div>
            <div className="font-heading font-black text-2xl text-slate-700">CAFÉ DO BREJO</div>
            <div className="font-heading font-black text-2xl text-slate-700">OAKBERRY</div>
            <div className="font-heading font-black text-2xl text-slate-700">OUTBACK</div>
            <div className="font-heading font-black text-2xl text-primary-700">Sinergy IA</div>
          </div>
        </div>
      </section>

      {/* Como ajuda o negocio */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <div className="relative">
              {/* Dashboard Mockup Picture */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-200 to-secondary-200 rounded-[2.5rem] transform -rotate-3 scale-105 opacity-50 blur-lg"></div>
              <div className="relative bg-slate-900 rounded-[2rem] p-4 shadow-2xl border border-slate-700">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" alt="Dashboard Mockup" className="rounded-xl w-full h-auto opacity-80" />
                
                {/* Floating Metric */}
                <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-100 animate-pulse" style={{ animationDuration: '4s' }}>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Alcance Real</p>
                    <p className="text-xl font-black text-slate-900">+125.000</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-bold text-primary-700">
                <Sparkles className="h-4 w-4" />
                Como funciona o Marque &amp; Ganhe
              </div>
              <h2 className="font-heading font-bold text-3xl md:text-5xl text-slate-900 leading-tight">
                Mais visibilidade,<br/>
                <span className="text-primary-600">mais retorno de clientes.</span>
              </h2>
              <p className="text-lg text-slate-600">
                Voce cria a campanha, o cliente publica no Instagram para participar e
                sua equipe valida a acao para liberar a recompensa. Cada postagem vira
                prova social e ajuda a trazer novas pessoas para conhecer sua marca.
              </p>
              <p className="hidden text-lg text-slate-600">
                O marketing boca-a-boca é o mais poderoso que existe. Nós o digitalizamos. Cada post de um cliente atinge centenas de potenciais novos compradores da sua região.
              </p>
              
              <div className="space-y-4">
                {[
                  {
                    icon: Target,
                    title: '1. Crie a campanha',
                    desc: 'Defina a recompensa, o formato da postagem e as regras para o cliente participar.',
                  },
                  {
                    icon: MessageSquare,
                    title: '2. O cliente publica',
                    desc: 'Ele faz o post ou story, marca o perfil do estabelecimento e segue a campanha.',
                  },
                  {
                    icon: Users,
                    title: '3. Voce valida e recompensa',
                    desc: 'Sua equipe aprova no painel e libera o cupom para trazer esse cliente de volta.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl text-slate-900">{item.title}</h4>
                      <p className="mt-1 text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <ul className="hidden space-y-6">
                {[
                  { icon: Target, title: 'Campanhas fáceis de criar', desc: 'Lance uma promoção em menos de 3 minutos. Defina regras, metas de likes e recompensas (story ou post).' },
                  { icon: Users, title: 'Atração de novos clientes', desc: 'Os seguidores dos seus clientes descobrem seu estabelecimento com forte prova social embutida.' },
                  { icon: MessageSquare, title: 'Mais exposição, zero esforço', desc: 'Enquanto você foca no seu negócio, seus clientes atuam como micro-influenciadores digitais.' }
                ].map((item, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="mt-1 w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl text-slate-900">{item.title}</h4>
                      <p className="text-slate-600 mt-1">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  'Mais alcance local para sua marca.',
                  'Mais prova social com clientes reais.',
                  'Mais retorno com cupom e recompra.',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-slate-900 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.18),_transparent_32%)]" />
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-400/30 bg-primary-500/10 px-4 py-1.5 text-sm font-bold text-primary-200">
                <Sparkles className="h-4 w-4" />
                Publicacoes IA para Instagram
              </div>
              <h2 className="mt-6 font-heading text-3xl font-black tracking-tight text-white md:text-5xl">
                Crie conteudos prontos para postar sem depender de designer todos os dias.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                No painel, voce descreve a campanha ou o objetivo do post e a IA gera o
                rascunho com legenda, hashtags e midia para o Instagram do
                estabelecimento.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  {
                    icon: Image,
                    title: 'Imagem ou video',
                    description:
                      'Gere artes para feed e story ou videos curtos para reels.',
                  },
                  {
                    icon: MessageSquare,
                    title: 'Legenda pronta',
                    description:
                      'Receba texto, hashtags e CTA para revisar antes de publicar.',
                  },
                  {
                    icon: Send,
                    title: 'Publicar ou agendar',
                    description:
                      'Envie direto para o Instagram conectado ou deixe programado.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-primary-200">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-sm md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-200">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary-200">
                    Como funciona
                  </p>
                  <p className="text-sm text-slate-300">
                    Fluxo simples para sair da ideia ao post pronto.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  {
                    icon: MessageSquare,
                    title: '1. Passe o briefing',
                    description:
                      'Explique a oferta, o publico e o objetivo da publicacao.',
                  },
                  {
                    icon: Video,
                    title: '2. Gere o rascunho',
                    description:
                      'A IA monta a midia e o texto para feed, story ou reels.',
                  },
                  {
                    icon: Calendar,
                    title: '3. Revise e publique',
                    description:
                      'Ajuste se quiser e publique agora ou agende no horario ideal.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-slate-950/20 p-4"
                  >
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-primary-300/20 bg-primary-500/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary-200">
                    Plano Pro
                  </p>
                  <p className="mt-3 text-3xl font-black text-white">{proGenerationLimit}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    geracoes de publicacao com IA
                  </p>
                  <p className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white">
                    ate {proVideoLimit} videos com IA
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
                    Plano Scale
                  </p>
                  <p className="mt-3 text-3xl font-black text-white">{scaleGenerationLimit}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    geracoes de publicacao com IA
                  </p>
                  <p className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white">
                    ate {scaleVideoLimit} videos com IA
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-slate-300">
                Disponivel apenas nos planos Pro e Scale com Instagram profissional conectado.
              </div>
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      {/* Form / Lead Capture Section */}
      <section id="cadastro" className="py-24 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-gradient-to-br from-slate-900 to-primary-950 rounded-[3rem] p-8 md:p-16 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/30 blur-3xl rounded-full" />
            
            <div className="relative z-10 text-center mb-10">
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-white mb-4">Venda mais com o Marque &amp; Ganhe</h2>
              <p className="text-primary-100 max-w-xl mx-auto">
                Preencha os dados abaixo. Nossa equipe entrará em contato para liberar seu acesso à plataforma com 30 dias de teste grátis.
              </p>
            </div>
            
            <form
              className="relative z-10 bg-white rounded-2xl p-6 md:p-8 shadow-xl"
              onSubmit={handleSubmit}
            >
              {submitState ? (
                <div
                  className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${
                    submitState.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {submitState.message}
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Responsável</label>
                  <input
                    type="text"
                    name="responsibleName"
                    value={formData.responsibleName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                    placeholder="João Silva"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Estabelecimento</label>
                  <input
                    type="text"
                    name="establishmentName"
                    value={formData.establishmentName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                    placeholder="Yuruzu Sushi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Segmento</label>
                  <select
                    name="segment"
                    value={formData.segment}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                  >
                    <option>Restaurante / Bar</option>
                    <option>Cafeteria / Doceria</option>
                    <option>Vestuário / Moda</option>
                    <option>Beleza e Estética</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp</label>
                  <input
                    type="tel"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                    placeholder="(11) 90000-0000"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Instagram do Estabelecimento</label>
                  <input
                    type="text"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                    placeholder="@seuestabelecimento"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={contactMutation.isPending}
                className="w-full mt-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-md shadow-primary-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {contactMutation.isPending ? 'Enviando...' : 'Solicitar Acesso 🚀'}
              </button>
              <p className="text-center text-xs text-slate-500 mt-4">
                Não exigimos cartão de crédito neste momento.
              </p>
            </form>
          </div>
        </div>
      </section>

    </div>
  );
}
