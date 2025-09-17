#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

/**
 * Check SBOM for vulnerabilities using npm audit and basic validation
 */
async function checkSBOMVulnerabilities() {
	console.log('🔍 Checking SBOM for vulnerabilities...\n');

	try {
		// Check if SBOM exists
		const sbomPath = join(projectRoot, 'sbom/sbom.json');
		let sbom;

		try {
			const sbomContent = readFileSync(sbomPath, 'utf8');
			sbom = JSON.parse(sbomContent);
			console.log('✅ SBOM found and valid JSON');
		} catch (error) {
			console.error('❌ SBOM not found or invalid. Run "npm run sbom:generate" first.');
			process.exit(1);
		}

		// Basic SBOM validation
		if (!sbom.bomFormat || sbom.bomFormat !== 'CycloneDX') {
			console.error('❌ Invalid SBOM format. Expected CycloneDX.');
			process.exit(1);
		}

		console.log(`📋 SBOM Version: ${sbom.specVersion}`);
		console.log(`📦 Components: ${sbom.components?.length || 0}`);
		console.log(`🏷️  Metadata: ${sbom.metadata?.component?.name || 'Unknown'} v${sbom.metadata?.component?.version || 'Unknown'}\n`);

		// Check for high-risk licenses
		const riskyLicenses = ['GPL', 'AGPL', 'LGPL', 'SSPL'];
		const componentsWithRiskyLicenses = [];

		if (sbom.components) {
			for (const component of sbom.components) {
				if (component.licenses) {
					for (const license of component.licenses) {
						const licenseId = license.license?.id || license.license?.name || '';
						if (riskyLicenses.some(risky => licenseId.includes(risky))) {
							componentsWithRiskyLicenses.push({
								name: component.name,
								version: component.version,
								license: licenseId
							});
						}
					}
				}
			}
		}

		if (componentsWithRiskyLicenses.length > 0) {
			console.log('⚠️  Components with potentially risky licenses:');
			componentsWithRiskyLicenses.forEach(comp => {
				console.log(`   - ${comp.name}@${comp.version} (${comp.license})`);
			});
			console.log('');
		}

		// Run npm audit for vulnerability check
		console.log('🔐 Running npm audit...\n');
		try {
			const auditResult = execSync('npm audit --json', {
				cwd: projectRoot,
				encoding: 'utf8',
				stdio: ['pipe', 'pipe', 'ignore']
			});

			const audit = JSON.parse(auditResult);

			if (audit.metadata) {
				const { vulnerabilities } = audit.metadata;
				console.log('📊 Vulnerability Summary:');
				console.log(`   Critical: ${vulnerabilities.critical || 0}`);
				console.log(`   High:     ${vulnerabilities.high || 0}`);
				console.log(`   Moderate: ${vulnerabilities.moderate || 0}`);
				console.log(`   Low:      ${vulnerabilities.low || 0}`);
				console.log(`   Total:    ${vulnerabilities.total || 0}\n`);

				if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
					console.error('❌ Critical or high vulnerabilities found!');
					console.log('\nRun "npm audit" for details or "npm audit fix" to attempt fixes.\n');
					process.exit(1);
				} else if (vulnerabilities.moderate > 0) {
					console.log('⚠️  Moderate vulnerabilities found. Review with "npm audit".\n');
				} else if (vulnerabilities.low > 0) {
					console.log('ℹ️  Low severity vulnerabilities found. Consider reviewing.\n');
				} else {
					console.log('✅ No vulnerabilities found!\n');
				}
			}
		} catch (auditError) {
			// npm audit returns non-zero exit code when vulnerabilities are found
			try {
				const errorOutput = JSON.parse(auditError.stdout);
				if (errorOutput.metadata) {
					const { vulnerabilities } = errorOutput.metadata;
					console.log('📊 Vulnerability Summary:');
					console.log(`   Critical: ${vulnerabilities.critical || 0}`);
					console.log(`   High:     ${vulnerabilities.high || 0}`);
					console.log(`   Moderate: ${vulnerabilities.moderate || 0}`);
					console.log(`   Low:      ${vulnerabilities.low || 0}`);
					console.log(`   Total:    ${vulnerabilities.total || 0}\n`);

					if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
						console.error('❌ Critical or high vulnerabilities found!');
						console.log('\nRun "npm audit" for details or "npm audit fix" to attempt fixes.\n');
					} else {
						console.log('⚠️  Some vulnerabilities found. Review with "npm audit".\n');
					}
				}
			} catch {
				console.error('⚠️  Could not parse npm audit results. Run "npm audit" manually.\n');
			}
		}

		// Check for known compromised packages from recent attacks
		const compromisedPackages = [
			{ name: 'debug', compromisedVersion: '4.4.2' },
			{ name: 'chalk', compromisedVersion: '5.6.1' },
			{ name: 'error-ex', compromisedVersion: '1.3.3' },
			{ name: 'ansi-styles', compromisedVersion: '6.2.2' },
			{ name: 'ansi-regex', compromisedVersion: '6.2.1' },
			{ name: 'strip-ansi', compromisedVersion: '7.1.1' },
			{ name: 'color-name', compromisedVersion: '2.0.1' },
			{ name: 'color-convert', compromisedVersion: '3.1.1' },
			{ name: 'eslint-config-prettier', compromisedVersions: ['8.10.1', '9.1.1', '10.1.6', '10.1.7'] }
		];

		console.log('🔍 Checking for known compromised packages...');
		let foundCompromised = false;

		if (sbom.components) {
			for (const component of sbom.components) {
				const compromised = compromisedPackages.find(p => p.name === component.name);
				if (compromised) {
					if (compromised.compromisedVersion === component.version ||
						(compromised.compromisedVersions && compromised.compromisedVersions.includes(component.version))) {
						console.error(`   ❌ COMPROMISED: ${component.name}@${component.version}`);
						foundCompromised = true;
					}
				}
			}
		}

		if (foundCompromised) {
			console.error('\n⚠️  CRITICAL: Compromised packages detected!');
			console.log('Update these packages immediately.\n');
			process.exit(1);
		} else {
			console.log('   ✅ No known compromised packages found\n');
		}

		// Summary
		console.log('📝 SBOM Security Check Complete');
		console.log('================================');
		console.log('✅ SBOM is valid CycloneDX format');
		console.log(`📦 Total components: ${sbom.components?.length || 0}`);

		if (componentsWithRiskyLicenses.length > 0) {
			console.log(`⚠️  Risky licenses: ${componentsWithRiskyLicenses.length} components`);
		} else {
			console.log('✅ No risky licenses detected');
		}

		console.log('\n💡 Recommendations:');
		console.log('1. Regularly update dependencies: npm update');
		console.log('2. Check for vulnerabilities: npm audit');
		console.log('3. Generate fresh SBOM after updates: npm run sbom:generate');
		console.log('4. Use external tools for deeper analysis:');
		console.log('   - grype sbom:./sbom/sbom.json');
		console.log('   - trivy sbom ./sbom/sbom.json');

	} catch (error) {
		console.error('❌ Error checking SBOM vulnerabilities:', error.message);
		process.exit(1);
	}
}

// Run the check
checkSBOMVulnerabilities().catch(console.error);