function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface MockReport {
  loaded: number;
  total: number;
  elapsed: string;
  issues: number;
  geo: { city: string; country: string; tz: string };
  ip: string;
  ns: string[];
  aRecords: string[];
  aaaa: string[];
}

export function buildMockReport(domain: string): MockReport {
  const h = hash(domain);
  const ip = `${(h % 200) + 20}.${(h >> 3) % 256}.${(h >> 6) % 256}.${(h >> 9) % 256}`;
  const cities = ["Mountain View, CA", "Ashburn, VA", "Dublin, IE", "Frankfurt, DE", "Tokyo, JP"];
  const countries = ["United States", "Ireland", "Germany", "Japan", "United Kingdom"];
  return {
    loaded: 33,
    total: 37,
    elapsed: "4.2",
    issues: 3,
    geo: {
      city: cities[h % cities.length],
      country: countries[h % countries.length],
      tz: "America/Los_Angeles",
    },
    ip,
    ns: [`ns1.${domain}`, `ns2.${domain}`, `ns3.${domain}`, `ns4.${domain}`],
    aRecords: [ip, `142.250.${h % 256}.113`, `142.250.${(h >> 1) % 256}.138`],
    aaaa: [
      `2a00:1450:4009:c04::${(h % 200).toString(16)}b`,
      `2a00:1450:4009:c04::${(h % 99).toString(16)}1`,
    ],
  };
}
