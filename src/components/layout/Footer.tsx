import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12 text-sm mt-auto">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <span className="font-heading font-bold text-2xl text-white">Marque &amp; Ganhe</span>
          <p className="max-w-xs">A primeira plataforma de recompensas sociais onde seu engajamento vale prêmios de verdade.</p>
        </div>
        
        <div className="space-y-4">
          <h4 className="font-heading font-medium text-white text-base">Para Clientes</h4>
          <ul className="space-y-2">
            <li><Link href="/promocoes" className="hover:text-primary-400 transition-colors">Explorar Promoções</Link></li>
            <li><Link href="/galeria" className="hover:text-primary-400 transition-colors">Galeria de Posts</Link></li>
            <li><Link href="/mapa" className="hover:text-primary-400 transition-colors">Mapa de Descontos</Link></li>
            <li><Link href="#" className="hover:text-primary-400 transition-colors">Como Funciona</Link></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-heading font-medium text-white text-base">Para Negócios</h4>
          <ul className="space-y-2">
            <li><Link href="/para-estabelecimentos" className="hover:text-primary-400 transition-colors">Atraia mais Clientes</Link></li>
            <li><Link href="/login" className="hover:text-primary-400 transition-colors">Painel do Lojista</Link></li>
            <li><Link href="#" className="hover:text-primary-400 transition-colors">Casos de Sucesso</Link></li>
            <li><Link href="#" className="hover:text-primary-400 transition-colors">Preços</Link></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-heading font-medium text-white text-base">Legal</h4>
          <ul className="space-y-2">
            <li><Link href="#" className="hover:text-primary-400 transition-colors">Termos de Uso</Link></li>
            <li><Link href="#" className="hover:text-primary-400 transition-colors">Política de Privacidade</Link></li>
            <li><Link href="#" className="hover:text-primary-400 transition-colors">Suporte e FAQ</Link></li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-slate-500">
        <p>© {new Date().getFullYear()} Marque &amp; Ganhe. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
