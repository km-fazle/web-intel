import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldLogo } from "@/components/web-check/Logo";
import { SiteFooter } from "@/components/web-check/SiteFooter";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = url
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    if (!cleaned) return;
    navigate({ to: "/check/$domain", params: { domain: cleaned } });
  };

  return (
    <main className="min-h-screen">
      <header className="px-6 md:px-10 py-6">
        <ShieldLogo />
      </header>

      <section className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-center px-6 md:px-10 pb-20 pt-6 max-w-[1400px] mx-auto min-h-[80vh]">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] text-foreground">
            We give you <span className="text-primary">X-Ray</span>
            <br />
            Vision for your
            <br />
            Website
          </h1>
          <p className="mt-6 text-muted-foreground text-sm md:text-base">
            In just 20 seconds, you can see{" "}
            <em className="text-primary not-italic">what attackers already know</em>
          </p>

          <form onSubmit={submit} className="mt-10 max-w-md">
            <label className="text-xs uppercase tracking-widest text-label">
              Enter a URL to start <span className="text-primary">↓</span>
            </label>
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="E.g. google.com"
              className="mt-3 w-full bg-input border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 font-mono"
            />
            <button
              type="submit"
              className="mt-3 w-full rounded-md border border-primary/60 bg-primary/10 hover:bg-primary hover:text-primary-foreground transition-colors py-3 font-semibold text-primary"
            >
              Analyze URL
            </button>
          </form>

          <p className="mt-8 text-xs text-muted-foreground max-w-md">
            Web Intel provides an OSINT-style snapshot of a target: DNS, SSL, headers, cookies,
            hosting, redirects, security posture and more.
          </p>
        </div>

        {/* Decorative auto-scrolling mosaic */}
        <ScrollingMosaic />
      </section>

      <SiteFooter />
    </main>
  );
}

function ScrollingMosaic() {
  const panels: Array<{ title: string; rows: Array<[string, React.ReactNode]> }> = [
    {
      title: "DNS Records",
      rows: [
        ["A", "151.101.64.81"],
        ["AAAA", "2a04:4e42::81"],
        ["MX", "2a04:4e42:600::81"],
        ["CNAME", "ddns1.bbc.com"],
        ["CNAME", "dns0.bbc.co.uk"],
      ],
    },
    {
      title: "Security.Txt",
      rows: [
        ["Present", <span className="text-ok">✓ Yes</span>],
        ["PGP Signed", <span className="text-ok">✓ Yes</span>],
        ["Hash", "SHA512"],
        ["Contact", <span className="text-link underline">/cloudflare</span>],
        ["Policy", <span className="text-link underline">/disclosure</span>],
        ["Expires", "22 Mar 2026"],
      ],
    },
    {
      title: "Cookies",
      rows: [
        ["SOCS", "CAAaBg1AzqKlBg"],
        ["expires", "06-Aug-2026"],
        ["domain", ".google.com"],
        ["SameSite", "lax"],
      ],
    },
    {
      title: "Linked Pages",
      rows: [
        ["Internal", "329"],
        ["External", "8"],
        ["shop.forem.com", <span className="text-link underline">↗</span>],
        ["github.com/forem", <span className="text-link underline">↗</span>],
      ],
    },
    {
      title: "SSL Certificate",
      rows: [
        ["Subject", "*.dev.to"],
        ["Issuer", "Let's Encrypt"],
        ["Trusted", <span className="text-ok">✓ Yes</span>],
        ["NIST Curve", "P-256"],
        ["Expires", "30 Jul 2026"],
      ],
    },
    {
      title: "HTTP Security",
      rows: [
        ["CSP", <span className="text-destructive">✕ No</span>],
        ["HSTS", <span className="text-ok">✓ Yes</span>],
        ["X-Frame", <span className="text-ok">✓ Yes</span>],
        ["Referrer Policy", <span className="text-destructive">✕ No</span>],
      ],
    },
    {
      title: "Open Ports",
      rows: [
        ["80", <span className="text-ok">open</span>],
        ["443", <span className="text-ok">open</span>],
        ["22", <span className="text-muted-foreground">closed</span>],
        ["3306", <span className="text-muted-foreground">closed</span>],
      ],
    },
    {
      title: "DNSSEC",
      rows: [
        ["DNSKEY", <span className="text-destructive">✕ No</span>],
        ["DS", <span className="text-destructive">✕ No</span>],
        ["RRSIG", <span className="text-destructive">✕ No</span>],
      ],
    },
    {
      title: "TLS Audit",
      rows: [
        ["Grade", <span className="text-ok font-bold">B</span>],
        ["TLSv1.3", <span className="text-ok">✓</span>],
        ["Heartbleed", <span className="text-ok">Safe</span>],
        ["POODLE", <span className="text-ok">Safe</span>],
        ["ROBOT", <span className="text-ok">Safe</span>],
      ],
    },
    {
      title: "Email Config",
      rows: [
        ["SPF", <span className="text-ok">✓</span>],
        ["DKIM", <span className="text-destructive">✕</span>],
        ["DMARC", <span className="text-destructive">✕</span>],
        ["BIMI", <span className="text-destructive">✕</span>],
      ],
    },
    {
      title: "Carbon",
      rows: [
        ["Initial Size", "70.9 KB"],
        ["CO2 / load", "10.0 mg"],
        ["Energy", "20.3 mWh"],
        ["Cleaner than", "84%"],
      ],
    },
    {
      title: "Server Status",
      rows: [
        ["Up?", <span className="text-ok">✓ Online</span>],
        ["Status", "301"],
        ["Response", "30 ms"],
      ],
    },
    {
      title: "Block Lists",
      rows: [
        ["CloudFlare", <span className="text-ok">Clean</span>],
        ["OpenDNS", <span className="text-ok">Clean</span>],
        ["Quad9", <span className="text-ok">Clean</span>],
        ["AdGuard", <span className="text-ok">Clean</span>],
      ],
    },
    {
      title: "Global Ranking",
      rows: [
        ["Rank", <span className="text-primary font-bold">#1</span>],
        ["Δ Yesterday", "0.00%"],
      ],
    },
    {
      title: "Server Info",
      rows: [
        ["Org", "Google LLC"],
        ["ASN", "AS15169"],
        ["IP", "142.251.30.139"],
        ["Type", "self-signed"],
      ],
    },
    {
      title: "Crawl Rules",
      rows: [
        ["User-agent", "*"],
        ["Disallow", "/search"],
        ["Disallow", "/admin"],
        ["Allow", "/public"],
      ],
    },
    {
      title: "Whois",
      rows: [
        ["Registrar", "MarkMonitor"],
        ["Created", "15 Sep 1997"],
        ["Expires", "14 Sep 2028"],
      ],
    },
    {
      title: "Firewall",
      rows: [
        ["Detected", <span className="text-destructive">✕ No*</span>],
        ["Provider", "unknown"],
      ],
    },
  ];

  // Three columns, staggered. Duplicate list for seamless loop.
  const columns = [panels.filter((_, i) => i % 2 === 0), panels.filter((_, i) => i % 2 === 1)];

  return (
    <div className="marquee-mask grid grid-cols-2 gap-3 max-h-[78vh] overflow-hidden">
      {columns.map((col, ci) => (
        <div key={ci} className="relative">
          <div
            className="animate-scroll-up flex flex-col gap-3"
            style={{
              animationDuration: ci === 0 ? "38s" : "52s",
              animationDirection: ci === 1 ? "reverse" : "normal",
            }}
          >
            {[...col, ...col].map((p, i) => (
              <MiniPanel key={`${ci}-${i}`} title={p.title}>
                {p.rows.map(([k, v], ri) => (
                  <Row key={ri} k={k} v={v} />
                ))}
              </MiniPanel>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel ${className}`}>
      <div className="panel-title text-sm">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-label">{k}</span>
      <span className="text-foreground truncate text-right">{v}</span>
    </div>
  );
}
