"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Laptop, Loader2, Smartphone } from "lucide-react";
import PublicSponsoredCard from "@/components/sponsored-highlights/PublicSponsoredCard";
import {
  buildPreviewSectionsFromCampaigns,
  buildPreviewSectionsFromPreview,
} from "@/lib/sponsored-highlights-public";
import { sponsoredHighlightsApi } from "@/services/sponsored-highlights-api";

export default function SponsoredPreviewPage() {
  const { data: previewData, isLoading: isLoadingPreview } = useQuery({
    queryKey: ["sponsored-highlights", "preview"],
    queryFn: sponsoredHighlightsApi.getPreview,
  });

  const { data: publicCampaigns, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ["sponsored-highlights", "public-campaigns"],
    queryFn: sponsoredHighlightsApi.getPublicCampaigns,
  });

  const sections = useMemo(() => {
    const campaignSections = buildPreviewSectionsFromCampaigns(publicCampaigns);

    if (campaignSections.length > 0) {
      return campaignSections;
    }

    return buildPreviewSectionsFromPreview(previewData);
  }, [previewData, publicCampaigns]);

  if ((isLoadingPreview && isLoadingCampaigns) || (!sections.length && isLoadingPreview)) {
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
          Visualize a aparencia dos patrocinados na home, lista de promocoes,
          mapa e busca em desktop e mobile.
        </p>
      </div>

      {!sections.length ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
          Nenhuma campanha patrocinada ativa foi encontrada para gerar a
          simulacao.
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
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
                        <PublicSponsoredCard key={card.id} card={card} />
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
                        <PublicSponsoredCard
                          key={card.id}
                          card={card}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          ))}
        </div>
      )}
    </div>
  );
}
