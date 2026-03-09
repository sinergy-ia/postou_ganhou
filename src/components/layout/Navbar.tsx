import Link from 'next/link';
import { Menu } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-heading font-bold text-2xl tracking-tighter text-primary-600">
            Postou, Ganhou
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-primary-600 transition-colors">Início</Link>
            <Link href="/promocoes" className="hover:text-primary-600 transition-colors">Promoções</Link>
            <Link href="/galeria" className="hover:text-primary-600 transition-colors">Galeria</Link>
            <Link href="/mapa" className="hover:text-primary-600 transition-colors">Mapa</Link>
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/para-estabelecimentos" className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">
            Para estabelecimentos
          </Link>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">
            Entrar
          </Link>
          <Link href="/cadastro" className="text-sm font-medium bg-primary-600 text-white px-5 py-2.5 rounded-full hover:bg-primary-700 transition-all shadow-sm shadow-primary-200">
            Cadastrar
          </Link>
        </div>

        <button className="md:hidden p-2 text-slate-600">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
