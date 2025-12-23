# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

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

### Vulnerability Assessment (as of 2025-12-23)
- **Critical**: 0 ✅
- **High**: 0 ✅  
- **Moderate**: 0 ✅
- **Low**: 5 (development dependencies only)

### Overall Security Rating: 7.5/10
**Status**: GOOD - Strong foundational security with room for enhancement

## Security Architecture

### Authentication & Authorization ✅
- **OAuth 2.0 with PKCE flow** via Auth0 integration
- **JWT token verification** with JWKS (JSON Web Key Set)
- **AES-256-GCM encryption** for sensitive session data
- **HTTP-only cookies** with secure flags
- **CSRF protection** for authentication flows
- **Role-based access control** for admin features

### Content Security Policy (CSP) ✅
- **Comprehensive CSP headers** with nonce-based script execution
- **CSP violation reporting** endpoint at `/api/csp-report`
- **Iframe embedding support** for museum integrations
- **Environment-specific policies** (dev vs production)
- **Frame-ancestors** properly configured for trusted domains

### Security Headers ✅
- **Strict-Transport-Security**: HTTPS enforcement in production
- **X-Content-Type-Options**: nosniff
- **X-Frame-Options**: SAMEORIGIN  
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Camera, microphone, geolocation controls
- **Cache-Control**: Proper caching policies with security considerations

### Database Security ✅
- **Parameterized queries** via Drizzle ORM (SQL injection protection)
- **Environment-based configuration** for connection strings
- **PostGIS integration** with geographic data validation
- **Input validation** using Yup schemas
- **Baltic Sea boundary validation** for geographic data integrity

### Development Security ✅
- **HTTPS development server** with auto-generated certificates
- **Environment variable management** with `.env.example` template
- **Pre-commit hooks** for code quality and security checks
- **TypeScript strict mode** for type safety

## Known Vulnerabilities & Mitigations

### Current Low-Risk Issues (Development Only)
#### 1. tmp <= 0.2.3 (Low Severity)
- **Affected**: commitizen/cz-conventional-changelog development tools
- **Risk Level**: Low - Development environment only
- **Impact**: No production exposure, safe development environment
- **Mitigation**: Isolated to commit tooling, no user input to tmp functions
- **Tracking**: Monitoring for commitizen upstream fix

#### 2. Development Dependency Chain (5 related vulnerabilities)
- **Affected**: commitizen → inquirer → external-editor → tmp
- **Risk Level**: Low - Build/development tools only
- **Impact**: No runtime or production impact
- **Mitigation**: Tools run in secure development environment
- **Resolution Path**: Will resolve with major commitizen update when available

## Security Measures in Production

### Automated Security ✅
1. **Dependabot**: Weekly automated dependency updates
2. **GitHub Actions**: Security checks on every PR
3. **npm audit**: Moderate+ vulnerability scanning
4. **License compliance**: FOSS compliance with SBOM generation
5. **CSP violation monitoring**: Real-time policy violation detection

### Application Security ✅
- **Input validation**: Comprehensive form validation with Yup schemas  
- **Output encoding**: Proper HTML entity encoding
- **File upload security**: EXIF metadata validation, file type restrictions
- **Geographic validation**: Baltic Sea boundary checking
- **Rate limiting**: API endpoint protection (basic implementation)
- **Error handling**: Sanitized error messages, no sensitive data leakage

### Infrastructure Security ✅
- **HTTPS everywhere**: TLS 1.2+ enforcement
- **Security headers**: Multi-layered header protection
- **Environment isolation**: Separate dev/staging/production environments
- **Secret management**: Environment variables for all sensitive data
- **Database access**: Restricted connection parameters

## Dependency Management

### Security-First Approach
We maintain a proactive approach to dependency security:

1. **Automated Updates**: Dependabot reviews and updates dependencies weekly
2. **Override Policy**: Critical security fixes via npm overrides when needed
3. **License Compliance**: Automatic rejection of copyleft licenses in CI
4. **Vulnerability Monitoring**: Daily security advisory monitoring

### Current Overrides (Security-Related)
```json
{
  "overrides": {
    "cookie": "^0.7.2",    // Fixed moderate XSS vulnerability
    "esbuild": "^0.25.0"   // Fixed path traversal vulnerability  
  }
}
```

### Production Dependencies Security Status
- **Total production dependencies**: 22 packages
- **Security-clean dependencies**: 100%
- **License-compliant dependencies**: 100% (MIT, Apache-2.0, ISC, BSD)
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

### Immediate Priorities (High Impact)
- [ ] **CodeQL Integration**: Advanced SAST scanning in GitHub workflows
- [ ] **Input Sanitization**: DOMPurify integration for HTML content
- [ ] **Security Headers**: Add missing Cross-Origin policies

### Medium-Term Goals (Weeks)
- [ ] **Security Monitoring**: Implement security event logging and alerting
- [ ] **Malware Scanning**: Integrate malware scanning for file uploads
- [ ] **Audit Logging**: Comprehensive user action tracking

### Long-Term Enhancements (Months)
- [ ] **WAF Integration**: Web Application Firewall rules
- [ ] **Security Testing**: Automated penetration testing
- [ ] **Compliance**: GDPR compliance audit and documentation
- [ ] **Incident Response**: Formal security incident response procedures

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
- **Supply Chain Security**: Dependency provenance and integrity verification
- **Vulnerability Disclosure**: Coordinated disclosure following security.txt
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

*Last Updated: 2025-12-23*
*Security Assessment: 8.0/10 - Strong foundational security with recent enhancements*
*Next Security Review: 2026-03-23*