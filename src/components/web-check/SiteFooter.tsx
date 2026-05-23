import { SITE } from "@/lib/site";

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`border-t border-border/60 px-6 md:px-10 py-4 text-xs text-muted-foreground ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-foreground/90">{SITE.name}</span>
          <span className="hidden sm:inline text-border">·</span>
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            GitHub
          </a>
        </div>
        <p>
          built by{" "}
          <a
            href={SITE.author.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/90 hover:text-primary transition-colors"
          >
            {SITE.author.name}
          </a>
        </p>
      </div>
    </footer>
  );
}
