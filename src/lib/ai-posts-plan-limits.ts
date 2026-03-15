export function canUseAiPostsPlan(planType?: string | null) {
  return planType === "pro" || planType === "scale";
}

export function getAiPostsGenerationLimit(planType?: string | null) {
  if (planType === "pro") {
    return 20;
  }

  if (planType === "scale") {
    return 40;
  }

  return 0;
}

export function getAiPostsVideoGenerationLimit(planType?: string | null) {
  if (planType === "pro") {
    return 5;
  }

  if (planType === "scale") {
    return 10;
  }

  return 0;
}

export function getAiPostsMarketingBenefit(planType?: string | null) {
  const generationLimit = getAiPostsGenerationLimit(planType);
  const videoLimit = getAiPostsVideoGenerationLimit(planType);

  if (generationLimit === 0 || videoLimit === 0) {
    return null;
  }

  return `Publicacoes IA para Instagram: ate ${generationLimit} geracoes, sendo ate ${videoLimit} videos`;
}
