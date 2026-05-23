<p align="center">
  <img src="./docs/images/banner.svg" alt="Web Intel — X-Ray vision for your website" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/km-fazle/web-intel/blob/main/LICENSE"><img src="https://img.shields.io/github/license/km-fazle/web-intel?style=flat-square&color=b8f24a&labelColor=121a12" alt="License" /></a>
  <a href="https://github.com/km-fazle/web-intel"><img src="https://img.shields.io/github/stars/km-fazle/web-intel?style=flat-square&color=b8f24a&labelColor=121a12" alt="Stars" /></a>
  <img src="https://img.shields.io/badge/TanStack%20Start-1.16-61dafb?style=flat-square&labelColor=121a12" alt="TanStack Start" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&labelColor=121a12" alt="React" />
</p>

<p align="center">
  <strong>Web Intel</strong> is an open-source OSINT dashboard for analyzing any website.<br />
  See what attackers already know — DNS, SSL, headers, cookies, security posture, and more — in seconds.
</p>

<p align="center">
  <a href="https://github.com/km-fazle/web-intel#quick-start">Quick start</a>
  ·
  <a href="https://github.com/km-fazle/web-intel#features">Features</a>
  ·
  <a href="https://github.com/km-fazle/web-intel#deploy">Deploy</a>
  ·
  <a href="https://github.com/km-fazle/web-intel/blob/main/CONTRIBUTING.md">Contributing</a>
</p>

---

## Preview

<p align="center">
  <img src="./docs/images/preview.svg" alt="Web Intel dashboard preview" width="920" />
</p>

> Replace `docs/images/preview.svg` with a real screenshot (`preview.png`) after your first deploy for the best README look.

---

## Features

| Category | Checks |
| -------- | ------ |
| **Network** | DNS (A, AAAA, MX, TXT, NS, CAA, SOA), DNSSEC, server IP & geolocation |
| **TLS** | Certificate subject, issuer, validity, days remaining |
| **HTTP** | Status, redirects, headers, cookies, response time |
| **Security** | CSP, HSTS, X-Frame-Options, Referrer-Policy, `security.txt` |
| **Email** | SPF, DMARC, BIMI |
| **Content** | Social meta tags, linked pages, robots.txt / crawl rules |
| **Intel** | Wayback archive, carbon estimate, WAF hints, domain WHOIS (RDAP) |
| **Research** | 17+ external tool deep-links (VirusTotal, Shodan, SSL Labs, etc.) |

Built with [TanStack Start](https://tanstack.com/start), [TanStack Router](https://tanstack.com/router), and [TanStack Query](https://tanstack.com/query). No API keys required for core checks.

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm (or pnpm / bun)

### Local development

```bash
git clone https://github.com/km-fazle/web-intel.git
cd web-intel
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), enter a domain (e.g. `example.com`), and view the report.

### Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

---

## Deploy

Web Intel supports two hosting targets:

### Vercel (recommended for quick launch)

Vercel sets `VERCEL=1` during build, which enables the [Nitro](https://nitro.build/) Vercel preset automatically.

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Framework preset: **TanStack Start** (auto-detected).
4. Build command: `npm run build` — do not override `outputDirectory`.

### Cloudflare Workers

Uses `@cloudflare/vite-plugin` and Wrangler when **not** building on Vercel.

```bash
npm run build
npx wrangler deploy
```

Configure `wrangler.jsonc` and `src/server.ts` as needed for your account.

---

## Project structure

```
web-intel/
├── public/              # Static assets (favicon)
├── docs/images/         # README banner & preview art
├── src/
│   ├── routes/          # File-based routes (/, /check/:domain)
│   ├── lib/web-check/   # Server functions & OSINT logic
│   └── components/      # UI (logo, footer, panels)
├── vite.config.ts       # Vercel vs Cloudflare plugin switch
└── wrangler.jsonc       # Cloudflare Workers config
```

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and PR guidelines.

---

## License

[MIT](./LICENSE) © [kmfazle](https://kmfazle.dev)

---

<p align="center">
  built by <a href="https://kmfazle.dev">kmfazle</a>
  ·
  <a href="https://github.com/km-fazle/web-intel">GitHub</a>
</p>
