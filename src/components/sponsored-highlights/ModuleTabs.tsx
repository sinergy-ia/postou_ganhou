"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Resumo", href: "/dashboard/destaques-patrocinados" },
  { label: "Formatos", href: "/dashboard/destaques-patrocinados/formatos" },
  { label: "Campanhas", href: "/dashboard/destaques-patrocinados/campanhas" },
  { label: "Slots", href: "/dashboard/destaques-patrocinados/slots" },
  { label: "Regras", href: "/dashboard/destaques-patrocinados/regras" },
  { label: "Preview", href: "/dashboard/destaques-patrocinados/preview" },
  { label: "Relatorios", href: "/dashboard/destaques-patrocinados/relatorios" },
];

export default function ModuleTabs() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/dashboard/destaques-patrocinados"
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
