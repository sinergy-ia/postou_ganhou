export type ConfigSectionId =
  | "profile"
  | "address"
  | "social"
  | "team"
  | "hours"
  | "notifications"
  | "billing";

export const dashboardConfigSections: Array<{
  id: ConfigSectionId;
  label: string;
  description: string;
  available: boolean;
}> = [
  {
    id: "profile",
    label: "Perfil da Loja",
    description: "Capa, logo, nome, categoria, CNPJ e descricao.",
    available: true,
  },
  {
    id: "address",
    label: "Endereco",
    description: "Endereco publico exibido no catalogo.",
    available: true,
  },
  {
    id: "social",
    label: "Redes Sociais",
    description: "Instagram e website do estabelecimento.",
    available: true,
  },
  {
    id: "team",
    label: "Equipe",
    description: "Usuarios da mesma conta com perfis owner, manager e viewer.",
    available: true,
  },
  {
    id: "hours",
    label: "Horario de Funcionamento",
    description: "Ainda nao existe campo dessa secao na API atual.",
    available: false,
  },
  {
    id: "notifications",
    label: "Preferencias de Notificacao",
    description: "Ainda nao existe campo dessa secao na API atual.",
    available: false,
  },
  {
    id: "billing",
    label: "Faturamento",
    description: "Plano atual, limites e informacoes de cobranca.",
    available: true,
  },
];

export function isDashboardConfigSectionId(
  value?: string | null,
): value is ConfigSectionId {
  return dashboardConfigSections.some((section) => section.id === value);
}
