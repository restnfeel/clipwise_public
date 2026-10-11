import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type CwPageHeroProps = {
  eyebrow: string;
  icon?: LucideIcon;
  title: ReactNode;
  accent?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function CwPageHero({
  eyebrow,
  icon: Icon,
  title,
  accent,
  description,
  actions,
}: CwPageHeroProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-[var(--cw-accent)]">
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {eyebrow}
          </p>
          <h1 className="mt-4 font-serif text-3xl leading-tight tracking-tight md:text-4xl">
            {title}
            {accent ? (
              <>
                {" "}
                <span className="text-[var(--cw-accent)]">{accent}</span>
              </>
            ) : null}
          </h1>
          {description ? (
            <p className="mt-4 text-sm leading-7 text-[var(--cw-body)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
      <div
        className="relative mt-8 h-px bg-[var(--cw-border)]"
        aria-hidden="true"
      >
        <span className="absolute left-0 top-1/2 h-[3px] w-20 -translate-y-1/2 bg-[var(--cw-accent)]" />
      </div>
    </div>
  );
}
