/** @type {import('@commitlint/types').UserConfig} */
export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		// Scopes die in diesem Projekt verwendet werden
		'scope-enum': [
			2,
			'always',
			[
				'deps', // Dependencies
				'api', // API endpoints
				'ui', // User interface components
				'db', // Database related
				'auth', // Authentication
				'export', // Export functionality
				'admin', // Admin interface
				'report', // Report/sighting forms
				'map', // Map functionality
				'config', // Configuration
				'build', // Build system
				'ci', // Continuous integration
				'docs', // Documentation
				'test', // Tests
				'types', // TypeScript types
				'style', // Styling/CSS
				'perf', // Performance
				'security', // Security
				'a11y', // Accessibility
				'release' // Release commits (semantic-release)
			]
		],
		// Erlaube auch leere Scopes
		'scope-empty': [0],
		// Subject case: lowerCase or start-case erlaubt
		'subject-case': [0, 'always', ['start-case', 'sentence-case', 'lower-case']],
		// Max line length für subject
		'subject-max-length': [2, 'always', 160],
		// Body max line length - relaxed for release notes
		'body-max-line-length': [1, 'always', 1000], // Warning statt Error, längere Zeilen für Release Notes
		// Footer max line length - relaxed for release notes
		'footer-max-line-length': [1, 'always', 200], // Warning statt Error
		// Footer leading blank line - relaxed
		'footer-leading-blank': [1, 'always'] // Warning statt Error
	},
	prompt: {
		questions: {
			type: {
				description: 'Wähle den Typ der Änderung:',
				enum: {
					feat: {
						description: '✨ Ein neues Feature',
						title: 'Features',
						emoji: '✨'
					},
					fix: {
						description: '🐛 Ein Bugfix',
						title: 'Bug Fixes',
						emoji: '🐛'
					},
					docs: {
						description: '📚 Nur Dokumentations-Änderungen',
						title: 'Documentation',
						emoji: '📚'
					},
					style: {
						description:
							'💄 Änderungen, die die Bedeutung des Codes nicht beeinflussen (Whitespace, Formatierung, etc.)',
						title: 'Styles',
						emoji: '💄'
					},
					refactor: {
						description:
							'♻️ Code-Änderung, die weder einen Fehler behebt noch ein Feature hinzufügt',
						title: 'Code Refactoring',
						emoji: '♻️'
					},
					perf: {
						description: '⚡️ Code-Änderung, die die Performance verbessert',
						title: 'Performance Improvements',
						emoji: '⚡️'
					},
					test: {
						description: '✅ Hinzufügen fehlender Tests oder Korrektur bestehender Tests',
						title: 'Tests',
						emoji: '✅'
					},
					build: {
						description: '🏗️ Änderungen, die das Build-System oder externe Dependencies betreffen',
						title: 'Builds',
						emoji: '🏗️'
					},
					ci: {
						description: '🔧 Änderungen an CI-Konfigurationsdateien und Skripten',
						title: 'Continuous Integrations',
						emoji: '🔧'
					},
					chore: {
						description: '🔨 Andere Änderungen, die src- oder test-Dateien nicht modifizieren',
						title: 'Chores',
						emoji: '🔨'
					},
					revert: {
						description: '⏪️ Reverts a previous commit',
						title: 'Reverts',
						emoji: '⏪️'
					}
				}
			},
			scope: {
				description: 'Welcher Scope ist von dieser Änderung betroffen (optional)?'
			},
			subject: {
				description: 'Schreibe eine kurze, imperative Beschreibung der Änderung:'
			},
			body: {
				description: 'Gib eine längere Beschreibung der Änderung an (optional):'
			},
			isBreaking: {
				description: 'Gibt es Breaking Changes?'
			},
			breakingBody: {
				description:
					'Ein Breaking Change Commit erfordert einen Body. Bitte gib eine längere Beschreibung des Commits ein:'
			},
			breaking: {
				description: 'Beschreibe die Breaking Changes:'
			},
			isIssueAffected: {
				description: 'Betrifft diese Änderung offene Issues?'
			},
			issuesBody: {
				description:
					'Wenn Issues geschlossen werden, erfordert der Commit einen Body. Bitte gib eine längere Beschreibung des Commits ein:'
			},
			issues: {
				description: 'Füge Issue-Referenzen hinzu (z.B. "fix #123", "re #123"):'
			}
		}
	}
};
