import { createServerFn } from "@tanstack/react-start";

export interface DnsAnswer { name: string; type: number; data: string; TTL?: number }

export type SourceStatus = "ok" | "error" | "empty";

export interface SourceInfo {
  status: SourceStatus;
  fetchedAt: string;
  error?: string;
}

export interface CheckReport {
  domain: string;
  elapsed: string;
  fetchedAt: string;
  ip: string | null;
  geo: {
    city: string | null;
    region: string | null;
    country: string | null;
    countryCode: string | null;
    lat: number | null;
    lng: number | null;
    tz: string | null;
    org: string | null;
    asn: string | null;
  } | null;
  dns: {
    A: string[];
    AAAA: string[];
    NS: string[];
    MX: string[];
    TXT: string[];
    SOA: string[];
    CAA: string[];
    CNAME: string[];
  };
  dnssec: { DNSKEY: boolean; DS: boolean; RRSIG: boolean };
  http: {
    ok: boolean;
    status: number | null;
    finalUrl: string | null;
    redirected: boolean;
    server: string | null;
    elapsedMs: number | null;
    headers: Array<[string, string]>;
    cookies: ParsedCookie[];
  } | null;
  security: {
    csp: string | null;
    hsts: string | null;
    xfo: string | null;
    xcto: string | null;
    referrer: string | null;
    permissions: string | null;
    coop: string | null;
    corp: string | null;
    coep: string | null;
  };
  ssl: {
    issuer: string | null;
    subject: string | null;
    validFrom: string | null;
    validTo: string | null;
    daysRemaining: number | null;
  } | null;
  whois: {
    registrar: string | null;
    created: string | null;
    updated: string | null;
    expires: string | null;
    nameservers: string[];
    status: string[];
  } | null;
  email: { spf: boolean; dkim: boolean | null; dmarc: boolean; bimi: boolean };
  securityTxt: {
    present: boolean;
    url: string | null;
    signed: boolean;
    contact: string[];
    encryption: string[];
    expires: string | null;
    expired: boolean | null;
    preferredLanguages: string[];
    canonical: string[];
    policy: string[];
    hiring: string[];
    acknowledgments: string[];
    raw: string | null;
  } | null;
  socialTags: {
    title: string | null;
    description: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    ogType: string | null;
    ogSiteName: string | null;
    twitterCard: string | null;
    twitterSite: string | null;
    twitterCreator: string | null;
    themeColor: string | null;
    author: string | null;
    canonical: string | null;
    favicon: string | null;
  } | null;
  linkedPages: {
    internal: number;
    external: number;
    externalHosts: string[];
  } | null;
  crawlRules: {
    userAgents: string[];
    disallow: Array<{ agent: string; path: string }>;
    sitemaps: string[];
  } | null;
  archive: {
    available: boolean;
    firstScan: string | null;
    lastScan: string | null;
    totalScans: number | null;
    snapshotUrl: string | null;
  } | null;
  carbon: {
    bytes: number;
    co2Grams: number;
    cleanerThanPercent: number | null;
  } | null;
  firewall: {
    detected: boolean;
    name: string | null;
    evidence: string | null;
  };
  errors: string[];
  sources: Record<string, SourceInfo>;
}

export interface ParsedCookie {
  name: string;
  value: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  path: string | null;
  domain: string | null;
  expires: string | null;
  maxAge: string | null;
  raw: string;
}

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function doh(name: string, type: string): Promise<string[]> {
  const data = await fetchJson(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    { headers: { Accept: "application/dns-json" } },
  );
  if (!data || !Array.isArray(data.Answer)) return [];
  const typeNum = DNS_TYPE_NUM[type];
  return data.Answer
    .filter((a: DnsAnswer) => a.data && (typeNum == null || a.type === typeNum))
    .map((a: DnsAnswer) => normalizeDnsValue(type, String(a.data)));
}

const DNS_TYPE_NUM: Record<string, number> = {
  A: 1, NS: 2, CNAME: 5, SOA: 6, PTR: 12, MX: 15, TXT: 16, AAAA: 28, CAA: 257,
};

function stripTrailingDot(s: string): string {
  return s.endsWith(".") ? s.slice(0, -1) : s;
}

function unquoteTxt(s: string): string {
  // Cloudflare TXT data may be `"chunk"` or `"chunk1" "chunk2"` for long records.
  const matches = s.match(/"((?:\\.|[^"\\])*)"/g);
  if (matches && matches.length > 0) {
    return matches.map((m) => m.slice(1, -1).replace(/\\(.)/g, "$1")).join("");
  }
  return s;
}

function normalizeDnsValue(type: string, raw: string): string {
  switch (type) {
    case "TXT":
      return unquoteTxt(raw);
    case "MX": {
      // "10 mail.example.com."
      const m = raw.match(/^(\d+)\s+(.+?)\.?$/);
      return m ? `${m[1]} ${stripTrailingDot(m[2])}` : raw;
    }
    case "NS":
    case "CNAME":
    case "PTR":
      return stripTrailingDot(raw);
    case "SOA": {
      // "ns.example.com. hostmaster.example.com. 2024 7200 3600 1209600 3600"
      const parts = raw.split(/\s+/);
      if (parts.length >= 2) {
        parts[0] = stripTrailingDot(parts[0]);
        parts[1] = stripTrailingDot(parts[1]);
      }
      return parts.join(" ");
    }
    default:
      return raw;
  }
}

async function getDnssec(name: string): Promise<{ DNSKEY: boolean; DS: boolean; RRSIG: boolean }> {
  const [dk, ds] = await Promise.all([
    fetchJson(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=DNSKEY&do=1`, { headers: { Accept: "application/dns-json" } }),
    fetchJson(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=DS&do=1`, { headers: { Accept: "application/dns-json" } }),
  ]);
  const hasRrsig = !!(dk && Array.isArray(dk.Answer) && dk.Answer.some((a: DnsAnswer) => a.type === 46));
  return {
    DNSKEY: !!(dk && Array.isArray(dk.Answer) && dk.Answer.some((a: DnsAnswer) => a.type === 48)),
    DS: !!(ds && Array.isArray(ds.Answer) && ds.Answer.some((a: DnsAnswer) => a.type === 43)),
    RRSIG: hasRrsig,
  };
}

async function getGeo(ip: string) {
  const data = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (!data || data.success === false) return null;
  return {
    city: data.city ?? null,
    region: data.region ?? null,
    country: data.country ?? null,
    countryCode: data.country_code ?? null,
    lat: typeof data.latitude === "number" ? data.latitude : null,
    lng: typeof data.longitude === "number" ? data.longitude : null,
    tz: data.timezone?.id ?? null,
    org: data.connection?.org ?? data.connection?.isp ?? null,
    asn: data.connection?.asn ? `AS${data.connection.asn}` : null,
  };
}

function splitSetCookies(combined: string): string[] {
  // Split on comma+space only when it precedes a cookie name token followed by =.
  // This avoids splitting on commas inside Expires dates like "Wed, 21 Oct 2025".
  return combined.split(/,\s*(?=[a-zA-Z0-9!#$%&'*+\-.^_`|~]+=)/g).filter(Boolean);
}

function parseSetCookie(raw: string): ParsedCookie {
  const parts = raw.split(";").map((p) => p.trim());
  const [nameValue = ""] = parts;
  const eqIdx = nameValue.indexOf("=");
  const name = eqIdx >= 0 ? nameValue.slice(0, eqIdx).trim() : nameValue.trim();
  const value = eqIdx >= 1 ? nameValue.slice(eqIdx + 1) : "";

  const attrs: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const attrEq = part.indexOf("=");
    if (attrEq >= 0) {
      const key = part.slice(0, attrEq).trim().toLowerCase();
      attrs[key] = part.slice(attrEq + 1).trim();
    } else {
      attrs[part.trim().toLowerCase()] = "true";
    }
  }

  return {
    name,
    value,
    secure: "secure" in attrs,
    httpOnly: "httponly" in attrs,
    sameSite: attrs["samesite"] ?? null,
    path: attrs["path"] ?? null,
    domain: attrs["domain"] ?? null,
    expires: attrs["expires"] ?? null,
    maxAge: attrs["max-age"] ?? null,
    raw,
  };
}

async function getHttp(domain: string) {
  const started = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://${domain}/`, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 WebCheck" },
    });
    const elapsedMs = Date.now() - started;
    const headers: Array<[string, string]> = [];
    let rawCookies: string[] = [];

    // Prefer getSetCookie() which returns individual Set-Cookie headers.
    // Fallback to header string + regex split to handle comma-joined values.
    const h = res.headers as unknown as { getSetCookie?: () => string[] };
    if (typeof h.getSetCookie === "function") {
      rawCookies = h.getSetCookie();
    } else {
      const setCookieHeader = res.headers.get("set-cookie");
      if (setCookieHeader) rawCookies = splitSetCookies(setCookieHeader);
    }

    res.headers.forEach((v, k) => {
      if (k.toLowerCase() !== "set-cookie") headers.push([k, v]);
    });

    const cookies = rawCookies.map(parseSetCookie);

    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url,
      redirected: res.redirected,
      server: res.headers.get("server"),
      elapsedMs,
      headers,
      cookies,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function pickHeader(headers: Array<[string, string]>, key: string) {
  const k = key.toLowerCase();
  const hit = headers.find(([h]) => h.toLowerCase() === k);
  return hit ? hit[1] : null;
}

async function getRdap(domain: string) {
  const data = await fetchJson(`https://rdap.org/domain/${encodeURIComponent(domain)}`, undefined, 8000);
  if (!data) return null;
  const events: Array<{ eventAction?: string; eventDate?: string }> = data.events ?? [];
  const evt = (a: string) => events.find((e) => e.eventAction === a)?.eventDate ?? null;
  const registrar =
    Array.isArray(data.entities)
      ? (data.entities.find((e: { roles?: string[]; vcardArray?: unknown[] }) => e.roles?.includes("registrar"))?.vcardArray as unknown[] | undefined)
      : undefined;
  let registrarName: string | null = null;
  if (Array.isArray(registrar) && Array.isArray(registrar[1])) {
    const vcardEntries = registrar[1] as Array<[string, Record<string, unknown>, string, string]>;
    const fn = vcardEntries.find((v) => v[0] === "fn");
    if (fn && typeof fn[3] === "string") registrarName = fn[3];
  }
  const ns = Array.isArray(data.nameservers)
    ? (data.nameservers as Array<{ ldhName?: string }>).map((n) => (n.ldhName ?? "").toLowerCase()).filter(Boolean)
    : [];
  return {
    registrar: registrarName,
    created: evt("registration"),
    updated: evt("last changed"),
    expires: evt("expiration"),
    nameservers: ns,
    status: Array.isArray(data.status) ? (data.status as string[]) : [],
  };
}

async function getSsl(domain: string) {
  const data = await fetchJson(`https://ssl-checker.io/api/v1/check/${encodeURIComponent(domain)}`, undefined, 8000);
  if (!data || !data.result) return null;
  const r = data.result;
  return {
    issuer: r.issuer_o ?? r.issuer_cn ?? null,
    subject: r.host ?? null,
    validFrom: r.valid_from ?? null,
    validTo: r.valid_till ?? null,
    daysRemaining: typeof r.days_left === "number" ? r.days_left : null,
  };
}

async function getSecurityTxt(domain: string) {
  const empty = {
    present: false,
    url: null as string | null,
    signed: false,
    contact: [] as string[],
    encryption: [] as string[],
    expires: null as string | null,
    expired: null as boolean | null,
    preferredLanguages: [] as string[],
    canonical: [] as string[],
    policy: [] as string[],
    hiring: [] as string[],
    acknowledgments: [] as string[],
    raw: null as string | null,
  };
  for (const path of ["/.well-known/security.txt", "/security.txt"]) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`https://${domain}${path}`, { signal: ctrl.signal, redirect: "follow" });
      clearTimeout(t);
      if (res.ok) {
        const text = await res.text();
        if (text.toLowerCase().includes("contact:")) {
          return parseSecurityTxt(text, `https://${domain}${path}`);
        }
      }
    } catch {
      // ignore
    }
  }
  return empty;
}

function parseSecurityTxt(text: string, url: string) {
  const signed = text.includes("-----BEGIN PGP SIGNED MESSAGE-----");
  const fields: Record<string, string[]> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("-----")) continue;
    if (line.startsWith("Hash:") && signed) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (!val) continue;
    (fields[key] ??= []).push(val);
  }
  const expires = fields["expires"]?.[0] ?? null;
  let expired: boolean | null = null;
  if (expires) {
    const d = Date.parse(expires);
    if (!Number.isNaN(d)) expired = d < Date.now();
  }
  return {
    present: true,
    url,
    signed,
    contact: fields["contact"] ?? [],
    encryption: fields["encryption"] ?? [],
    expires,
    expired,
    preferredLanguages: (fields["preferred-languages"] ?? []).flatMap((v) =>
      v.split(",").map((s) => s.trim()).filter(Boolean),
    ),
    canonical: fields["canonical"] ?? [],
    policy: fields["policy"] ?? [],
    hiring: fields["hiring"] ?? [],
    acknowledgments: fields["acknowledgments"] ?? [],
    raw: text.length > 4000 ? text.slice(0, 4000) + "\n…(truncated)" : text,
  };
}

async function withSource<T>(
  name: string,
  fn: () => Promise<T>,
  isEmpty?: (result: T) => boolean,
): Promise<{ info: SourceInfo; result: T }> {
  const fetchedAt = new Date().toISOString();
  try {
    const result = await fn();
    const empty = isEmpty ? isEmpty(result) : false;
    return {
      info: { status: empty ? "empty" : "ok", fetchedAt },
      result,
    };
  } catch (e) {
    return {
      info: { status: "error", fetchedAt, error: e instanceof Error ? e.message : String(e) },
      result: undefined as unknown as T,
    };
  }
}

function pickMeta(html: string, attr: "name" | "property", key: string): string | null {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*>`, "i");
  const m = html.match(re);
  if (!m) return null;
  const contentMatch = m[0].match(/content=["']([^"']*)["']/i);
  return contentMatch ? contentMatch[1] : null;
}

function pickTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function pickLink(html: string, rel: string): string | null {
  const re = new RegExp(`<link[^>]+rel=["'][^"']*${rel}[^"']*["'][^>]*>`, "i");
  const m = html.match(re);
  if (!m) return null;
  const href = m[0].match(/href=["']([^"']+)["']/i);
  return href ? href[1] : null;
}

async function fetchPageHtml(domain: string): Promise<{ html: string; bytes: number } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://${domain}/`, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 WebIntel" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return { html: text, bytes: text.length };
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    const MAX = 500_000;
    while (total < MAX) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
    try { await reader.cancel(); } catch { /* ignore */ }
    const merged = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.byteLength; }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(merged);
    return { html, bytes: total };
  } catch {
    return null;
  }
}

function getSocialTags(html: string, domain: string) {
  const canonical = pickLink(html, "canonical");
  const favicon = pickLink(html, "icon");
  return {
    title: pickTitle(html),
    description: pickMeta(html, "name", "description"),
    ogTitle: pickMeta(html, "property", "og:title"),
    ogDescription: pickMeta(html, "property", "og:description"),
    ogImage: pickMeta(html, "property", "og:image"),
    ogType: pickMeta(html, "property", "og:type"),
    ogSiteName: pickMeta(html, "property", "og:site_name"),
    twitterCard: pickMeta(html, "name", "twitter:card"),
    twitterSite: pickMeta(html, "name", "twitter:site"),
    twitterCreator: pickMeta(html, "name", "twitter:creator"),
    themeColor: pickMeta(html, "name", "theme-color"),
    author: pickMeta(html, "name", "author"),
    canonical: canonical ? (canonical.startsWith("http") ? canonical : `https://${domain}${canonical}`) : null,
    favicon: favicon ? (favicon.startsWith("http") ? favicon : `https://${domain}${favicon.startsWith("/") ? favicon : "/" + favicon}`) : null,
  };
}

function getLinkedPages(html: string, domain: string) {
  let internal = 0;
  let external = 0;
  const hosts = new Set<string>();
  const re = /<a\s+[^>]*href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    if (href.startsWith("/") || href.startsWith("./") || href.startsWith("?")) {
      internal++;
      continue;
    }
    try {
      const u = new URL(href, `https://${domain}/`);
      if (u.hostname === domain || u.hostname.endsWith("." + domain)) {
        internal++;
      } else {
        external++;
        hosts.add(u.hostname);
      }
    } catch {
      // ignore
    }
  }
  return { internal, external, externalHosts: [...hosts].slice(0, 12) };
}

async function getCrawlRules(domain: string) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`https://${domain}/robots.txt`, { signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return { userAgents: [], disallow: [], sitemaps: [] };
    const text = await res.text();
    if (text.length > 50_000) return { userAgents: [], disallow: [], sitemaps: [] };
    const userAgents: string[] = [];
    const disallow: Array<{ agent: string; path: string }> = [];
    const sitemaps: string[] = [];
    let currentAgent = "*";
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.replace(/#.*$/, "").trim();
      if (!line) continue;
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const k = line.slice(0, idx).trim().toLowerCase();
      const v = line.slice(idx + 1).trim();
      if (k === "user-agent") {
        currentAgent = v || "*";
        if (!userAgents.includes(currentAgent)) userAgents.push(currentAgent);
      } else if (k === "disallow") {
        if (v) disallow.push({ agent: currentAgent, path: v });
      } else if (k === "sitemap") {
        sitemaps.push(v);
      }
    }
    return { userAgents, disallow: disallow.slice(0, 40), sitemaps };
  } catch {
    return { userAgents: [], disallow: [], sitemaps: [] };
  }
}

async function getArchive(domain: string) {
  // Wayback availability for latest snapshot
  const avail = await fetchJson(
    `https://archive.org/wayback/available?url=${encodeURIComponent(domain)}`,
    undefined,
    6000,
  );
  const snap = avail?.archived_snapshots?.closest;
  // CDX query for first and total counts
  let firstScan: string | null = null;
  let totalScans: number | null = null;
  try {
    const cdxRes = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&limit=1&fl=timestamp&from=19960101`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (cdxRes.ok) {
      const cdx = await cdxRes.json();
      if (Array.isArray(cdx) && cdx.length > 1) firstScan = formatWayback(cdx[1][0]);
    }
    const countRes = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&showNumPages=true`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (countRes.ok) {
      const n = parseInt((await countRes.text()).trim(), 10);
      // showNumPages returns # of 150k pages — multiply rough
      if (!Number.isNaN(n)) totalScans = n * 150_000;
    }
  } catch { /* ignore */ }
  return {
    available: !!snap?.available,
    firstScan,
    lastScan: snap?.timestamp ? formatWayback(snap.timestamp) : null,
    totalScans,
    snapshotUrl: snap?.url ?? null,
  };
}

function formatWayback(ts: string): string | null {
  if (!ts || ts.length < 8) return null;
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
}

function estimateCarbon(bytes: number) {
  // Sustainable Web Foundation v1 simplified: 1.8 g CO2 per MB
  const co2Grams = (bytes / 1_000_000) * 1.8;
  // Naive percentile vs. ~1.5MB median
  const median = 1_500_000;
  const ratio = bytes / median;
  const cleanerThanPercent = ratio <= 1
    ? Math.round((1 - ratio) * 100)
    : 0;
  return { bytes, co2Grams: Math.round(co2Grams * 100) / 100, cleanerThanPercent };
}

function detectFirewall(headers: Array<[string, string]>) {
  const get = (k: string) => pickHeader(headers, k);
  const server = (get("server") ?? "").toLowerCase();
  if (get("cf-ray") || server.includes("cloudflare")) {
    return { detected: true, name: "Cloudflare", evidence: "cf-ray header" };
  }
  if (get("x-sucuri-id") || server.includes("sucuri")) {
    return { detected: true, name: "Sucuri", evidence: "x-sucuri-id" };
  }
  if (server.includes("akamai") || get("x-akamai-transformed")) {
    return { detected: true, name: "Akamai", evidence: "akamai header" };
  }
  if (server.includes("incap") || get("x-iinfo")) {
    return { detected: true, name: "Imperva Incapsula", evidence: "x-iinfo" };
  }
  if (get("x-amz-cf-id") || server.includes("cloudfront")) {
    return { detected: true, name: "AWS CloudFront", evidence: "x-amz-cf-id" };
  }
  if (get("x-fastly-request-id") || server.includes("fastly")) {
    return { detected: true, name: "Fastly", evidence: "fastly header" };
  }
  return { detected: false, name: null, evidence: null };
}

export const runCheck = createServerFn({ method: "GET" })
  .inputValidator((input: { domain: string }) => {
    const d = input.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!DOMAIN_RE.test(d)) throw new Error("Invalid domain");
    return { domain: d };
  })
  .handler(async ({ data }): Promise<CheckReport> => {
    const started = Date.now();
    const errors: string[] = [];
    const domain = data.domain;

    const sA = await withSource("dns", () => doh(domain, "A"), (r) => r.length === 0);
    const sAAAA = await withSource("dns", () => doh(domain, "AAAA"), (r) => r.length === 0);
    const sNS = await withSource("dns-ns", () => doh(domain, "NS"), (r) => r.length === 0);
    const sMX = await withSource("dns-mx", () => doh(domain, "MX"), (r) => r.length === 0);
    const sTXT = await withSource("dns-txt", () => doh(domain, "TXT"), (r) => r.length === 0);
    const sSOA = await withSource("dns-soa", () => doh(domain, "SOA"), (r) => r.length === 0);
    const sCAA = await withSource("dns-caa", () => doh(domain, "CAA"), (r) => r.length === 0);
    const sCNAME = await withSource("dns-cname", () => doh(domain, "CNAME"), (r) => r.length === 0);

    const sDnssec = await withSource("dnssec", () => getDnssec(domain));
    const sHttp = await withSource("http", () => getHttp(domain), (r) => r === null);
    const sWhois = await withSource("whois", () => getRdap(domain), (r) => r === null);
    const sSsl = await withSource("ssl", () => getSsl(domain), (r) => r === null);
    const sSecurityTxt = await withSource("securityTxt", () => getSecurityTxt(domain));

    const sSpf = await withSource("email-spf", () => doh(domain, "TXT"), (r) => r.length === 0);
    const sDmarc = await withSource("email-dmarc", () => doh(`_dmarc.${domain}`, "TXT"), (r) => r.length === 0);
    const sBimi = await withSource("email-bimi", () => doh(`default._bimi.${domain}`, "TXT"), (r) => r.length === 1);

    const sPage = await withSource("page", () => fetchPageHtml(domain), (r) => r === null);
    const sCrawl = await withSource("crawl", () => getCrawlRules(domain), (r) => r.userAgents.length === 0 && r.sitemaps.length === 0);
    const sArchive = await withSource("archive", () => getArchive(domain), (r) => !r.available);

    const ip = sA.result[0] ?? null;
    const sGeo = ip ? await withSource("geo", () => getGeo(ip), (r) => r === null) : { info: { status: "empty" as SourceStatus, fetchedAt: new Date().toISOString() }, result: null };

    const A = sA.result ?? [];
    const AAAA = sAAAA.result ?? [];
    const NS = sNS.result ?? [];
    const MX = sMX.result ?? [];
    const TXT = sTXT.result ?? [];
    const SOA = sSOA.result ?? [];
    const CAA = sCAA.result ?? [];
    const CNAME = sCNAME.result ?? [];
    const dnssec = sDnssec.result ?? { DNSKEY: false, DS: false, RRSIG: false };
    const http = sHttp.result ?? null;
    const whois = sWhois.result ?? null;
    const ssl = sSsl.result ?? null;
    const securityTxt = sSecurityTxt.result;

    const page = sPage.result ?? null;
    const socialTags = page ? getSocialTags(page.html, domain) : null;
    const linkedPages = page ? getLinkedPages(page.html, domain) : null;
    const carbon = page ? estimateCarbon(page.bytes) : null;
    const crawlRules = sCrawl.result ?? null;
    const archive = sArchive.result ?? null;

    const headers = http?.headers ?? [];
    const firewall = detectFirewall(headers);
    const security = {
      csp: pickHeader(headers, "content-security-policy"),
      hsts: pickHeader(headers, "strict-transport-security"),
      xfo: pickHeader(headers, "x-frame-options"),
      xcto: pickHeader(headers, "x-content-type-options"),
      referrer: pickHeader(headers, "referrer-policy"),
      permissions: pickHeader(headers, "permissions-policy"),
      coop: pickHeader(headers, "cross-origin-opener-policy"),
      corp: pickHeader(headers, "cross-origin-resource-policy"),
      coep: pickHeader(headers, "cross-origin-embedder-policy"),
    };

    const spfTxt = sSpf.result ?? [];
    const dmarcTxt = sDmarc.result ?? [];
    const bimiTxt = sBimi.result ?? [];

    const hasSpf = spfTxt.some((t) => t.toLowerCase().includes("v=spf1"));
    const hasDmarc = dmarcTxt.some((t) => t.toLowerCase().includes("v=dmarc1"));
    const hasBimi = bimiTxt.some((t) => t.toLowerCase().includes("v=bimi1"));

    if (!ip) errors.push("No A record found for domain");
    if (!http) errors.push("HTTPS request failed");

    const sources: Record<string, SourceInfo> = {
      dns: sA.info,
      "dns-ns": sNS.info,
      "dns-mx": sMX.info,
      "dns-txt": sTXT.info,
      "dns-soa": sSOA.info,
      "dns-caa": sCAA.info,
      "dns-cname": sCNAME.info,
      dnssec: sDnssec.info,
      http: sHttp.info,
      whois: sWhois.info,
      ssl: sSsl.info,
      securityTxt: sSecurityTxt.info,
      geo: sGeo.info,
      "email-spf": sSpf.info,
      "email-dmarc": sDmarc.info,
      "email-bimi": sBimi.info,
      page: sPage.info,
      socialTags: sPage.info,
      linkedPages: sPage.info,
      carbon: sPage.info,
      crawl: sCrawl.info,
      archive: sArchive.info,
      firewall: sHttp.info,
    };

    return {
      domain,
      elapsed: ((Date.now() - started) / 1000).toFixed(2),
      fetchedAt: new Date().toISOString(),
      ip,
      geo: sGeo.result,
      dns: { A, AAAA, NS, MX, TXT, SOA, CAA, CNAME },
      dnssec,
      http,
      security,
      ssl,
      whois,
      email: { spf: hasSpf, dkim: null, dmarc: hasDmarc, bimi: hasBimi },
      securityTxt,
      socialTags,
      linkedPages,
      crawlRules,
      archive,
      carbon,
      firewall,
      errors,
      sources,
    };
  });
