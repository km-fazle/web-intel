import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldLogo } from "@/components/web-check/Logo";
import { SiteFooter } from "@/components/web-check/SiteFooter";
import {
  runCheck,
  type CheckReport,
  type SourceInfo,
  type SourceStatus,
} from "@/lib/web-check/check.functions";
import { EXTERNAL_TOOLS, externalToolHomepage } from "@/lib/web-check/external-tools";

export const Route = createFileRoute("/check/$domain")({
  component: CheckPage,
  head: ({ params }) => ({
    meta: [
      { title: `Web Intel · ${params.domain}` },
      { name: "description", content: `Security & infrastructure report for ${params.domain}` },
    ],
  }),
});

function CheckPage() {
  const { domain } = Route.useParams();
  const fetchCheck = useServerFn(runCheck);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["check", domain],
    queryFn: () => fetchCheck({ data: { domain } }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <main className="min-h-screen pb-16">
      <header className="px-4 md:px-6 py-3 border-b border-border/60 flex items-center justify-between sticky top-0 z-10 backdrop-blur bg-background/80">
        <Link to="/">
          <ShieldLogo />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => refetch()}
            className="text-xs text-muted-foreground hover:text-primary"
            disabled={isFetching}
          >
            {isFetching ? "↻ refreshing…" : "↻ rerun"}
          </button>
          <span className="text-muted-foreground">analyzing</span>
          <span className="text-primary font-semibold">{domain}</span>
        </div>
      </header>

      {isLoading && <LoadingState domain={domain} />}
      {error && (
        <div className="px-4 md:px-6 mt-6 text-destructive text-sm">
          Failed to analyze {domain}: {(error as Error).message}
        </div>
      )}
      {data && <Report r={data} />}
      <SiteFooter className="px-4 md:px-6" />
    </main>
  );
}

function LoadingState({ domain }: { domain: string }) {
  return (
    <div className="px-4 md:px-6 py-12">
      <div className="text-primary text-sm animate-pulse">▸ Resolving {domain}…</div>
      <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="panel h-40 animate-pulse opacity-50" />
        ))}
      </div>
    </div>
  );
}

function Report({ r }: { r: CheckReport }) {
  const issues = countIssues(r);
  return (
    <>
      <div className="px-4 md:px-6 pt-4 pb-2 text-xs text-muted-foreground flex items-center gap-3">
        <span>
          Finished {Object.keys(r.sources).length} lookups in {r.elapsed}s ·{" "}
          <span className={issues > 0 ? "text-warn" : "text-ok"}>{issues} issues</span>
        </span>
        <span className="ml-auto text-[11px]">fetched {timeAgo(r.fetchedAt)}</span>
      </div>

      <Advisory r={r} />

      <section className="px-4 md:px-6 mt-4 masonry [column-width:280px] [column-count:auto]">
        <ServerLocationPanel r={r} />

        <Panel title="SSL Certificate" sourceKey="ssl" sources={r.sources}>
          {r.ssl ? (
            <KV
              rows={[
                ["Subject", r.ssl.subject ?? "—"],
                ["Issuer", r.ssl.issuer ?? "—"],
                ["Valid From", fmtDate(r.ssl.validFrom)],
                ["Valid Till", fmtDate(r.ssl.validTo)],
                ["Days Left", r.ssl.daysRemaining != null ? String(r.ssl.daysRemaining) : "—"],
              ]}
            />
          ) : (
            <Empty>SSL data unavailable</Empty>
          )}
        </Panel>

        <Panel title="Domain Whois" sourceKey="whois" sources={r.sources}>
          {r.whois ? (
            <KV
              rows={[
                ["Registered", r.domain.toUpperCase()],
                ["Registrar", r.whois.registrar ?? "—"],
                ["Created", fmtDate(r.whois.created)],
                ["Updated", fmtDate(r.whois.updated)],
                ["Expires", fmtDate(r.whois.expires)],
                ["Status", r.whois.status[0] ?? "—"],
              ]}
            />
          ) : (
            <Empty>RDAP lookup failed</Empty>
          )}
        </Panel>

        <Panel title="Name Servers" sourceKey="dns-ns" sources={r.sources}>
          {r.dns.NS.length === 0 ? (
            <Empty>None found</Empty>
          ) : (
            r.dns.NS.map((n) => (
              <div key={n} className="text-xs">
                {n.replace(/\.$/, "")}
              </div>
            ))
          )}
        </Panel>

        <Panel title="Server Info" sourceKey="http" sources={r.sources}>
          <KV
            rows={[
              ["Organization", r.geo?.org ?? "—"],
              ["ASN", r.geo?.asn ?? "—"],
              ["IP", r.ip ?? "—"],
              ["Server", r.http?.server ?? "—"],
              ["Status", r.http?.status != null ? String(r.http.status) : "—"],
            ]}
          />
        </Panel>

        <Panel title="Cookies" sourceKey="http" sources={r.sources}>
          {r.http && r.http.cookies.length > 0 ? (
            <div className="space-y-3">
              {r.http.cookies.slice(0, 10).map((c, i) => (
                <div key={i} className="text-xs border-l-2 border-primary/40 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {truncate(c.value, 40) || "(empty)"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.secure && <span className="badge-ok">Secure</span>}
                    {c.httpOnly && <span className="badge-warn">HttpOnly</span>}
                    {c.sameSite && <span className="badge">SameSite={c.sameSite}</span>}
                    {c.path && <span className="badge">Path={truncate(c.path, 18)}</span>}
                    {c.domain && <span className="badge">Domain={truncate(c.domain, 22)}</span>}
                    {c.expires && <span className="badge">Expires</span>}
                    {c.maxAge && <span className="badge">Max-Age={c.maxAge}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No cookies set</Empty>
          )}
        </Panel>

        <Panel title="Headers" sourceKey="http" sources={r.sources}>
          {r.http ? (
            <div className="space-y-1.5">
              {r.http.headers.slice(0, 14).map(([k, v], i) => (
                <div key={i} className="text-[11px]">
                  <div className="text-label truncate">{k}</div>
                  <div className="text-foreground/90 break-words leading-snug">
                    {truncate(v, 140)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No response</Empty>
          )}
        </Panel>

        <Panel title="DNS Records" sourceKey="dns" sources={r.sources}>
          <RecordList label="A" items={r.dns.A} />
          <RecordList label="AAAA" items={r.dns.AAAA} />
          <RecordList label="CNAME" items={r.dns.CNAME} />
          <RecordList label="NS" items={r.dns.NS} />
          <RecordList label="MX" items={r.dns.MX} />
          <RecordList label="TXT" items={r.dns.TXT.map((t) => truncate(t, 70))} />
          <RecordList label="CAA" items={r.dns.CAA} />
        </Panel>

        <Panel title="HTTP Security" sourceKey="http" sources={r.sources}>
          <SecRow label="Content-Security-Policy" v={r.security.csp} />
          <SecRow label="Strict-Transport-Security" v={r.security.hsts} />
          <SecRow label="X-Content-Type-Options" v={r.security.xcto} />
          <SecRow label="X-Frame-Options" v={r.security.xfo} />
          <SecRow label="Referrer-Policy" v={r.security.referrer} />
          <SecRow label="Permissions-Policy" v={r.security.permissions} />
          <SecRow label="Cross-Origin-Opener" v={r.security.coop} />
          <SecRow label="Cross-Origin-Resource" v={r.security.corp} />
        </Panel>

        <Panel title="HSTS Check" sourceKey="http" sources={r.sources}>
          {r.security.hsts ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-label">Enabled</span>
                <span className="text-ok">✓ Yes</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 break-all">
                {r.security.hsts}
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs">
              <span className="text-label">Enabled</span>
              <span className="text-destructive">✕ No</span>
            </div>
          )}
        </Panel>

        <Panel title="Security.Txt" sourceKey="securityTxt" sources={r.sources}>
          {r.securityTxt?.present ? (
            <div className="space-y-2">
              <KV
                rows={[
                  [
                    "Present",
                    <span key="p" className="text-ok">
                      ✓ Yes
                    </span>,
                  ],
                  [
                    "Signed",
                    r.securityTxt.signed ? (
                      <span key="s" className="text-ok">
                        ✓ PGP
                      </span>
                    ) : (
                      <span key="s" className="text-muted-foreground">
                        No
                      </span>
                    ),
                  ],
                  [
                    "URL",
                    <a
                      key="u"
                      className="text-link underline break-all"
                      href={r.securityTxt.url!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {truncate(r.securityTxt.url!, 38)}
                    </a>,
                  ],
                  [
                    "Expires",
                    r.securityTxt.expires ? (
                      <span
                        key="e"
                        className={r.securityTxt.expired ? "text-destructive" : "text-foreground"}
                      >
                        {r.securityTxt.expires}
                        {r.securityTxt.expired ? " (expired)" : ""}
                      </span>
                    ) : (
                      <span key="e" className="text-muted-foreground">
                        —
                      </span>
                    ),
                  ],
                  [
                    "Languages",
                    r.securityTxt.preferredLanguages.length ? (
                      r.securityTxt.preferredLanguages.join(", ")
                    ) : (
                      <span key="l" className="text-muted-foreground">
                        —
                      </span>
                    ),
                  ],
                ]}
              />
              {r.securityTxt.contact.length > 0 && (
                <div>
                  <div className="text-label text-xs mb-1">Contact</div>
                  <ul className="text-xs space-y-0.5">
                    {r.securityTxt.contact.map((c, i) => {
                      const href =
                        c.startsWith("mailto:") || c.startsWith("http") || c.startsWith("tel:")
                          ? c
                          : c.includes("@")
                            ? `mailto:${c}`
                            : null;
                      return (
                        <li key={i} className="break-all">
                          {href ? (
                            <a
                              className="text-link underline"
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {c}
                            </a>
                          ) : (
                            <span>{c}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {r.securityTxt.encryption.length > 0 && (
                <div>
                  <div className="text-label text-xs mb-1">Encryption</div>
                  <ul className="text-xs space-y-0.5">
                    {r.securityTxt.encryption.map((c, i) => (
                      <li key={i} className="break-all">
                        <a
                          className="text-link underline"
                          href={c}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {truncate(c, 48)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(r.securityTxt.policy.length > 0 ||
                r.securityTxt.acknowledgments.length > 0 ||
                r.securityTxt.hiring.length > 0) && (
                <div className="grid grid-cols-1 gap-1 text-xs">
                  {r.securityTxt.policy.map((v, i) => (
                    <div key={`p${i}`}>
                      <span className="text-label">Policy: </span>
                      <a
                        className="text-link underline break-all"
                        href={v}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {truncate(v, 40)}
                      </a>
                    </div>
                  ))}
                  {r.securityTxt.acknowledgments.map((v, i) => (
                    <div key={`a${i}`}>
                      <span className="text-label">Ack: </span>
                      <a
                        className="text-link underline break-all"
                        href={v}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {truncate(v, 40)}
                      </a>
                    </div>
                  ))}
                  {r.securityTxt.hiring.map((v, i) => (
                    <div key={`h${i}`}>
                      <span className="text-label">Hiring: </span>
                      <a
                        className="text-link underline break-all"
                        href={v}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {truncate(v, 40)}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between text-xs">
              <span className="text-label">Present</span>
              <span className="text-destructive">✕ No</span>
            </div>
          )}
        </Panel>

        <Panel title="Email Configuration" sourceKey="email-spf" sources={r.sources}>
          <div className="text-label text-xs mb-1">Mail Security Checklist</div>
          <CheckRow k="SPF" ok={r.email.spf} />
          <CheckRow k="DMARC" ok={r.email.dmarc} />
          <CheckRow k="BIMI" ok={r.email.bimi} />
          <div className="text-[11px] text-muted-foreground mt-2">
            DKIM requires a selector; not auto-detected.
          </div>
        </Panel>

        <Panel title="DNSSEC" sourceKey="dnssec" sources={r.sources}>
          <CheckRow k="DNSKEY" ok={r.dnssec.DNSKEY} />
          <CheckRow k="DS" ok={r.dnssec.DS} />
          <CheckRow k="RRSIG" ok={r.dnssec.RRSIG} />
        </Panel>

        <Panel title="Server Status" sourceKey="http" sources={r.sources}>
          <KV
            rows={[
              [
                "Up",
                r.http?.ok ? (
                  <span key="o" className="text-ok">
                    ✓ Online
                  </span>
                ) : (
                  <span key="d" className="text-destructive">
                    ✕ Down
                  </span>
                ),
              ],
              ["Status", r.http?.status != null ? String(r.http.status) : "—"],
              ["Response Time", r.http?.elapsedMs != null ? `${r.http.elapsedMs}ms` : "—"],
              ["Final URL", r.http?.finalUrl ? truncate(r.http.finalUrl, 36) : "—"],
            ]}
          />
        </Panel>

        <Panel title="Redirects" sourceKey="http" sources={r.sources}>
          {r.http?.redirected ? (
            <div className="text-xs">
              Redirected to <span className="text-link break-all">{r.http.finalUrl}</span>
            </div>
          ) : (
            <Empty>No redirects followed</Empty>
          )}
        </Panel>

        <Panel title="MX Records" sourceKey="dns-mx" sources={r.sources}>
          {r.dns.MX.length === 0 ? (
            <Empty>None</Empty>
          ) : (
            r.dns.MX.map((m) => {
              const match = m.match(/^(\d+)\s+(.+)$/);
              const prio = match ? match[1] : null;
              const host = match ? match[2] : m;
              return (
                <div key={m} className="flex items-center gap-2 text-xs py-0.5">
                  {prio && <span className="badge">{prio}</span>}
                  <span className="break-all text-foreground">{host}</span>
                </div>
              );
            })
          )}
        </Panel>

        <Panel title="SOA" sourceKey="dns-soa" sources={r.sources}>
          {r.dns.SOA.length === 0 ? (
            <Empty>None</Empty>
          ) : (
            <div className="text-xs break-all">{r.dns.SOA[0]}</div>
          )}
        </Panel>

        <Panel title="TXT Records" sourceKey="dns-txt" sources={r.sources}>
          {r.dns.TXT.length === 0 ? (
            <Empty>None</Empty>
          ) : (
            r.dns.TXT.slice(0, 8).map((t, i) => (
              <div key={i} className="text-[11px] text-muted-foreground break-all py-0.5">
                {t}
              </div>
            ))
          )}
        </Panel>

        <Panel title="Social Tags" sourceKey="socialTags" sources={r.sources}>
          {r.socialTags ? (
            <div className="space-y-1">
              <KV
                rows={[
                  ["Title", truncate(r.socialTags.title ?? "—", 60)],
                  ["Description", truncate(r.socialTags.description ?? "—", 80)],
                  ["OG Title", truncate(r.socialTags.ogTitle ?? "—", 60)],
                  ["OG Type", r.socialTags.ogType ?? "—"],
                  ["OG Site", r.socialTags.ogSiteName ?? "—"],
                  ["Twitter", r.socialTags.twitterSite ?? r.socialTags.twitterCreator ?? "—"],
                  ["Theme Color", r.socialTags.themeColor ?? "—"],
                  ["Author", r.socialTags.author ?? "—"],
                ]}
              />
              {r.socialTags.ogImage && (
                <a
                  href={r.socialTags.ogImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-link underline break-all block mt-1"
                >
                  View OG image ↗
                </a>
              )}
            </div>
          ) : (
            <Empty>Could not fetch page</Empty>
          )}
        </Panel>

        <Panel title="Linked Pages" sourceKey="linkedPages" sources={r.sources}>
          {r.linkedPages ? (
            <>
              <KV
                rows={[
                  ["Internal", String(r.linkedPages.internal)],
                  ["External", String(r.linkedPages.external)],
                ]}
              />
              {r.linkedPages.externalHosts.length > 0 && (
                <div className="mt-2">
                  <div className="text-label text-[11px] mb-1">External hosts</div>
                  {r.linkedPages.externalHosts.map((h) => (
                    <div key={h} className="text-[11px] text-foreground/80 break-all">
                      {h}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Empty>No data</Empty>
          )}
        </Panel>

        <Panel title="Crawl Rules" sourceKey="crawl" sources={r.sources}>
          {r.crawlRules &&
          (r.crawlRules.disallow.length > 0 || r.crawlRules.sitemaps.length > 0) ? (
            <div className="space-y-2">
              {r.crawlRules.disallow.length > 0 && (
                <div>
                  <div className="text-label text-[11px] mb-1">Disallow rules</div>
                  {r.crawlRules.disallow.slice(0, 12).map((d, i) => (
                    <div key={i} className="text-[11px] flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">{d.agent}</span>
                      <span className="text-foreground/90 break-all text-right">
                        {truncate(d.path, 30)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {r.crawlRules.sitemaps.length > 0 && (
                <div>
                  <div className="text-label text-[11px] mb-1">Sitemaps</div>
                  {r.crawlRules.sitemaps.slice(0, 4).map((s) => (
                    <a
                      key={s}
                      href={s}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-link underline break-all block"
                    >
                      {truncate(s, 50)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Empty>No robots.txt rules</Empty>
          )}
        </Panel>

        <Panel title="Archive History" sourceKey="archive" sources={r.sources}>
          {r.archive && r.archive.available ? (
            <>
              <KV
                rows={[
                  ["First Scan", r.archive.firstScan ?? "—"],
                  ["Last Scan", r.archive.lastScan ?? "—"],
                  [
                    "Total Scans",
                    r.archive.totalScans != null
                      ? `~${r.archive.totalScans.toLocaleString()}`
                      : "—",
                  ],
                ]}
              />
              {r.archive.snapshotUrl && (
                <a
                  href={r.archive.snapshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-link underline break-all block mt-2"
                >
                  View latest snapshot ↗
                </a>
              )}
            </>
          ) : (
            <Empty>Not in Wayback Machine</Empty>
          )}
        </Panel>

        <Panel title="Carbon Footprint" sourceKey="carbon" sources={r.sources}>
          {r.carbon ? (
            <KV
              rows={[
                ["Page Size", `${(r.carbon.bytes / 1024).toFixed(1)} KB`],
                ["CO₂ per load", `${r.carbon.co2Grams} g`],
                [
                  "Cleaner than",
                  r.carbon.cleanerThanPercent != null
                    ? `${r.carbon.cleanerThanPercent}% of pages`
                    : "—",
                ],
              ]}
            />
          ) : (
            <Empty>Page not loaded</Empty>
          )}
        </Panel>

        <Panel title="Firewall" sourceKey="firewall" sources={r.sources}>
          {r.firewall.detected ? (
            <KV
              rows={[
                ["Detected", <span className="text-ok">✓ Yes</span>],
                ["Provider", r.firewall.name ?? "—"],
                ["Evidence", r.firewall.evidence ?? "—"],
              ]}
            />
          ) : (
            <div className="text-xs">
              <div className="text-destructive">✕ Not detected</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                No common WAF/CDN headers found
              </div>
            </div>
          )}
        </Panel>
      </section>

      {r.errors.length > 0 && (
        <div className="px-4 md:px-6 mt-4 text-[11px] text-warn">Notes: {r.errors.join(" · ")}</div>
      )}

      <ExternalTools domain={r.domain} />
    </>
  );
}

function ServerLocationPanel({ r }: { r: CheckReport }) {
  const lat = r.geo?.lat;
  const lng = r.geo?.lng;
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  const info = r.sources.geo;
  // Tight bbox (~0.6° lng × 0.4° lat) so the marker sits centered with useful zoom.
  const delta = 0.3;
  const bbox = hasCoords
    ? `${(lng - delta).toFixed(4)},${(lat - delta * 0.7).toFixed(4)},${(lng + delta).toFixed(4)},${(lat + delta * 0.7).toFixed(4)}`
    : null;
  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
    : null;
  const osmLink = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=6/${lat}/${lng}`
    : null;
  return (
    <div className="panel md:col-span-2 md:row-span-2">
      <div className="panel-title flex items-center justify-between">
        <span className="flex items-center gap-2">
          Server Location
          {info && sourceDot(info.status)}
        </span>
        {info && (
          <span
            className="text-[10px] text-muted-foreground"
            title={new Date(info.fetchedAt).toLocaleString()}
          >
            {timeAgo(info.fetchedAt)}
          </span>
        )}
      </div>
      <KV
        rows={[
          ["City", r.geo?.city ?? "—"],
          ["Region", r.geo?.region ?? "—"],
          ["Country", r.geo?.country ?? "—"],
          ["Timezone", r.geo?.tz ?? "—"],
          ["Lat / Lng", hasCoords ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "—"],
        ]}
      />
      {hasCoords && mapSrc ? (
        <div className="mt-3 space-y-1">
          <div className="rounded overflow-hidden border border-border bg-background">
            <iframe
              key={mapSrc}
              title={`Server location map for ${r.domain}`}
              src={mapSrc}
              className="w-full h-64 block"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a
            href={osmLink!}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-accent hover:underline"
          >
            View larger map on OpenStreetMap →
          </a>
        </div>
      ) : (
        <div className="mt-3 rounded border border-dashed border-border h-64 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
          Map unavailable — no geolocation could be resolved for this server's IP address.
        </div>
      )}
    </div>
  );
}

function SecRow({ label, v }: { label: string; v: string | null }) {
  return (
    <div className="flex justify-between text-xs py-0.5 gap-2">
      <span className="text-label shrink-0">{label}</span>
      <span className={v ? "text-ok truncate text-right" : "text-destructive"}>
        {v ? "✓ " + truncate(v, 28) : "✕ No"}
      </span>
    </div>
  );
}

function CheckRow({ k, ok }: { k: string; ok: boolean | null }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-label">{k}</span>
      <span className={ok == null ? "text-muted-foreground" : ok ? "text-ok" : "text-destructive"}>
        {ok == null ? "—" : ok ? "✓ Yes" : "✕ No"}
      </span>
    </div>
  );
}

function RecordList({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-1">
      <div className="text-label text-xs">{label}</div>
      {items.slice(0, 6).map((a, i) => (
        <div key={i} className="text-xs break-all">
          {a}
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-muted-foreground">{children}</div>;
}

function truncate(s: string, n: number) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function sourceDot(status: SourceStatus) {
  const map: Record<SourceStatus, string> = {
    ok: "bg-ok",
    empty: "bg-warn",
    error: "bg-destructive",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${map[status]} ${status === "error" ? "animate-pulse" : ""}`}
      title={status}
    />
  );
}

function countIssues(r: CheckReport) {
  let n = 0;
  if (!r.security.csp) n++;
  if (!r.security.hsts) n++;
  if (!r.security.xcto) n++;
  if (!r.security.xfo) n++;
  if (!r.email.spf) n++;
  if (!r.email.dmarc) n++;
  return n;
}

function Panel({
  title,
  sourceKey,
  sources,
  children,
}: {
  title: string;
  sourceKey?: string;
  sources?: Record<string, SourceInfo>;
  children: React.ReactNode;
}) {
  const info = sourceKey && sources ? sources[sourceKey] : undefined;
  return (
    <div className="panel">
      <div className="panel-title flex items-center justify-between">
        <span className="flex items-center gap-2">
          {title}
          {info && sourceDot(info.status)}
        </span>
        {info && (
          <span
            className="text-[10px] text-muted-foreground"
            title={new Date(info.fetchedAt).toLocaleString()}
          >
            {timeAgo(info.fetchedAt)}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function KV({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="kv">
      {rows.map(([k, v], i) => (
        <span key={i} className="contents">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </span>
      ))}
    </dl>
  );
}

function Advisory({ r }: { r: CheckReport }) {
  const issues: Array<[string, string]> = [];
  if (!r.security.csp)
    issues.push([
      "Missing Content-Security-Policy",
      "Set the Content-Security-Policy response header",
    ]);
  if (!r.security.hsts)
    issues.push(["No HSTS header", "Add Strict-Transport-Security to enforce HTTPS"]);
  if (!r.security.xcto)
    issues.push(["Missing X-Content-Type-Options", "Set X-Content-Type-Options: nosniff"]);
  if (!r.security.xfo)
    issues.push(["Missing X-Frame-Options", "Set X-Frame-Options to prevent clickjacking"]);

  const warnings: Array<[string, string]> = [];
  if (!r.email.spf) warnings.push(["No SPF record", "Add SPF TXT record to prevent spoofing"]);
  if (!r.email.dmarc)
    warnings.push(["No DMARC record", "Publish DMARC policy at _dmarc subdomain"]);
  if (!r.dnssec.DNSKEY)
    warnings.push(["DNSSEC not enabled", "Enable DNSSEC for cryptographic DNS validation"]);

  const passes: Array<[string, string]> = [];
  if (r.security.csp) passes.push(["Content-Security-Policy", "Header is set"]);
  if (r.security.hsts) passes.push(["HSTS", "Strict-Transport-Security is set"]);
  if (r.http?.ok) passes.push(["Server online", `HTTP ${r.http.status}`]);
  if (r.ssl) passes.push(["SSL Certificate", `Valid · ${r.ssl.daysRemaining ?? "?"} days left`]);

  return (
    <div className="mx-4 md:mx-6 mt-2 panel">
      <div className="panel-title">Advisory</div>
      <AdvisoryGroup color="text-destructive" label="Issues" items={issues} open />
      <AdvisoryGroup color="text-warn" label="Warnings" items={warnings} />
      <AdvisoryGroup color="text-ok" label="Passes" items={passes} />
    </div>
  );
}

function AdvisoryGroup({
  color,
  label,
  items,
  open,
}: {
  color: string;
  label: string;
  items: Array<[string, string]>;
  open?: boolean;
}) {
  return (
    <details open={open} className="text-xs mt-2">
      <summary className={`cursor-pointer ${color} font-semibold`}>
        ▸ {label} ({items.length})
      </summary>
      <ul className="mt-2 space-y-2 pl-3">
        {items.map(([title, desc]) => (
          <li key={title}>
            <div className={color}>{title}</div>
            <div className="text-muted-foreground">{desc}</div>
          </li>
        ))}
      </ul>
    </details>
  );
}

function ExternalTools({ domain }: { domain: string }) {
  return (
    <section className="px-4 md:px-6 mt-6">
      <h2 className="text-primary font-semibold mb-3">External Tools for Further Research</h2>
      <p className="text-[11px] text-muted-foreground mb-3">
        Reference links only — Web Intel does not run these checks. Each card opens the tool with{" "}
        <span className="text-foreground font-medium">{domain}</span> pre-filled where supported.
      </p>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
        {EXTERNAL_TOOLS.map((tool) => {
          const searchHref = tool.searchUrl(domain);
          const homeHref = externalToolHomepage(tool);
          return (
            <div
              key={tool.name}
              className="panel hover:border-primary transition-colors flex flex-col"
            >
              <a
                href={searchHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block flex-1 min-w-0"
                title={`Search ${domain} on ${tool.name}`}
              >
                <div className="font-semibold text-foreground">{tool.name}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{tool.description}</p>
                <p className="text-[11px] text-primary mt-2 truncate">Search {domain} ↗</p>
              </a>
              <a
                href={homeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link underline text-xs truncate mt-2 w-fit"
                title={`${tool.name} homepage`}
              >
                {tool.host}
              </a>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-4">
        These tools are not affiliated with Web Intel. Use at your own risk.
      </p>
    </section>
  );
}
