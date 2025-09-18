# Software Bill of Materials (SBOM)

This directory contains generated Software Bill of Materials (SBOM) files for the Ostsee-Tiere project.

## What is an SBOM?

A Software Bill of Materials (SBOM) is a comprehensive inventory of all software components, dependencies, and their metadata in a software application. It provides transparency about what's included in the software supply chain.

## Generated Files

- `sbom.json` - Complete SBOM in CycloneDX JSON format (includes dev dependencies)
- `sbom.xml` - Complete SBOM in CycloneDX XML format (includes dev dependencies)
- `sbom-prod.json` - Production-only SBOM (excludes dev and optional dependencies)

## Generating SBOMs

### Generate all SBOM formats:
```bash
npm run sbom:generate
```

### Generate specific formats:
```bash
# JSON format with all dependencies
npm run sbom:json

# XML format with all dependencies
npm run sbom:xml

# Production dependencies only
npm run sbom:prod
```

### Check for vulnerabilities in SBOM:
```bash
npm run sbom:check
```

## SBOM Standards

This project uses the [CycloneDX](https://cyclonedx.org/) standard for SBOM generation, which is:
- OWASP supported
- Machine-readable
- Interoperable with vulnerability databases
- Compliant with industry standards (NTIA minimum elements)

## Use Cases

1. **Security Auditing**: Identify vulnerable components in the dependency tree
2. **License Compliance**: Track all licenses used in dependencies
3. **Supply Chain Transparency**: Provide visibility into the software supply chain
4. **Regulatory Compliance**: Meet requirements for software transparency (EU CRA, US EO 14028)
5. **Vulnerability Management**: Enable automated vulnerability scanning tools

## Integration with CI/CD

The SBOM generation is integrated into the CI/CD pipeline:
- Automatically generated on each release
- Attached to GitHub releases as artifacts
- Available for security scanning tools

## Consuming the SBOM

The generated SBOM files can be:
- Imported into vulnerability scanning tools (Grype, Trivy, etc.)
- Uploaded to dependency tracking systems (OWASP Dependency-Track, etc.)
- Shared with customers/partners for supply chain transparency
- Used for automated license compliance checks

## Tools for SBOM Analysis

Recommended tools for analyzing the generated SBOMs:

### Vulnerability Scanning:
```bash
# Using Grype
grype sbom:./sbom/sbom.json

# Using Trivy
trivy sbom ./sbom/sbom.json
```

### Visualization:
- [CycloneDX Viewer](https://cyclonedx.github.io/cyclonedx-viewer/)
- Upload the JSON or XML file for interactive visualization

### Validation:
```bash
# Validate SBOM format
npx @cyclonedx/cyclonedx-cli validate --input-file sbom/sbom.json
```

## Automation

SBOMs are automatically generated:
- On every release via GitHub Actions
- Can be triggered manually via `npm run sbom:generate`
- Validated for format compliance before storage

## Best Practices

1. **Regular Generation**: Generate SBOMs with every release
2. **Version Control**: Track SBOM changes over time (stored as release artifacts)
3. **Vulnerability Monitoring**: Regularly scan SBOMs for new vulnerabilities
4. **Distribution**: Share SBOMs with stakeholders who need supply chain visibility
5. **Validation**: Always validate SBOMs before distribution

## Additional Resources

- [CycloneDX Specification](https://cyclonedx.org/specification/overview/)
- [NTIA SBOM Minimum Elements](https://www.ntia.doc.gov/files/ntia/publications/sbom_minimum_elements_report.pdf)
- [SBOM Tool Ecosystem](https://cyclonedx.org/tool-center/)