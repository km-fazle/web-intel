export type ExternalTool = {
  name: string;
  /** Hostname shown for the tool's homepage link */
  host: string;
  /** Optional override when the homepage URL differs from https://{host} */
  homepage?: string;
  description: string;
  searchUrl: (domain: string) => string;
};

function httpsSite(domain: string) {
  return `https://${domain}`;
}

/** Third-party OSINT tools — links only; Web Intel does not call these APIs. */
export const EXTERNAL_TOOLS: ExternalTool[] = [
  {
    name: "Hudson Rock",
    host: "hudsonrock.com",
    description: "Infostealer infection data for domains and emails",
    searchUrl: (domain) => `https://www.hudsonrock.com/search/domain/${encodeURIComponent(domain)}`,
  },
  {
    name: "SSL Labs Test",
    host: "ssllabs.com",
    homepage: "https://www.ssllabs.com/ssltest/",
    description: "SSL/TLS configuration analysis",
    searchUrl: (domain) =>
      `https://www.ssllabs.com/ssltest/analyze.html?d=${encodeURIComponent(domain)}&latest`,
  },
  {
    name: "Virus Total",
    host: "virustotal.com",
    description: "Multi-engine malware and reputation checks",
    searchUrl: (domain) => `https://www.virustotal.com/gui/domain/${encodeURIComponent(domain)}`,
  },
  {
    name: "Shodan",
    host: "shodan.io",
    description: "Internet-connected device search",
    searchUrl: (domain) => `https://www.shodan.io/domain/${encodeURIComponent(domain)}`,
  },
  {
    name: "Archive",
    host: "archive.org",
    description: "Historical snapshots of the site",
    searchUrl: (domain) => `https://web.archive.org/web/*/${encodeURIComponent(httpsSite(domain))}`,
  },
  {
    name: "URLScan",
    host: "urlscan.io",
    description: "Live scan and historical URL intelligence",
    searchUrl: (domain) => `https://urlscan.io/domain/${encodeURIComponent(domain)}`,
  },
  {
    name: "Sucuri SiteCheck",
    host: "sitecheck.sucuri.net",
    description: "Blacklist and malware scanning",
    searchUrl: (domain) => `https://sitecheck.sucuri.net/results/${encodeURIComponent(domain)}`,
  },
  {
    name: "Domain Tools",
    host: "whois.domaintools.com",
    description: "Whois and domain research",
    searchUrl: (domain) => `https://whois.domaintools.com/${encodeURIComponent(domain)}`,
  },
  {
    name: "NS Lookup",
    host: "nslookup.io",
    description: "DNS record lookup",
    searchUrl: (domain) => `https://www.nslookup.io/domains/${encodeURIComponent(domain)}/`,
  },
  {
    name: "DNS Checker",
    host: "dnschecker.org",
    description: "Global DNS propagation check",
    searchUrl: (domain) => `https://dnschecker.org/#A/${encodeURIComponent(domain)}`,
  },
  {
    name: "Censys",
    host: "search.censys.io",
    description: "Hosts and certificates for a domain",
    searchUrl: (domain) =>
      `https://search.censys.io/search?resource=hosts&q=${encodeURIComponent(domain)}`,
  },
  {
    name: "Page Speed Insights",
    host: "pagespeed.web.dev",
    homepage: "https://developers.google.com/speed/pagespeed/insights/",
    description: "Performance, accessibility, and SEO",
    searchUrl: (domain) =>
      `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(httpsSite(domain))}`,
  },
  {
    name: "Built With",
    host: "builtwith.com",
    description: "Technology stack detection",
    searchUrl: (domain) => `https://builtwith.com/${encodeURIComponent(domain)}`,
  },
  {
    name: "BGP Tools",
    host: "bgp.tools",
    description: "BGP routing and DNS data",
    searchUrl: (domain) => `https://bgp.tools/domain/${encodeURIComponent(domain)}`,
  },
  {
    name: "Similar Web",
    host: "similarweb.com",
    description: "Traffic and engagement estimates",
    searchUrl: (domain) => `https://www.similarweb.com/website/${encodeURIComponent(domain)}/`,
  },
  {
    name: "Blacklist Checker",
    host: "blacklistchecker.com",
    homepage: "https://blacklistchecker.com/",
    description: "Email and domain blacklist status",
    // blacklistchecker.com has no public deep-link; MXToolbox accepts the domain in the URL.
    searchUrl: (domain) =>
      `https://mxtoolbox.com/SuperTool.aspx?action=blacklist%3a${encodeURIComponent(domain)}&run=toolpage`,
  },
  {
    name: "Cloudflare Radar",
    host: "radar.cloudflare.com",
    description: "Domain traffic and security insights",
    searchUrl: (domain) =>
      `https://radar.cloudflare.com/domains/domain/${encodeURIComponent(domain)}`,
  },
];

export function externalToolHomepage(tool: ExternalTool) {
  return tool.homepage ?? `https://${tool.host}`;
}
