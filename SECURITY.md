# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.14.x  | :white_check_mark: |
| < 1.14  | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities to the maintainers via:
1. GitHub Security Advisory (preferred)
2. Private issue with security label
3. Direct contact to maintainers

We aim to respond within 48 hours and provide fixes within 7 days for critical issues.

## Known Vulnerabilities & Mitigation

### Current Status (as of 2025-08-18)
- **Critical**: 0 ✅
- **High**: 0 ✅
- **Moderate**: 0 ✅
- **Low**: 5 (development tools only)

### Resolved Vulnerabilities

#### 1. cookie < 0.7.0 (Moderate)
- **Affected**: SvelteKit dependency
- **Resolution**: Override to cookie@^0.7.2 in package.json
- **Risk**: Low - only affects development server

#### 2. esbuild <= 0.24.2 (Moderate)  
- **Affected**: drizzle-kit dependency
- **Resolution**: Override to esbuild@^0.25.0 in package.json
- **Risk**: Low - development tool only

#### 3. libxmljs2 <= 0.35.0 (Critical)
- **Affected**: SBOM generation tool
- **Resolution**: Fixed via npm audit fix
- **Risk**: None - patched

### Accepted Risks (Low Severity)

#### 1. tmp <= 0.2.3 (Low)
- **Affected**: commitizen/cz-conventional-changelog
- **Severity**: Low
- **Context**: Development tool only, not in production
- **Mitigation**: No user input to tmp, safe development environment
- **Tracking**: Will update when commitizen releases fix

## Security Measures

### Automated Security
1. **Dependabot**: Automated dependency updates
2. **npm audit**: Run on every PR via GitHub Actions
3. **License compliance**: FOSS compliance checks
4. **SBOM generation**: Software Bill of Materials for transparency

### Best Practices
- All secrets in environment variables
- No hardcoded credentials
- Input validation on all user inputs
- HTTPS enforced in production
- CSP headers configured
- Regular security audits

## Dependency Management

### Override Policy
We use npm overrides for critical security fixes when:
1. Direct dependency hasn't updated yet
2. Risk is moderate or higher
3. Override doesn't break functionality

### Current Overrides
```json
{
  "overrides": {
    "cookie": "^0.7.2",
    "esbuild": "^0.25.0"
  }
}
```

## Security Checklist for Contributors

- [ ] Run `npm audit` before committing
- [ ] No secrets in code (use .env files)
- [ ] Validate all user inputs
- [ ] Use parameterized queries for database
- [ ] Follow OWASP guidelines
- [ ] Test for XSS vulnerabilities
- [ ] Check for SQL injection points

## Contact

For security concerns, contact the maintainers through GitHub Security Advisory feature.