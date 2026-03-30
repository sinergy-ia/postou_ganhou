"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Gift,
  Image,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Users,
  Utensils,
  Video,
  Zap,
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

  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const faqItems = [
    {
      q: 'Meus clientes não têm costume de postar stories.',
      a: 'A maioria dos brasileiros com smartphone usa o Instagram Stories diariamente. O que faltava era um motivo concreto para te marcar. A recompensa cria esse motivo.',
    },
    {
      q: 'Quanto tempo vou gastar gerenciando isso?',
      a: 'Zero. O sistema valida os stories e entrega os cupons automaticamente. Você não precisa verificar nada. Só abre o painel quando quiser ver os resultados.',
    },
    {
      q: 'E se alguém tentar burlar a campanha?',
      a: 'O sistema verifica se a conta é real, se o story ficou no ar pelo tempo mínimo e se o critério foi cumprido corretamente. Contas suspeitas são sinalizadas. Você só recompensa quem realmente participou.',
    },
    {
      q: 'Preciso ter muitos seguidores para funcionar?',
      a: 'Não. O poder da campanha vem dos seguidores dos seus clientes, não dos seus. Um cliente com 500 seguidores genuínos vale muito mais do que um post patrocinado para desconhecidos.',
    },
    {
      q: 'Funciona para loja física sem e-commerce?',
      a: 'Especialmente para loja física. A experiência presencial é o combustível do story. O cliente está lá, vivendo o momento, com incentivo real para registrar e marcar. É exatamente onde o MarqueGanhe brilha mais.',
    },
    {
      q: 'Quanto custa?',
      a: 'Menos do que você gasta em um único impulsionamento que some em 24 horas. Confira nossos planos abaixo.',
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* ────────────────────────────────────────────
          HERO SECTION
      ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-900 py-24 lg:py-32 border-b border-primary-900">
        <div className="absolute top-0 right-0 -m-32 blur-3xl rounded-full bg-primary-900/40 w-96 h-96" />
        <div className="absolute bottom-0 left-0 -m-32 blur-3xl rounded-full bg-secondary-900/30 w-96 h-96" />
        
        <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-white text-sm font-medium mb-8 border border-white/20">
             <span className="flex h-2 w-2 relative">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </span>
             14 dias grátis — sem cartão de crédito
          </div>
          <h1 className="font-heading font-black text-3xl md:text-5xl lg:text-6xl tracking-tighter text-white leading-tight mb-8">
            Todo dia, seus clientes postam stories marcando concorrentes de graça.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
              E você ainda paga R$3 por clique para tentar alcançar quem já te conhece.
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Existe uma forma de fazer seus clientes fazerem marketing para você — com critério, recompensa e cupom entregue automaticamente. Sem agência. Sem anúncio. Sem você mexer um dedo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="#cadastro" className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-full transition-all shadow-xl shadow-primary-900/50 flex items-center justify-center gap-2 group">
              Criar minha campanha — 14 dias grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-4">
            Sem cartão. Sem contrato. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* ────────────────────────────────────────────
          CONTEXT BLOCK — Por que isso funciona
      ──────────────────────────────────────────── */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="prose prose-lg prose-slate mx-auto text-center">
            <p className="text-lg text-slate-600 leading-relaxed">
              Toda vez que alguém marca um restaurante, uma loja ou um estabelecimento nos stories do Instagram, está gerando alcance orgânico para ele. <strong className="text-slate-900">Gratuitamente. Autenticamente.</strong> Com muito mais credibilidade do que qualquer anúncio pago.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed mt-4">
              Marcas grandes sabem disso há anos. A Coca-Cola não paga para aparecer na mesa dos seus clientes — ela criou condições para que as pessoas <em>quisessem</em> marcar. O McDonald&apos;s não paga por cada story. O Outback não contrata influenciador para cada promoção.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed mt-4 font-semibold">
              O problema é que até agora não existia uma ferramenta para o pequeno e médio varejista criar esse mesmo mecanismo, com regra definida, recompensa automática e resultado mensurável.
            </p>
            <p className="text-2xl font-heading font-black text-primary-600 mt-6">
              Agora existe.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────
          SEÇÃO 2 — O QUE É O MARQUEGANHE
      ──────────────────────────────────────────── */}
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
                Você define as regras.{' '}
                <span className="text-primary-600">Seus clientes fazem a divulgação. O sistema entrega o cupom.</span>
              </h2>
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-slate-700 space-y-4">
                <p>
                  Imagine que você tem uma loja de suplementos. Você cria uma campanha com a hashtag <strong className="text-primary-700">#super10</strong>.
                </p>
                <p>
                  A regra é simples: quem fizer <strong>3 stories</strong> marcando sua loja com essa hashtag ganha <strong>5% de desconto</strong> na próxima compra.
                </p>
              </div>
              
              <div className="space-y-4">
                {[
                  {
                    icon: Target,
                    title: 'O cliente posta',
                    desc: 'Stories com a hashtag e marcação do seu perfil. Amigos, seguidores, familiares — todos veem.',
                  },
                  {
                    icon: Zap,
                    title: 'O sistema monitora automaticamente',
                    desc: 'Nenhum funcionário precisa ficar verificando stories. O MarqueGanhe faz isso.',
                  },
                  {
                    icon: Gift,
                    title: 'Cupom entregue via Direct',
                    desc: 'Quando o critério é cumprido, o cliente recebe a recompensa. Você recebe um cliente fidelizado.',
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

              <p className="text-slate-600 italic border-l-4 border-primary-400 pl-4">
                Isso é marketing que gera marketing. O cliente que ganhou desconto vai contar para mais gente. A hashtag cresce. O alcance cresce. O custo de aquisição cai.
              </p>
            </div>
            
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────
          COMPARATIVO — Jeito antigo vs MarqueGanhe
      ──────────────────────────────────────────── */}
      <section className="py-20 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_40%)]" />
        <div className="container relative z-10 mx-auto px-4 max-w-5xl">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-white text-center mb-12">
            Por que o MarqueGanhe é{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">diferente</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Jeito Antigo */}
            <div className="rounded-[2rem] border border-red-500/20 bg-red-950/20 p-8 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-4 py-1.5 text-sm font-bold text-red-300">
                ❌ Jeito antigo
              </div>
              {[
                'Você paga para alcançar desconhecidos',
                'R$3–R$15 por clique sem garantia',
                'Anúncio desaparece ao parar de pagar',
                'Impressão passiva, sem engajamento real',
                'Difícil medir o retorno real',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-900/40 text-red-400 text-xs">✕</span>
                  <p className="text-slate-300 text-sm">{item}</p>
                </div>
              ))}
            </div>

            {/* Com MarqueGanhe */}
            <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-950/20 p-8 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-300">
                ✅ Com MarqueGanhe
              </div>
              {[
                'Seus clientes alcançam os amigos deles',
                'Você só recompensa quem já postou',
                'Stories ficam, indicações ficam, boca a boca fica',
                'Cliente ativo, que postou, que se identificou com sua marca',
                'Você vê quantos stories, quantos cupons, quantos resgates',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-900/40 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <p className="text-slate-200 text-sm">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────
          SEÇÃO 3 — PARA QUEM É
      ──────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-bold text-primary-700 mb-5">
              <Users className="h-4 w-4" />
              Para quem é
            </div>
            <h2 className="font-heading font-bold text-3xl md:text-5xl text-slate-900 leading-tight">
              Feito para quem tem clientes que usam Instagram —{' '}
              <span className="text-primary-600">e ainda não transformou isso em ativo de marketing.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Utensils,
                title: 'Restaurante, bar ou cafeteria',
                desc: 'Seus clientes já postam fotos da comida. Eles só precisam de um incentivo para marcar você. Crie a campanha, defina o desconto, e deixe a ferramenta trabalhar.',
              },
              {
                icon: Store,
                title: 'Loja de moda, suplementos, cosméticos ou varejo físico',
                desc: 'Stories com produto + estabelecimento marcado valem mais do que qualquer banner patrocinado. São pessoas reais, com rostos, endossando sua loja para os círculos sociais delas.',
              },
              {
                icon: Zap,
                title: 'Academia, estúdio ou serviço presencial',
                desc: '"Check-in de treino" já é comportamento orgânico. Você só precisa criar a estrutura para que esse comportamento te beneficie de forma mensurável.',
              },
              {
                icon: Gift,
                title: 'E-commerce com entrega',
                desc: 'Unboxing stories são o anúncio mais barato e mais confiável que existe. Dê um motivo para o cliente postar e colha os resultados.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary-200"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 mb-5 transition-colors group-hover:bg-primary-100">
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="font-heading font-bold text-xl text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────
          SEÇÃO 4 — COMO FUNCIONA NA PRÁTICA (3 passos)
      ──────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-bold text-primary-700 mb-5">
              <Sparkles className="h-4 w-4" />
              Simples de usar
            </div>
            <h2 className="font-heading font-bold text-3xl md:text-5xl text-slate-900 leading-tight">
              Três passos. Cinco minutos para configurar.{' '}
              <span className="text-primary-600">Resultado que começa no mesmo dia.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Target,
                title: 'Crie sua campanha em minutos',
                desc: 'Defina a hashtag exclusiva (ex: #super10), o critério para ganhar (ex: 3 stories), a recompensa (ex: 5% OFF) e o prazo. Pronto. Sem designer, agência ou técnico.',
              },
              {
                step: '02',
                icon: Users,
                title: 'Seus clientes veem, participam e postam',
                desc: 'Comunique a campanha na loja, WhatsApp ou Instagram. Os clientes fazem os stories com a hashtag e marcam você. O conteúdo chega espontâneo para os seguidores deles.',
              },
              {
                step: '03',
                icon: Zap,
                title: 'O sistema valida e entrega automaticamente',
                desc: 'O MarqueGanhe monitora os stories com a hashtag e marcação do seu perfil. Quando o critério é cumprido, o cupom é gerado e enviado automaticamente. Sem trabalho manual.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
              >
                <span className="absolute -top-4 left-6 inline-flex items-center justify-center rounded-full bg-primary-600 text-white text-sm font-black h-8 w-8 shadow-lg shadow-primary-200">
                  {item.step}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 mt-2 mb-5">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-bold text-xl text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-slate-500 mt-8 text-sm">
            Você só abre o painel e vê os números.
          </p>
        </div>
      </section>

      {/* ────────────────────────────────────────────
          SEÇÃO 5 — RESULTADOS / PROVA SOCIAL
      ──────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700 mb-5">
              <TrendingUp className="h-4 w-4" />
              Resultados reais
            </div>
            <h2 className="font-heading font-bold text-3xl md:text-5xl text-slate-900 leading-tight">
              O que acontece quando seus clientes{' '}
              <span className="text-primary-600">se tornam seu canal de marketing</span>
            </h2>
          </div>

          {/* Case 1 */}
          <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 md:p-12 shadow-sm mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-xl text-slate-900">Yuruzu — Restaurante</h3>
              </div>
            </div>
            <blockquote className="text-lg text-slate-700 italic border-l-4 border-primary-400 pl-6 mb-6">
              &ldquo;A gente tinha Instagram ativo mas não sabia como transformar isso em resultado real. Criamos a campanha com 15% OFF e em 3 semanas tínhamos mais de 80 stories publicados por clientes reais. Pessoas que nunca tinham ouvido falar do restaurante apareceram porque viram no story de alguém.&rdquo;
            </blockquote>
            <div className="flex flex-wrap gap-4">
              <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700">
                87 cupons gerados
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                0 reais gastos em anúncio
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                34% de aumento em visitas de novos clientes
              </div>
            </div>
          </div>

          {/* Nielsen stat */}
          <div className="rounded-[2rem] border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-8 md:p-12 shadow-sm text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-primary-600 mb-4">
              Pesquisa Nielsen
            </p>
            <p className="text-2xl md:text-3xl font-heading font-bold text-slate-900 leading-snug max-w-3xl mx-auto">
              92% dos consumidores confiam em indicações de pessoas que conhecem mais do que em qualquer forma de publicidade.
            </p>
            <p className="text-slate-600 mt-6 text-lg max-w-2xl mx-auto">
              Um story de cliente vale mais do que R$50 em anúncio. O MarqueGanhe multiplica esse efeito de forma sistemática.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────
          SEÇÃO 6 — FAQ / OBJEÇÕES
      ──────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-bold text-primary-700 mb-5">
              <ShieldCheck className="h-4 w-4" />
              Tire suas dúvidas
            </div>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-slate-900 leading-tight">
              Antes de fechar a página, as dúvidas que todo lojista tem
            </h2>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-bold text-slate-900">&ldquo;{item.q}&rdquo;</span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaq === index ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="px-6 pb-5 text-slate-600 leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────
          IA Posts Section (mantido)
      ──────────────────────────────────────────── */}
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

      {/* ────────────────────────────────────────────
          SEÇÃO 7 — PLANOS (PricingSection mantido)
      ──────────────────────────────────────────── */}
      <PricingSection />

      {/* ────────────────────────────────────────────
          CTA FINAL — FECHAMENTO
      ──────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-white to-slate-50 border-t border-slate-100">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-slate-900 mb-8 leading-tight">
            Seus concorrentes ainda estão pagando por clique.{' '}
            <span className="text-primary-600">Você pode fazer seus clientes trabalharem por você.</span>
          </h2>
          <div className="space-y-4 text-lg text-slate-600 mb-10">
            <p>Cada story postado por um cliente vale mais do que qualquer banner.</p>
            <p>Cada indicação orgânica custa menos do que qualquer tráfego pago.</p>
            <p>Cada cupom entregue automaticamente representa um cliente que voltou com intenção.</p>
          </div>
          <p className="text-slate-500 text-sm mb-8 max-w-2xl mx-auto">
            O MarqueGanhe é a primeira plataforma brasileira que transforma o comportamento natural dos seus clientes no Instagram em um sistema de marketing mensurável — sem agência, sem anúncio, sem trabalho manual.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 mb-8">
            <CheckCircle2 className="h-4 w-4" />
            Mais de 10.000 cupons já entregues por clientes reais
          </div>
          <p className="text-slate-700 font-semibold text-lg mb-8">
            O próximo pode ser o seu cliente.
          </p>
          <Link
            href="#cadastro"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-full transition-all shadow-xl shadow-primary-900/30 group"
          >
            Quero testar 14 dias grátis
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-sm text-slate-400 mt-4">
            Cadastro em 2 minutos. Primeira campanha no ar hoje.
          </p>
        </div>
      </section>

      {/* ────────────────────────────────────────────
          FORMULÁRIO DE CADASTRO (mantido)
      ──────────────────────────────────────────── */}
      <section id="cadastro" className="py-24 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-gradient-to-br from-slate-900 to-primary-950 rounded-[3rem] p-8 md:p-16 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/30 blur-3xl rounded-full" />
            
            <div className="relative z-10 text-center mb-10">
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-white mb-4">Comece hoje. Sem risco. Sem fidelidade.</h2>
              <p className="text-primary-100 max-w-xl mx-auto">
                Preencha os dados abaixo. Nossa equipe entrará em contato para liberar seu acesso à plataforma com 14 dias de teste grátis.
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
                    <option>Suplementos / Saúde</option>
                    <option>Academia / Estúdio</option>
                    <option>E-commerce</option>
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
                {contactMutation.isPending ? 'Enviando...' : 'Quero testar 14 dias grátis 🚀'}
              </button>
              <p className="text-center text-xs text-slate-500 mt-4">
                Sem cartão de crédito. Cancele com 1 clique.
              </p>
            </form>
          </div>
        </div>
      </section>

    </div>
  );
}
