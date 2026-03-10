import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicSponsoredCardModel } from "@/lib/sponsored-highlights-public";
import { isExternalSponsoredHref } from "@/lib/sponsored-highlights-public";

interface PublicSponsoredCardProps {
  card: PublicSponsoredCardModel;
  compact?: boolean;
  className?: string;
}

function joinClasses(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export default function PublicSponsoredCard({
  card,
  compact = false,
  className,
}: PublicSponsoredCardProps) {
  const href = card.href;
  const external = isExternalSponsoredHref(href);

  const actionClassName =
    "inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-600";

  const actionContent = (
    <>
      {card.cta}
      <ArrowRight className="h-4 w-4" />
    </>
  );

  return (
    <article
      className={joinClasses(
        "overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-sm",
        className,
      )}
    >
      <img
        src={card.imageUrl}
        alt={card.title}
        className={joinClasses(
          "w-full object-cover",
          compact ? "h-32" : "h-40",
        )}
      />

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700">
            Patrocinado{card.slotLabel ? ` • ${card.slotLabel}` : ""}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {card.badge}
          </span>
        </div>

        <div>
          <p className="font-semibold text-slate-900">{card.title}</p>
          <p className="text-sm text-slate-500">{card.establishmentName}</p>
          {card.description ? (
            <p className="mt-1 text-xs text-slate-400">{card.description}</p>
          ) : null}
        </div>

        {href ? (
          external ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className={actionClassName}
            >
              {actionContent}
            </a>
          ) : (
            <Link href={href} className={actionClassName}>
              {actionContent}
            </Link>
          )
        ) : (
          <span className={actionClassName}>{actionContent}</span>
        )}
      </div>
    </article>
  );
}
