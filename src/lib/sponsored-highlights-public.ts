import type {
  SponsoredCampaign,
  SponsoredPlacement,
  SponsoredPreview,
} from "@/services/sponsored-highlights-api";
import { getPlacementLabel } from "@/lib/sponsored-highlights-utils";

const DEFAULT_SPONSORED_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80";

export interface PublicSponsoredCardModel {
  id: string;
  title: string;
  establishmentName: string;
  imageUrl: string;
  badge: string;
  cta: string;
  slotLabel?: string;
  href?: string;
  description?: string;
  placement?: SponsoredPlacement;
}

export interface PublicSponsoredPreviewSectionModel {
  key: string;
  label: string;
  description: string;
  desktop: PublicSponsoredCardModel[];
  mobile: PublicSponsoredCardModel[];
}

function normalizeText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function joinText(parts: Array<string | null | undefined>) {
  return parts.map((item) => String(item || "").trim()).filter(Boolean).join(" • ");
}

export function normalizeSponsoredHref(value?: string | null) {
  const href = String(value || "").trim();

  if (!href) {
    return "/promocoes";
  }

  if (/^https?:\/\//i.test(href)) {
    return href;
  }

  const normalized = href.startsWith("/") ? href : `/${href}`;

  if (normalized === "/public") {
    return "/";
  }

  if (normalized.startsWith("/public/")) {
    const publicPath = normalized.replace(/^\/public/, "");
    return publicPath || "/";
  }

  return normalized;
}

export function isExternalSponsoredHref(href?: string | null) {
  return /^https?:\/\//i.test(String(href || "").trim());
}

function getSponsoredCta(href: string) {
  const normalized = normalizeText(href);

  if (normalized.includes("/mapa")) {
    return "Ver no mapa";
  }

  if (normalized.includes("/promocoes")) {
    return "Ver oferta";
  }

  if (normalized.includes("/para-estabelecimentos")) {
    return "Saiba mais";
  }

  return "Abrir destaque";
}

function getPlacementDescription(placement: SponsoredPlacement) {
  switch (placement) {
    case "home":
      return "Cards promovidos exibidos na vitrine principal da home publica.";
    case "listing":
      return "Campanhas destacadas acima da listagem organica de promocoes.";
    case "map":
      return "Sugestoes patrocinadas exibidas junto da experiencia do mapa.";
    case "search":
      return "Resultados promovidos quando o cliente usa a busca por promocoes.";
    case "carousel":
      return "Faixa rotativa para ampliar o alcance de campanhas patrocinadas.";
    default:
      return "Campanhas patrocinadas exibidas ao cliente final.";
  }
}

export function buildPublicSponsoredCard(
  campaign: SponsoredCampaign,
): PublicSponsoredCardModel {
  const href = normalizeSponsoredHref(campaign.landingPage);
  const title = String(campaign.internalTitle || campaign.formatName || "Campanha patrocinada");

  return {
    id: String(campaign.id),
    title,
    establishmentName: String(campaign.establishmentName || "Estabelecimento"),
    imageUrl: String(
      campaign.imageUrl || campaign.establishmentAvatarUrl || DEFAULT_SPONSORED_IMAGE,
    ),
    badge: String(campaign.category || campaign.formatName || "Patrocinado"),
    cta: getSponsoredCta(href),
    slotLabel: String(campaign.formatName || getPlacementLabel(campaign.displayLocation)),
    href,
    description: joinText([campaign.cityRegion, campaign.category]),
    placement: campaign.displayLocation,
  };
}

export function buildPublicSponsoredCards(campaigns?: SponsoredCampaign[] | null) {
  return Array.isArray(campaigns)
    ? campaigns
        .filter((campaign) => campaign?.status === "active")
        .map((campaign) => buildPublicSponsoredCard(campaign))
    : [];
}

export function filterPublicSponsoredCards(
  cards: PublicSponsoredCardModel[],
  options?: {
    placement?: SponsoredPlacement;
    search?: string;
    category?: string;
  },
) {
  const placement = options?.placement;
  const search = normalizeText(options?.search);
  const category = normalizeText(options?.category);

  return cards.filter((card) => {
    if (placement && card.placement !== placement) {
      return false;
    }

    if (category && !normalizeText(card.badge).includes(category)) {
      return false;
    }

    if (search) {
      const haystack = normalizeText(
        [card.title, card.establishmentName, card.badge, card.description].join(" "),
      );

      if (!haystack.includes(search)) {
        return false;
      }
    }

    return true;
  });
}

export function buildPreviewSectionsFromCampaigns(
  campaigns?: SponsoredCampaign[] | null,
): PublicSponsoredPreviewSectionModel[] {
  const cards = buildPublicSponsoredCards(campaigns);
  const placements: SponsoredPlacement[] = ["home", "listing", "map", "search", "carousel"];

  return placements
    .map((placement) => {
      const placementCards = cards.filter((card) => card.placement === placement);

      if (placementCards.length === 0) {
        return null;
      }

      return {
        key: placement,
        label: getPlacementLabel(placement),
        description: getPlacementDescription(placement),
        desktop: placementCards,
        mobile: placementCards,
      };
    })
    .filter(Boolean) as PublicSponsoredPreviewSectionModel[];
}

export function buildPreviewSectionsFromPreview(
  preview?: SponsoredPreview | null,
): PublicSponsoredPreviewSectionModel[] {
  if (!preview?.sections?.length) {
    return [];
  }

  return preview.sections.map((section) => ({
    key: section.key,
    label: section.label,
    description: section.description,
    desktop: section.desktop.map((card) => ({
      id: card.id,
      title: card.title,
      establishmentName: card.establishmentName,
      imageUrl: card.imageUrl,
      badge: card.badge,
      cta: card.cta,
      slotLabel: card.slotLabel,
    })),
    mobile: section.mobile.map((card) => ({
      id: `${card.id}-mobile`,
      title: card.title,
      establishmentName: card.establishmentName,
      imageUrl: card.imageUrl,
      badge: card.badge,
      cta: card.cta,
      slotLabel: card.slotLabel,
    })),
  }));
}
