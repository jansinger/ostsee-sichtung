# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.5.x   | :white_check_mark: |
| < 2.5   | :x:                |

Only the latest minor line receives fixes. Releases are cut by release-please; see
[docs/RELEASE_PIPELINE.md](docs/RELEASE_PIPELINE.md) for how a fix reaches staging and production.

## Reporting a Vulnerability

Please report security vulnerabilities to the maintainers via:

1. **GitHub Security Advisory** (preferred) - Use the "Security" tab in this repository
2. **Private issue** with security label for non-critical issues
3. **Direct contact** to maintainers for urgent matters

**Response Commitments:**

- **Initial Response**: Within 48 hours
- **Critical Issues**: Patches within 7 days
- **High/Medium Issues**: Patches within 14 days
- **Security Updates**: Regular communication on progress

## Current Security Status

### Vulnerability Assessment (as of 2026-07-30)

| Source                              | Result                                              |
| ----------------------------------- | --------------------------------------------------- |
| `npm audit --omit=dev` (production) | **0** — critical 0, high 0, moderate 0, low 0       |
| `npm audit` (incl. devDependencies) | 19 findings: 0 critical, 14 high, 5 moderate, 0 low |
| Dependabot open alerts              | 2 (both `esbuild`, both scope `development`)        |

The two counts differ because `npm audit` counts every dependency path separately, while
Dependabot deduplicates per advisory. **Both agree that nothing reachable at runtime is
affected** — every finding sits in build, commit or license tooling.

### Overall Security Rating: 8/10

**Status**: The production dependency tree is clean. All open findings are in dev-only tooling
(`commitizen`, `license-checker`, `@cyclonedx/cyclonedx-npm`, `drizzle-kit`), none of which ships
in the Docker image — the builder runs `npm prune --omit=dev` before the runtime layer is
assembled.

## Security Architecture

### Authentication & Authorization ✅

- **OAuth 2.0 with PKCE flow** via Auth0 integration
- **JWT token verification** with JWKS (JSON Web Key Set)
- **AES-256-GCM encryption** for sensitive session data
- **HTTP-only cookies** with secure flags
- **CSRF protection** for authentication flows
- **Role-based access control** for admin features

### Content Security Policy (CSP) ⚠️

Configured in `svelte.config.js` (`kit.csp`, `mode: 'auto'`) — not in a hook.

- **`script-src` contains `'unsafe-inline'`** and there is deliberately **no nonce**. The Scalar
  API documentation at `/docs/api/scalar` injects inline scripts, and `'unsafe-inline'` and a
  nonce are mutually exclusive for `script-src`. This is the weakest part of the policy: XSS
  protection here rests on output encoding and `sanitizeHtml()`, not on CSP. Removing
  `'unsafe-inline'` requires replacing or self-hosting the Scalar bundle.
- **`style-src`** also allows `'unsafe-inline'` (Svelte scoped styles) plus `openlayers.org`.
- **`'unsafe-eval'`** is added in development only; `'wasm-unsafe-eval'` is needed by OpenLayers.
- **Violation reporting is narrower than it looks.** `report-uri: /api/csp-report` sits in
  `kit.csp.reportOnly`, not in the enforced `directives`, and that Report-Only policy declares
  only `frame-ancestors`. So the endpoint receives framing attempts from unlisted ancestors —
  and nothing else. A `script-src` or `connect-src` violation of the **enforced** policy is
  blocked but **never reported**. Wiring `report-uri` into `directives` as well is on the roadmap.
- **`frame-ancestors`** restricted to `'self'` and the Meeresmuseum domains — this is what makes
  the museum iframe embedding possible without `X-Frame-Options: DENY`.
- **Allowlists** for tiles (OSM, OpenSeaMap) and Vercel Blob in `img-src`/`connect-src`.

### Security Headers ✅

Set in `src/lib/server/middleware/securityHeaders.ts`:

- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains` — only on HTTPS requests
- **X-Content-Type-Options**: `nosniff`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: `camera=(), microphone=(), geolocation=*` (geolocation is required by
  the reporting form)
- **X-Permitted-Cross-Domain-Policies**: `none`
- **Cross-Origin-Opener-Policy**: `same-origin-allow-popups` (iframe-compatible)
- **Cross-Origin-Resource-Policy**: `cross-origin` (allows museum iframe embedding)

**Accepted trade-off:** the session cookie is set with `sameSite: 'none'` (plus `Secure`, which
browsers require in that combination) in `src/lib/server/auth/auth.ts:270`, because the app is
embedded as an iframe on meeresmuseum.de and a `Lax` cookie would not be sent there. CSRF
protection therefore cannot rely on `SameSite`; it rests on the OAuth `state` parameter for the
login flow and SvelteKit's default origin check (`csrf.checkOrigin`) for form actions.

In development the middleware additionally sends permissive CORS headers
(`Access-Control-Allow-Origin: *`); this branch is gated on `NODE_ENV === 'development'`.

### Database Security ✅

- **Parameterized queries** via Drizzle ORM (SQL injection protection)
- **Environment-based configuration** for connection strings
- **PostGIS integration** with geographic data validation
- **Input validation** using Yup schemas
- **Baltic Sea boundary validation** for geographic data integrity

### Development Security ✅

- **HTTPS development server** with certificates generated by mkcert (`npm run certs:setup`)
- **Environment variable management** with `.env.example` template
- **Pre-commit hooks**: `npm run lint && npm run type-check` (code quality — the hook does not run
  a security scan; `npm audit` runs in CI)
- **TypeScript strict mode** for type safety

## Known Vulnerabilities & Mitigations

### Current Issues (verified 2026-07-30)

All 19 `npm audit` findings trace back to **four advisories**. `npm audit` counts every
dependency path separately, which is why four advisories produce nineteen lines. None of the
affected packages is a production dependency, so none is present in the runtime image.

#### 1. brace-expansion <= 5.0.7 (High Severity)

- **Advisory**: [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) — DoS via
  unbounded expansion length causing an out-of-memory crash
- **Reached through**: `minimatch` → `glob`, i.e. `commitizen` / `cz-conventional-changelog`,
  `eslint`, `license-checker` (→ `read-installed` → `read-package-json`) and
  `@cyclonedx/cyclonedx-npm` (→ `libxmljs2` → `node-gyp` → `make-fetch-happen` → `cacache`).
  This single advisory accounts for most of the reported high-severity lines.
- **Impact**: No production exposure. The inputs are our own glob patterns, not attacker data.
- **Resolution Path**: Waiting on the tooling to pick up a patched `minimatch`/`glob`; a
  `brace-expansion` override would have to be validated against all four chains first.

#### 2. esbuild <= 0.24.2 (Moderate Severity)

- **Advisory**: [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — the dev
  server accepts cross-origin requests and returns the response
- **Reached through**: `drizzle-kit` → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils`.
  That chain pins its own older esbuild and is not covered by any current override.
- **Impact**: No production exposure. Affects only an esbuild dev server, which this project never
  starts — Vite serves development.
- **Resolution Path**: Awaiting a `drizzle-kit` release that drops the archived `@esbuild-kit`
  packages.

#### 3. esbuild >= 0.27.3 < 0.28.1 (Low Severity)

- **Advisory**: [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) —
  arbitrary file read when running the dev server **on Windows**
- **Reached through**: the esbuild used by the Vite toolchain
- **Impact**: No production exposure, and no exposure at all outside Windows. CI runs on
  `ubuntu-latest`. Contributors developing on Windows should keep esbuild current.

#### 4. tar <= 7.5.20 (Moderate Severity)

- **Advisory**: [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) —
  uncatchable stack-overflow DoS via a crafted long-path archive
- **Reached through**: `@cyclonedx/cyclonedx-npm` (SBOM generation)
- **Impact**: No production exposure. Only ever unpacks archives from our own registry install.

### Resolved since the previous assessment

The findings documented in the 2026-04-14 assessment — `lodash` prototype pollution
(GHSA-xxjr-mmjv-4gpg), `yaml` stack overflow (GHSA-48c2-rrv3-qjmp), `tmp` symlink handling
(GHSA-52f5-9888-hmc6) and the earlier `brace-expansion` advisory GHSA-f886-m6hf-6m8v — no longer
appear in `npm audit`. They were closed by routine Dependabot updates, not by a targeted fix.

## Security Measures in Production

### Automated Security ✅

1. **Dependabot**: Weekly dependency updates (Mondays 09:00 Europe/Berlin), grouped by production
   / dev-tooling / framework, plus Dependabot security alerts
2. **CodeQL**: GitHub default setup, `default` query suite with the `remote` threat model, for
   `javascript-typescript` and `actions`. Runs on pull requests and weekly.
3. **Trivy**: container image scan (CRITICAL/HIGH) on every published image, with the SARIF result
   uploaded to the repository's Security tab — `.github/workflows/docker-publish.yml`
4. **npm audit**: `npm audit --audit-level=high` in the CI `test` job.
   **Note:** the step is `continue-on-error: true`, so it reports but does not block a merge.
5. **License compliance**: `license-checker` plus the `license:audit` allowlist — only on pull
   requests that change dependencies, see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)
6. **SBOM**: CycloneDX SBOM generated during the Docker build and shipped inside the image
   (`npm run sbom:prod`); `npm run sbom:check` audits it
7. **CSP violation monitoring**: `/api/csp-report` receives reports from the **Report-Only**
   policy only, which declares just `frame-ancestors` — i.e. framing attempts. The enforced policy
   has no `report-uri`, so its violations are blocked silently. See the CSP section above.

### Application Security ✅

- **Input validation**: Comprehensive form validation with Yup schemas
- **Output encoding**: HTML sanitized through `sanitizeHtml()` (`sanitize-html`, allowlist of
  inline tags) in `src/lib/utils/sanitize.ts`
- **File upload security**: magic-bytes verification against the declared MIME type, EXIF metadata
  extraction, directory-traversal checks
- **Geographic validation**: Baltic Sea boundary checking
- **Spam detection**: heuristic scoring of submitted sightings in
  `src/lib/server/spam/spamDetector.ts`
- **Audit logging**: sighting, file, config, auth and export actions persisted to the `audit_logs`
  table via `src/lib/server/audit/auditService.ts` (write failures are logged, never propagated)
- **Rate limiting**: per-endpoint limits in `src/lib/server/middleware/rateLimit.ts`.
  **Limitation:** the counters live in a per-process `Map`, so the effective limit multiplies with
  the number of application instances. Adequate for the single-container deployment, not a
  distributed limiter.
- **Error handling**: Sanitized error messages, no sensitive data leakage

### Infrastructure Security ✅

- **HTTPS everywhere**: enforced towards the client via HSTS. TLS termination and the accepted
  protocol versions are the reverse proxy's / platform's responsibility, not the application's —
  see [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)
- **Security headers**: Multi-layered header protection
- **Environment isolation**: Separate dev/staging/production environments
- **Secret management**: Environment variables for all sensitive data
- **Database access**: Restricted connection parameters

## Dependency Management

### Security-First Approach

We maintain a proactive approach to dependency security:

1. **Automated Updates**: Dependabot opens grouped update PRs weekly
2. **Override Policy**: Critical security fixes via npm overrides when needed
3. **License Compliance**: the CI `Compliance Check` job rejects GPL/AGPL and any license outside
   the `license:audit` allowlist — but only on PRs that change dependencies
4. **Vulnerability Monitoring**: Dependabot security alerts (continuous) plus the CodeQL and Trivy
   results in the repository Security tab

### Current Overrides (Security-Related)

```jsonc
{
	"overrides": {
		"cookie": "^0.7.2", // Fixed moderate XSS vulnerability
		"axios": "^1.16.1" // Fixed CSRF vulnerability
	}
}
```

Both are transitive-only: neither `cookie` nor `axios` is a direct dependency.

### Production Dependencies Security Status

- **Total production dependencies**: 16 packages
- **Security-clean dependencies**: 100%
- **License-compliant dependencies**: 100% (permissive, non-copyleft licenses only; see THIRD-PARTY-NOTICES.md for the full list)
- **No transitive vulnerabilities**: Verified clean dependency tree

## Security Roadmap

### Recently Implemented ✅

The following security features have been implemented:

- [x] **Rate Limiting**: API endpoint protection with configurable limits
  - File Upload: 20 uploads/hour (anonymous), 50 uploads/hour (authenticated)
  - Media Access: 30 requests/minute (anonymous), 100 requests/minute (authenticated)
  - Sighting Submission: 20 sightings/hour
  - Implementation: `src/lib/server/middleware/rateLimit.ts`

- [x] **File Upload Hardening**: Magic bytes validation and MIME-type verification
  - Validates file content against declared MIME type
  - Supports images (JPEG, PNG, GIF, WebP, BMP) and videos (MP4, AVI, MOV, WebM, MKV)
  - Detects and blocks dangerous file types (executables, scripts)
  - Implementation: `src/lib/server/validation/magicBytes.ts`

- [x] **Directory Traversal Protection**: Path normalization and validation
  - Blocks `../` sequences and absolute paths
  - Logs blocked attempts for security monitoring
  - Implementation: `src/lib/server/uploads.ts`

- [x] **Lazy Database Initialization**: CI/CD security compatibility
  - Proxy pattern for deferred database connections
  - Enables E2E tests without database access
  - Race condition protection implemented
  - Implementation: `src/lib/server/db/index.ts`

### Immediate Priorities (High Impact) ✅

- [x] **CodeQL Integration**: SAST scanning via GitHub default setup (`default` suite, `remote`
      threat model, weekly + on pull requests)
- [x] **Input Sanitization**: `sanitize-html` with a tag allowlist in `src/lib/utils/sanitize.ts`
      (works on server and client, no jsdom required)
- [x] **Security Headers**: Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy (`src/lib/server/middleware/securityHeaders.ts`)
- [x] **Audit Logging**: sighting, file, config, auth and export actions written to `audit_logs`
      (`src/lib/server/audit/auditService.ts`)
- [x] **Container Scanning**: Trivy on every published image, SARIF into the Security tab

### Medium-Term Goals (Weeks)

- [ ] **Alerting**: security events are logged (rate-limit hits, blocked traversal attempts,
      failed logins) but nothing alerts on them — no threshold, no notification channel
- [ ] **Audit Log Retention**: no retention or rotation policy for `audit_logs` yet
- [ ] **Malware Scanning**: Integrate malware scanning for file uploads
- [ ] **CSP Hardening**: remove `'unsafe-inline'` from `script-src`, which requires replacing or
      self-hosting the Scalar API documentation bundle
- [ ] **CSP Reporting Coverage**: add `report-uri` to the enforced `directives` in
      `svelte.config.js` — today only the Report-Only `frame-ancestors` policy reports

### Long-Term Enhancements (Months)

- [ ] **Distributed Rate Limiting**: replace the in-process `Map` if the app is ever scaled out
- [ ] **WAF Integration**: Web Application Firewall rules
- [ ] **Security Testing**: Automated penetration testing
- [ ] **Compliance**: GDPR compliance audit and documentation
- [ ] **Incident Response**: Formal security incident response procedures
- [ ] **security.txt**: publish `/.well-known/security.txt` (referenced under Open Source
      Security below, but not currently served)

## Security Best Practices for Contributors

### Code Security Checklist

- [ ] **Run security audit**: `npm audit --audit-level=moderate` before committing
- [ ] **No hardcoded secrets**: All sensitive data in environment variables
- [ ] **Input validation**: Validate and sanitize all user inputs
- [ ] **Parameterized queries**: Use Drizzle ORM, avoid raw SQL where possible
- [ ] **Output encoding**: Properly encode all dynamic content
- [ ] **Error handling**: Never expose internal details in error messages
- [ ] **Authentication checks**: Verify user permissions for protected operations
- [ ] **HTTPS enforcement**: All external requests over secure connections

### Database Security Guidelines

- [ ] **Use Drizzle ORM**: Parameterized queries prevent SQL injection
- [ ] **Validate geography**: Check Baltic Sea boundaries for coordinates
- [ ] **Sanitize uploads**: Validate file types and extract safe metadata
- [ ] **Environment variables**: Database credentials never in source code
- [ ] **Connection limits**: Appropriate database connection pooling

### Frontend Security Guidelines

- [ ] **CSP compliance**: Ensure no inline scripts violate Content Security Policy
- [ ] **XSS prevention**: Properly escape all dynamic content
- [ ] **CSRF protection**: Verify authenticity tokens for state changes
- [ ] **Secure storage**: Use secure HTTP-only cookies for session data
- [ ] **Input validation**: Client-side validation for UX, server-side for security

## Compliance & Standards

### Industry Standards Alignment

- **OWASP Top 10**: Mitigation strategies for all current top vulnerabilities
- **NIST Cybersecurity Framework**: Identify, Protect, Detect, Respond, Recover
- **ISO 27001 Principles**: Information security management best practices
- **GDPR**: Privacy by design, data minimization, user rights

### Open Source Security

- **FOSS License Compliance**: 100% license-compatible dependencies
- **Supply Chain Security**: `npm ci` against the committed lockfile; a CycloneDX SBOM is built
  into the image and auditable with `npm run sbom:check`
- **Vulnerability Disclosure**: coordinated disclosure through the GitHub Security tab. There is
  **no `/.well-known/security.txt`** yet — see the roadmap.
- **Community Security**: Open security discussions and collaborative improvements

## Emergency Contacts

**For Critical Security Issues:**

- **GitHub Security Advisory**: Use repository "Security" tab
- **Email**: [Maintainer contact through GitHub profile]
- **Response Time**: Critical issues acknowledged within 4 hours

**Security Incident Response:**

1. **Immediate**: Issue acknowledgment and initial assessment
2. **Within 24h**: Impact analysis and temporary mitigations
3. **Within 72h**: Permanent fix development and testing
4. **Within 7 days**: Security patch release and disclosure

---

_Last Updated: 2026-07-30_
_Security Assessment: 8/10 — production dependency tree fully clean (0 production
vulnerabilities); the `'unsafe-inline'` in `script-src` is the main open weakness_
_Next Security Review: 2026-10-30_
