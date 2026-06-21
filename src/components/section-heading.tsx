import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
};

/** Reusable section header with an optional "view all" link. */
export function SectionHeading({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = "View all",
}: Props) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-ink-muted sm:text-base">{subtitle}</p>
        ) : null}
      </div>
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          className="shrink-0 whitespace-nowrap text-sm font-medium text-neem-deep underline-offset-4 hover:underline"
        >
          {viewAllLabel} →
        </Link>
      ) : null}
    </div>
  );
}
