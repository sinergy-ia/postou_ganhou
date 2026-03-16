export type AiPostsSectionId = "generate" | "library";

export const aiPostsSections: Array<{
  id: AiPostsSectionId;
  label: string;
  description: string;
}> = [
  {
    id: "generate",
    label: "Nova publicação",
    description:
      "Configure briefing, formato, mídia e prompts para criar uma nova publicação com IA.",
  },
  {
    id: "library",
    label: "Publicações",
    description:
      "Revise rascunhos gerados, publicações já feitas e itens agendados no Instagram conectado.",
  },
];

export function isAiPostsSectionId(
  value?: string | null,
): value is AiPostsSectionId {
  return aiPostsSections.some((section) => section.id === value);
}
