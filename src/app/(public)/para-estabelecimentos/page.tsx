import Link from 'next/link';
import { ArrowRight, TrendingUp, Users, Target, MessageSquare } from 'lucide-react';
import PricingSection from '@/components/public/PricingSection';

export default function ParaEstabelecimentosPage() {
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
          <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Confiado por grandes nomes da gastronomia</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
            {/* Fake logos using text for mockup */}
            <div className="font-heading font-black text-2xl">BURGER KING</div>
            <div className="font-heading font-black text-2xl">YURUZU SUSHI</div>
            <div className="font-heading font-black text-2xl">CAFÉ DO BREJO</div>
            <div className="font-heading font-black text-2xl">OAKBERRY</div>
            <div className="font-heading font-black text-2xl">OUTBACK</div>
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
              <h2 className="font-heading font-bold text-3xl md:text-5xl text-slate-900 leading-tight">
                Mais visibilidade,<br/>
                <span className="text-primary-600">mais retorno de clientes.</span>
              </h2>
              <p className="text-lg text-slate-600">
                O marketing boca-a-boca é o mais poderoso que existe. Nós o digitalizamos. Cada post de um cliente atinge centenas de potenciais novos compradores da sua região.
              </p>
              
              <ul className="space-y-6">
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
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-white mb-4">Venda mais com o Postou, Ganhou</h2>
              <p className="text-primary-100 max-w-xl mx-auto">
                Preencha os dados abaixo. Nossa equipe entrará em contato para liberar seu acesso à plataforma com 30 dias de teste grátis.
              </p>
            </div>
            
            <form className="relative z-10 bg-white rounded-2xl p-6 md:p-8 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Responsável</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none" placeholder="João Silva" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Estabelecimento</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none" placeholder="Yuruzu Sushi" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Segmento</label>
                  <select className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none">
                    <option>Restaurante / Bar</option>
                    <option>Cafeteria / Doceria</option>
                    <option>Vestuário / Moda</option>
                    <option>Beleza e Estética</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp</label>
                  <input type="tel" className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none" placeholder="(11) 90000-0000" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Instagram do Estabelecimento</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none" placeholder="@seuestabelecimento" />
                </div>
              </div>
              
              <button type="button" className="w-full mt-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-md shadow-primary-200 flex items-center justify-center gap-2">
                Solicitar Acesso 🚀
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
