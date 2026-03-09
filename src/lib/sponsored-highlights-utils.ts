import type {
  SponsoredBillingModel,
  SponsoredCampaignStatus,
  SponsoredOrigin,
  SponsoredPlacement,
} from "@/services/sponsored-highlights-api";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

export function formatCurrency(value?: number | null) {
  return currencyFormatter.format(Number(value || 0));
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

export function formatDateRange(startDate?: string | null, endDate?: string | null) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function formatPercent(value?: number | null) {
  return `${percentFormatter.format(Number(value || 0))}%`;
}

export function getPlacementLabel(value: SponsoredPlacement) {
  switch (value) {
    case "home":
      return "Home";
    case "listing":
      return "Listagem";
    case "map":
      return "Mapa";
    case "search":
      return "Busca";
    case "carousel":
      return "Carrossel";
    default:
      return value;
  }
}

export function getOriginLabel(value: SponsoredOrigin) {
  switch (value) {
    case "inside_sales":
      return "Inside sales";
    case "self_service":
      return "Self-service";
    case "partner":
      return "Parceiro";
    case "upsell":
      return "Upsell";
    default:
      return value;
  }
}

export function getBillingModelLabel(value: SponsoredBillingModel) {
  return value === "recurring" ? "Recorrente" : "Avulso";
}

export function getCampaignStatusLabel(value: SponsoredCampaignStatus) {
  switch (value) {
    case "scheduled":
      return "Agendada";
    case "active":
      return "Ativa";
    case "paused":
      return "Pausada";
    case "ended":
      return "Encerrada";
    case "cancelled":
      return "Cancelada";
    case "expired":
      return "Expirada";
    case "pending_payment":
      return "Pendente pagamento";
    default:
      return value;
  }
}

export function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
  ) {
    return String(
      (error as { response?: { data?: { message?: unknown } } }).response?.data?.message,
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}
