"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const publicNavigation = [
  { href: "/", label: "Inicio" },
  { href: "/promocoes", label: "Promocoes" },
  { href: "/galeria", label: "Galeria" },
  { href: "/mapa", label: "Mapa" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-4 lg:gap-8">
          <Link
            href="/"
            className="truncate font-heading text-xl font-bold tracking-tighter text-primary-600 sm:text-2xl"
          >
            Marque &amp; Ganhe
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            {publicNavigation.map((item) => {
              const isActive = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? "text-primary-600" : "transition-colors hover:text-primary-600"}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/para-estabelecimentos"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-primary-600"
          >
            Para estabelecimentos
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-primary-600"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-primary-200 transition-all hover:bg-primary-700"
          >
            Cadastrar
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
          aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="container mx-auto space-y-5 px-4 py-5">
            <nav className="space-y-2">
              {publicNavigation.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-primary-50 text-primary-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-3 border-t border-slate-200 pt-4">
              <Link
                href="/para-estabelecimentos"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Para estabelecimentos
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-2xl bg-primary-600 px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-primary-700"
              >
                Cadastrar
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
