"use client";

import { useQuery } from "@tanstack/react-query";
import { Laptop, Loader2, Smartphone } from "lucide-react";
import { sponsoredHighlightsApi } from "@/services/sponsored-highlights-api";

export default function SponsoredPreviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["sponsored-highlights", "preview"],
    queryFn: sponsoredHighlightsApi.getPreview,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-bold text-slate-900">
          Simulacao da area publica
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Visualize a aparencia dos patrocinados na home, lista de promocoes, mapa e busca em desktop e mobile.
        </p>
      </div>

      <div className="space-y-8">
        {data.sections.map((section) => (
          <section
            key={section.key}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6">
              <h3 className="font-heading text-xl font-bold text-slate-900">
                {section.label}
              </h3>
              <p className="text-sm text-slate-500">{section.description}</p>
            </div>

            <div className="grid gap-8 xl:grid-cols-2">
              <div>
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Laptop className="h-4 w-4" />
                  Preview desktop
                </div>
                <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-4 shadow-inner">
                  <div className="overflow-hidden rounded-[24px] bg-slate-50 p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {section.desktop.map((card) => (
                        <div
                          key={card.id}
                          className="overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-sm"
                        >
                          <img
                            src={card.imageUrl}
                            alt={card.title}
                            className="h-36 w-full object-cover"
                          />
                          <div className="space-y-3 p-4">
                            <div className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700">
                              Patrocinado • {card.slotLabel}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{card.title}</p>
                              <p className="text-sm text-slate-500">
                                {card.establishmentName}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {card.badge}
                              </span>
                              <button
                                type="button"
                                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                              >
                                {card.cta}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Smartphone className="h-4 w-4" />
                  Preview mobile
                </div>
                <div className="mx-auto max-w-sm rounded-[36px] border border-slate-200 bg-slate-950 p-3 shadow-inner">
                  <div className="overflow-hidden rounded-[28px] bg-slate-50 p-4">
                    <div className="space-y-4">
                      {section.mobile.map((card) => (
                        <div
                          key={`${card.id}-mobile`}
                          className="overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-sm"
                        >
                          <img
                            src={card.imageUrl}
                            alt={card.title}
                            className="h-32 w-full object-cover"
                          />
                          <div className="space-y-3 p-4">
                            <div className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700">
                              Patrocinado
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{card.title}</p>
                              <p className="text-sm text-slate-500">
                                {card.establishmentName}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {card.badge}
                              </span>
                              <button
                                type="button"
                                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                              >
                                {card.cta}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
