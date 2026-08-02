<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import OstseeTiereLogo from '$lib/components/OstseeTiereLogo.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Über uns - Ostsee-Tiere</title>
	<meta
		name="description"
		content="Erfahren Sie mehr über die Ostsee-Tiere Plattform. Unterstützen Sie die Meeresforschung durch das Melden von Walsichtungen und anderen Meerestier-Beobachtungen in der Ostsee."
	/>
	<meta
		name="keywords"
		content="Über uns, Ostsee-Tiere, Meeresforschung, Citizen Science, Deutsches Meeresmuseum, Stralsund, Naturschutz"
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="Über uns - Ostsee-Tiere" />
	<meta
		property="og:description"
		content="Erfahren Sie mehr über die Ostsee-Tiere Plattform und unsere Mission für den Meeresschutz"
	/>
	<meta property="og:type" content="website" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Über uns - Ostsee-Tiere" />
	<meta
		name="twitter:description"
		content="Erfahren Sie mehr über die Ostsee-Tiere Plattform und unsere Mission für den Meeresschutz"
	/>
</svelte:head>

<div class="mx-auto max-w-5xl p-6">
	<!-- Hero Section -->
	<div class="mb-16 text-center">
		<div class="mb-8 flex flex-1 justify-center">
			<OstseeTiereLogo size="lg" showText={true} />
		</div>

		<!-- Größen aus der Rollen-Tabelle in design-system.md, nicht frei gewählt:
		     Seitentitel ist `display`, Abschnittstitel `title`, Titel in Karten
		     `section`. Vorher standen hier text-6xl/5xl/4xl/3xl/2xl/xl — dass das
		     nie auffiel, lag an der globalen h1-Regel aus mapStyles.css, die den
		     Titel auf Mobil auf 20px zwang und die Staffelung damit verdeckte. -->
		<h1 class="text-primary text-display mb-8 font-bold tracking-tight">Über Ostsee-Tiere</h1>
		<div class="mx-auto max-w-4xl">
			<p class="text-base-content/80 mb-6 text-2xl leading-relaxed">
				Die Ostsee-Tiere Plattform ermöglicht es <strong class="text-primary"
					>Bürgern, Forschern und Naturbeobachtern</strong
				>, ihre Sichtungen von Walen, Robben und anderen Meerestieren zu melden.
			</p>
			<p class="text-base-content/70 text-lg">
				Gemeinsam schaffen wir wertvolle Daten für die <em>Meeresforschung und den Naturschutz</em>.
			</p>
		</div>
	</div>

	<!-- Mission Section -->
	<div class="mb-20">
		<div class="grid items-center gap-12 md:grid-cols-2">
			<div>
				<h2 class="text-primary text-title mb-6 flex items-center gap-3 font-bold">
					<Icon icon="lucide:zap" width="36" class="text-primary" />
					Unsere Mission
				</h2>
				<div class="space-y-4">
					<p class="text-base-content/80 text-lg leading-relaxed">
						Wir glauben, dass <strong>jeder einen Beitrag</strong> zum Schutz der Meeresumwelt leisten
						kann. Durch das Sammeln und Teilen von Sichtungsdaten schaffen wir eine umfassende Wissensbasis
						über die Meerestiere der Ostsee.
					</p>
					<div class="border-primary/30 bg-primary/5 rounded-r-lg border-l-4 px-6 py-3 pl-4">
						<p class="text-base-content text-base leading-relaxed font-medium">
							Ihre Beobachtungen helfen Wissenschaftlern dabei, <em
								>Wanderungsmuster zu verstehen</em
							>, Populationen zu überwachen und <em>Schutzmaßnahmen zu entwickeln</em>.
						</p>
					</div>
				</div>
			</div>
			<div
				class="card from-primary/5 via-secondary/5 to-accent/5 border-primary/20 bg-gradient-to-br shadow-xl"
			>
				<div class="card-body p-10 text-center">
					<div class="mb-6 flex justify-center">
						<Icon icon="lucide:activity" width="60" class="text-primary opacity-80" />
					</div>
					<h3 class="text-primary text-section mb-4 font-bold">Citizen Science</h3>
					<p class="text-base-content/70 text-lg leading-relaxed">
						Bürgerwissenschaft macht <strong>jeden zum Forscher</strong> und trägt zu wichtigen wissenschaftlichen
						Erkenntnissen bei.
					</p>
					<!-- Jahreszahl kommt aus der Datenbank (älteste freigegebene Sichtung),
					     nicht aus dem Template — Begründung in +page.server.ts. -->
					{#if data.earliestSightingYear != null}
						<div class="stats stats-vertical mt-6 shadow-sm">
							<div class="stat">
								<div class="stat-title text-xs">Sichtungen seit</div>
								<div class="stat-value text-primary text-2xl">{data.earliestSightingYear}</div>
								<div class="stat-desc">in unserer Datenbank</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Features Section -->
	<div class="mb-20">
		<div class="mb-12 text-center">
			<h2 class="text-primary text-title mb-4 flex items-center justify-center gap-3 font-bold">
				<Icon icon="lucide:zap" width="36" class="text-primary" />
				Unsere Plattform
			</h2>
			<p class="text-base-content/70 mx-auto max-w-2xl text-lg">
				Modernste Technologie für einfache Bedienung und maximale wissenschaftliche Relevanz
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-3">
			<div class="card bg-base-100 group shadow-xl transition-all duration-300 hover:shadow-2xl">
				<div class="card-body p-8 text-center">
					<div
						class="mb-6 flex justify-center transition-transform duration-300 group-hover:scale-110"
					>
						<Icon icon="lucide:pen-line" width="48" class="text-primary" />
					</div>
					<h3 class="card-title text-primary text-section mb-4 justify-center">Einfaches Melden</h3>
					<p class="text-base-content/80 text-base leading-relaxed">
						<strong>Intuitive Formulare</strong> führen Sie Schritt für Schritt durch die Erfassung
						Ihrer Sichtung mit <em>GPS-genauer Lokalisierung</em>.
					</p>
					<div class="mt-4">
						<div class="badge badge-primary badge-outline">GPS-Integration</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 group shadow-xl transition-all duration-300 hover:shadow-2xl">
				<div class="card-body p-8 text-center">
					<div
						class="mb-6 flex justify-center transition-transform duration-300 group-hover:scale-110"
					>
						<Icon icon="lucide:map" width="48" class="text-secondary-strong" />
					</div>
					<h3 class="card-title text-secondary-strong text-section mb-4 justify-center">
						Interaktive Karte
					</h3>
					<!-- „alle Sichtungen" traf nicht zu: die Karte zeigt ausschließlich
					     freigegebene Meldungen und filtert dabei auf ein Jahr. -->
					<p class="text-base-content/80 text-base leading-relaxed">
						Sehen Sie die <strong>freigegebenen Sichtungen</strong> jahrweise auf einer
						detaillierten Karte der Ostsee und entdecken Sie <em>Muster und Hotspots</em>.
					</p>
					<div class="mt-4">
						<div class="badge badge-secondary badge-outline">OpenLayers</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 group shadow-xl transition-all duration-300 hover:shadow-2xl">
				<div class="card-body p-8 text-center">
					<div
						class="mb-6 flex justify-center transition-transform duration-300 group-hover:scale-110"
					>
						<Icon icon="lucide:chart-pie" width="48" class="text-accent-strong" />
					</div>
					<h3 class="card-title text-accent-strong text-section mb-4 justify-center">Offene Daten</h3>
					<!-- Vorher: „Alle Daten sind für Forschungszwecke verfügbar und können in
					     verschiedenen Formaten exportiert werden." Der Export in mehrere
					     Formate ist eine Funktion des Admin-Bereichs, nicht der Öffentlichkeit
					     (das Setting `data.exportFormats` wird nirgends gelesen). Öffentlich
					     abrufbar sind die freigegebenen Sichtungen über die dokumentierte
					     API — das steht hier jetzt statt des weitergehenden Versprechens. -->
					<p class="text-base-content/80 text-base leading-relaxed">
						Die freigegebenen Sichtungen sind über eine <strong>offene API</strong> abrufbar und
						damit für <em>Forschung und Lehre</em> nutzbar.
					</p>
					<div class="mt-4">
						<div class="badge badge-accent badge-outline">Open Data</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Partnership Section -->
	<div class="mb-16">
		<div class="bg-primary text-primary-content rounded-lg p-8 text-center">
			<img
				src="/logo_dmm_negativ.svg"
				alt="Deutsches Meeresmuseum Logo"
				class="mx-auto mb-4 w-64 p-4"
			/>
			<p class="text-primary-content mx-auto mb-4 max-w-2xl leading-relaxed">
				Diese Plattform wird vom Deutschen Meeresmuseum in Stralsund betrieben, einem der führenden
				Zentren für Meeresforschung und -bildung in Deutschland. Seit über 70 Jahren widmen wir uns
				der Erforschung und dem Schutz der marinen Lebensräume.
			</p>
			<div class="flex justify-center gap-4">
				<a
					href="https://www.deutsches-meeresmuseum.de"
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-outline btn-sm"
				>
					<Icon icon="lucide:globe" width="16" class="mr-1" />
					Meeresmuseum.de
				</a>
				<a
					href="https://www.deutsches-meeresmuseum.de/wissenschaft/sichtungen"
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-outline btn-sm"
				>
					<Icon icon="lucide:file-text" width="16" class="mr-1" />
					Mehr über Sichtungen
				</a>
			</div>
		</div>
	</div>

	<!-- Data Protection & Security Section -->
	<div class="mb-16">
		<h2 class="text-title mb-8 flex items-center justify-center gap-3 text-center font-bold">
			<Icon icon="lucide:shield-check" width="30" class="text-success-strong" />
			Datenschutz & Sicherheit
		</h2>

		<div class="grid gap-8 md:grid-cols-2">
			<!-- Data Protection Card -->
			<div class="card bg-base-100 border-success/20 border shadow-xl">
				<div class="card-body">
					<div class="mb-4 flex items-center gap-2">
						<Icon icon="lucide:shield-check" width="30" class="text-success-strong" />
						<h3 class="card-title">Datenschutz</h3>
					</div>
					<p class="text-base-content/80 mb-4 text-sm">
						Ihre Daten sind bei uns sicher. Wir verarbeiten alle personenbezogenen Daten gemäß der
						EU-Datenschutz-Grundverordnung (DSGVO) und dem Bundesdatenschutzgesetz (BDSG).
					</p>
					<ul class="space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<Icon icon="lucide:check" width="16" class="text-success-strong mt-1" />
							<span>Freiwillige Angabe personenbezogener Daten</span>
						</li>
						<li class="flex items-start gap-2">
							<Icon icon="lucide:check" width="16" class="text-success-strong mt-1" />
							<span>Verschlüsselte Übertragung aller Daten</span>
						</li>
						<li class="flex items-start gap-2">
							<Icon icon="lucide:check" width="16" class="text-success-strong mt-1" />
							<span>Keine Weitergabe an unbefugte Dritte</span>
						</li>
						<li class="flex items-start gap-2">
							<Icon icon="lucide:check" width="16" class="text-success-strong mt-1" />
							<span>Anonymisierte öffentliche Darstellung</span>
						</li>
					</ul>
					<div class="card-actions mt-4">
						<a
							href="https://www.deutsches-meeresmuseum.de/datenschutz"
							target="_blank"
							rel="noopener noreferrer"
							class="btn btn-outline btn-sm"
						>
							Datenschutzerklärung →
						</a>
					</div>
				</div>
			</div>

			<!-- Security Card -->
			<div class="card bg-base-100 border-info/20 border shadow-xl">
				<div class="card-body">
					<div class="mb-4 flex items-center gap-2">
						<Icon icon="lucide:lock" width="30" class="text-info-strong" />
						<h3 class="card-title">Technische Sicherheit</h3>
					</div>
					<p class="text-base-content/80 mb-4 text-sm">
						Wir nutzen modernste Sicherheitstechnologien, um Ihre Daten und unsere Plattform zu
						schützen.
					</p>
					<ul class="space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<Icon icon="lucide:check" width="16" class="text-info-strong mt-1" />
							<span>HTTPS/SSL-Verschlüsselung für alle Verbindungen</span>
						</li>
						<li class="flex items-start gap-2">
							<Icon icon="lucide:check" width="16" class="text-info-strong mt-1" />
							<span>Sichere Authentifizierung mit Auth0</span>
						</li>
						<li class="flex items-start gap-2">
							<Icon icon="lucide:check" width="16" class="text-info-strong mt-1" />
							<span>Regelmäßige Sicherheitsupdates</span>
						</li>
						<li class="flex items-start gap-2">
							<Icon icon="lucide:check" width="16" class="text-info-strong mt-1" />
							<span>Gehostete Infrastruktur in Deutschland/EU</span>
						</li>
					</ul>
					<!-- Dunkle Fläche ist hier keine Laune: /auth0.svg zeichnet in #FFFEFA auf
					     transparent und wäre auf base-100 unsichtbar. Der Bedarf ist damit
					     „dunkle Vollton-Fläche" — und dafür gibt es ein Token. bg-neutral
					     (#3a4048) trägt sein neutral-content mit 10,5:1. -->
					<div class="border-info/10 bg-neutral mt-4 rounded-lg border p-3">
						<a href="https://auth0.com" target="_blank" rel="noopener noreferrer"
							><img src="/auth0.svg" alt="Auth0 Logo" class=" mx-auto mb-4" /></a
						>
						<p class="text-neutral-content text-xs">
							Gesichert durch <a
								href="https://auth0.com"
								target="_blank"
								rel="noopener noreferrer"
								class="text-info-strong font-semibold hover:underline">Auth0</a
							>
							– der führenden Plattform für sichere Authentifizierung und Autorisierung.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- GDPR Compliance Notice -->
		<!-- Verlauf aus der Tailwind-Palette ersetzt (2026-08-02). `from-green-50
		     to-emerald-50` umging das Theme genauso vollständig wie ein
		     `bg-green-50` — der Klassen-Scan hat es nur nicht gemeldet, weil sein
		     Muster die Gradient-Stops nicht kannte. Der Tint trägt hier dieselbe
		     Aussage, kommt aber aus dem Theme; die Rahmen-Deckkraft ist auf /20
		     gezogen wie an der Datenschutz-Karte weiter oben. -->
		<div class="border-success/20 bg-success/5 mt-8 rounded-lg border p-6">
			<div class="flex items-start gap-4">
				<Icon icon="lucide:file-text" width="24" class="text-success-strong" />
				<div class="flex-1">
					<h4 class="mb-2 font-semibold">DSGVO-Konformität</h4>
					<p class="text-base-content/80 mb-3 text-sm">
						Als öffentliche Einrichtung nehmen wir den Datenschutz besonders ernst. Unsere Plattform
						erfüllt alle Anforderungen der europäischen Datenschutz-Grundverordnung:
					</p>
					<div class="grid gap-3 text-sm md:grid-cols-2">
						<div class="flex items-center gap-2">
							<Icon icon="lucide:check" width="16" class="text-success-strong" />
							<span>Recht auf Auskunft</span>
						</div>
						<div class="flex items-center gap-2">
							<Icon icon="lucide:check" width="16" class="text-success-strong" />
							<span>Recht auf Berichtigung</span>
						</div>
						<div class="flex items-center gap-2">
							<Icon icon="lucide:check" width="16" class="text-success-strong" />
							<span>Recht auf Löschung</span>
						</div>
						<div class="flex items-center gap-2">
							<Icon icon="lucide:check" width="16" class="text-success-strong" />
							<span>Recht auf Datenübertragbarkeit</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Contact for Data Protection -->
		<div class="bg-base-200 mt-8 rounded-lg p-6 text-center">
			<h4 class="mb-3 font-semibold">Fragen zum Datenschutz?</h4>
			<p class="text-base-content/80 mb-4 text-sm">
				Bei Fragen zum Datenschutz oder zur Verarbeitung Ihrer Daten können Sie sich jederzeit an
				uns wenden:
			</p>
			<div class="flex flex-col items-center gap-2 text-sm">
				<div>
					Deutsches Meeresmuseum<br />
					Katharinenberg 14 - 20<br />
					18439 Stralsund
				</div>
				<a
					href="https://www.deutsches-meeresmuseum.de/kontakt"
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-outline btn-sm mt-3"
				>
					Kontakt aufnehmen →
				</a>
			</div>
		</div>
	</div>

	<!-- Technology Section -->
	<div class="bg-base-200 mb-16 rounded-lg p-8">
		<div class="mb-6 flex flex-col items-center justify-center gap-2">
			<h2 class="text-title flex items-center gap-3 text-center font-bold">
				<Icon icon="lucide:zap" width="30" class="text-warning-strong" />
				Technologie
			</h2>
			<div class="badge badge-neutral badge-lg font-mono">Version {data.version}</div>
		</div>
		<p class="text-base-content/80 mx-auto mb-8 max-w-3xl text-center">
			Unsere Plattform nutzt moderne Web-Technologien für eine optimale Benutzererfahrung und
			zuverlässige Datenverarbeitung.
		</p>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<div class="text-center">
				<div class="badge badge-primary badge-lg">SvelteKit</div>
				<p class="text-base-content/70 mt-2 text-xs">Modern Web Framework</p>
			</div>
			<div class="text-center">
				<div class="badge badge-secondary badge-lg">PostGIS</div>
				<p class="text-base-content/70 mt-2 text-xs">Geografische Datenbank</p>
			</div>
			<div class="text-center">
				<div class="badge badge-accent badge-lg">OpenAPI</div>
				<p class="text-base-content/70 mt-2 text-xs">Standardisierte API</p>
			</div>
			<div class="text-center">
				<div class="badge badge-info badge-lg">OpenLayers</div>
				<p class="text-base-content/70 mt-2 text-xs">Interaktive Karten</p>
			</div>
		</div>
	</div>

	<!-- Open Source & Licensing Section -->
	<div class="mb-16">
		<h2 class="text-title mb-8 flex items-center justify-center gap-3 text-center font-bold">
			<Icon icon="lucide:scale" width="32" height="32" class="text-primary" />
			Open Source & Lizenzen
		</h2>

		<div class="grid gap-8 md:grid-cols-2">
			<!-- Project License -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<div class="mb-4 flex items-center gap-2">
						<Icon icon="lucide:file-text" width="32" height="32" class="text-primary" />
						<h3 class="card-title">Projekt-Lizenz</h3>
					</div>
					<p class="text-base-content/80 mb-4 text-sm">
						Die Ostsee-Tiere Plattform ist Open Source Software und steht unter der MIT-Lizenz. Dies
						bedeutet, dass der Quellcode frei verfügbar ist und für eigene Projekte genutzt werden
						kann.
					</p>
					<div class="bg-base-200 rounded-lg p-4">
						<div class="mb-2 font-mono text-xs font-semibold">MIT License</div>
						<div class="border-base-300 bg-base-100 max-h-48 overflow-y-auto rounded border p-3">
							<pre
								class="text-base-content/70 font-mono text-xs whitespace-pre-wrap">Copyright (c) 2025-2026 Ostsee-Tiere WebApp Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.</pre>
						</div>
					</div>
					<div class="card-actions mt-4">
						<a
							href="https://github.com/jansinger/ostsee-tiere"
							target="_blank"
							rel="noopener noreferrer"
							class="btn btn-outline btn-sm"
						>
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
								<path
									d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
								/>
							</svg>
							GitHub Repository
						</a>
					</div>
				</div>
			</div>

			<!-- Dependencies -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<div class="mb-4 flex items-center gap-2">
						<Icon icon="lucide:archive" width="32" height="32" class="text-primary" />
						<h3 class="card-title">Verwendete Technologien</h3>
					</div>
					<p class="text-base-content/80 mb-4 text-sm">
						Diese Plattform baut auf bewährten Open Source Technologien auf:
					</p>
					<div class="space-y-2 text-xs">
						<div class="bg-base-200 flex items-center justify-between rounded p-2">
							<span class="font-medium">SvelteKit</span>
							<span class="badge badge-sm">MIT</span>
						</div>
						<div class="bg-base-200 flex items-center justify-between rounded p-2">
							<span class="font-medium">TailwindCSS</span>
							<span class="badge badge-sm">MIT</span>
						</div>
						<div class="bg-base-200 flex items-center justify-between rounded p-2">
							<span class="font-medium">DaisyUI</span>
							<span class="badge badge-sm">MIT</span>
						</div>
						<div class="bg-base-200 flex items-center justify-between rounded p-2">
							<span class="font-medium">OpenLayers</span>
							<span class="badge badge-sm">BSD-2</span>
						</div>
						<div class="bg-base-200 flex items-center justify-between rounded p-2">
							<span class="font-medium">PostgreSQL</span>
							<span class="badge badge-sm">PostgreSQL</span>
						</div>
						<div class="bg-base-200 flex items-center justify-between rounded p-2">
							<span class="font-medium">Drizzle ORM</span>
							<span class="badge badge-sm">Apache-2.0</span>
						</div>
					</div>
					<p class="text-base-content/60 mt-3 text-xs">
						Alle verwendeten Bibliotheken sind sorgfältig ausgewählt und lizenzkonform eingesetzt.
					</p>
				</div>
			</div>
		</div>

		<!-- Contribution & Issues -->
		<!-- Vorher: `border-purple/10 border bg-gradient-to-r from-purple-50
		     to-indigo-50`. Zwei Fehler in einer Klassenliste.

		     Der Verlauf kam aus der Tailwind-Palette und umging das Theme. Und
		     `border-purple/10` existierte als Utility überhaupt nicht — Tailwind
		     führt `purple` nur mit Farbstufe, der Name erzeugt also nichts. Die
		     Box trug damit die Default-Rahmenfarbe statt des gedachten Tints, und
		     zwar unbemerkt, weil eine tote Klasse im Markup aussieht wie eine
		     wirksame.

		     Ersatz ist `bg-base-200` ohne Rahmen — dieselbe Fläche wie die
		     Danksagungs- und die Kontakt-Box weiter unten. Kein Statusfarbton:
		     „Fehler gefunden oder Verbesserungsvorschlag?" ist eine Einladung,
		     keine Warnung; die Bedeutung trägt das Icon. -->
		<div class="bg-base-200 mt-8 rounded-lg p-6">
			<div class="flex items-start gap-4">
				<Icon icon="lucide:circle-alert" width="32" height="32" class="text-warning-strong mt-1" />
				<div class="flex-1">
					<h4 class="mb-2 font-semibold">Fehler gefunden oder Verbesserungsvorschlag?</h4>
					<p class="text-base-content/80 mb-3 text-sm">
						Wir freuen uns über Ihr Feedback! Die Ostsee-Tiere Plattform wird kontinuierlich
						weiterentwickelt. Ihre Hinweise helfen uns dabei, die Plattform zu verbessern.
					</p>
					<div class="flex flex-wrap gap-3">
						<a
							href="https://github.com/jansinger/ostsee-tiere/issues/new"
							target="_blank"
							rel="noopener noreferrer"
							class="btn btn-outline btn-sm"
						>
							<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							Issue erstellen
						</a>
						<a
							href="https://github.com/jansinger/ostsee-tiere/issues"
							target="_blank"
							rel="noopener noreferrer"
							class="btn btn-ghost btn-sm"
						>
							Alle Issues ansehen
						</a>
					</div>
				</div>
			</div>
		</div>

		<!-- Attribution -->
		<div class="bg-base-200 mt-8 rounded-lg p-6 text-center">
			<h4 class="mb-3 flex items-center justify-center gap-2 font-semibold">
				<Icon icon="lucide:heart" width="20" height="20" class="text-primary" />
				Danksagung
			</h4>
			<p class="text-base-content/80 mb-4 text-sm">
				Wir danken allen Entwicklern und Organisationen, die durch ihre Open Source Projekte diese
				Plattform ermöglichen. Besonderer Dank gilt:
			</p>
			<!-- Die Trennpunkte zwischen den Links sind reine Zier: `aria-hidden`, weil
			     Screenreader bisher „Svelte Team Bullet Tailwind Labs Bullet …" vorlasen,
			     und `text-base-content/70` statt `opacity-30`, weil ein Punkt ein Zeichen
			     und keine Fläche ist — die Deckkraft-Untergrenze /60 aus
			     design-system.md gilt hier also. /70 ist die dort für Zierelemente
			     vorgesehene Stufe. -->
			<div class="flex flex-wrap justify-center gap-4 text-sm">
				<a
					href="https://svelte.dev"
					target="_blank"
					rel="noopener noreferrer"
					class="link link-hover">Svelte Team</a
				>
				<span class="text-base-content/70" aria-hidden="true">•</span>
				<a
					href="https://tailwindcss.com"
					target="_blank"
					rel="noopener noreferrer"
					class="link link-hover">Tailwind Labs</a
				>
				<span class="text-base-content/70" aria-hidden="true">•</span>
				<a
					href="https://openlayers.org"
					target="_blank"
					rel="noopener noreferrer"
					class="link link-hover">OpenLayers Contributors</a
				>
				<span class="text-base-content/70" aria-hidden="true">•</span>
				<a
					href="https://auth0.com"
					target="_blank"
					rel="noopener noreferrer"
					class="link link-hover">Auth0</a
				>
				<span class="text-base-content/70" aria-hidden="true">•</span>
				<a
					href="https://www.postgresql.org"
					target="_blank"
					rel="noopener noreferrer"
					class="link link-hover">PostgreSQL Global Development Group</a
				>
			</div>
		</div>
	</div>

	<!-- Call to Action -->
	<div
		class="hero from-primary/10 via-secondary/10 to-accent/10 border-primary/20 rounded-2xl border-2 bg-gradient-to-br p-12"
	>
		<div class="hero-content text-center">
			<div class="max-w-4xl">
				<div class="mb-8">
					<div class="avatar mb-6">
						<div
							class="ring-primary ring-offset-base-100 from-primary/10 to-secondary/10 w-32 rounded-full bg-gradient-to-br shadow-xl ring ring-offset-4"
						>
							<OstseeTiereLogo size="lg" showText={false} />
						</div>
					</div>
					<h2 class="text-primary text-title mb-6 font-bold tracking-tight">
						Werden Sie Teil der Bewegung
					</h2>
					<p class="text-base-content/80 mb-8 text-xl leading-relaxed">
						<strong>Jede Sichtung zählt!</strong> Helfen Sie uns dabei, die Geheimnisse der Ostsee
						zu entschlüsseln und ihre <em>einzigartigen Bewohner</em> zu schützen.
					</p>
				</div>

				<!--
					Beschriftungen und Rückfallwerte korrigiert (2026-07-30):

					- „Bereits erfasst" war falsch: `totalSightings` zählt über
					  `approvedOnly()` nur die **freigegebenen** Sichtungen. Erfasst sind
					  mehr (die noch nicht freigegebenen fehlen in dieser Zahl).
					- „Aktive Beobachter" war doppelt falsch: der Wert ist die Zahl
					  **unterschiedlicher E-Mail-Adressen** in allen freigegebenen
					  Sichtungen — kumuliert über den gesamten Zeitraum, nicht „aktiv".
					  Melder ohne E-Mail-Angabe fehlen, eine Person mit zwei Adressen
					  zählt zweimal. Deshalb „Melder-Adressen" statt „Beobachter".
					- Die Rückfallwerte `1.800+` und `500+` lagen um den Faktor 10 unter
					  der Realität (19.262 bzw. 6.430). Bei einem Datenbankfehler hätte die
					  Seite also grob falsche Zahlen als Tatsache ausgegeben. Jetzt wird
					  die Kachel in diesem Fall weggelassen — keine Zahl ist besser als
					  eine erfundene (siehe .claude/rules/design-system.md, „Zahlen in
					  Nutzertexten nur mit Quelle").
				-->
				<div class="stats stats-vertical sm:stats-horizontal bg-base-100/50 mb-8 w-full shadow-xl">
					{#if data.totalSightings != null}
						<div class="stat">
							<div class="stat-title">Veröffentlicht</div>
							<div class="stat-value text-primary">
								{new Intl.NumberFormat('de-DE').format(data.totalSightings)}
							</div>
							<div class="stat-desc">freigegebene Sichtungen</div>
						</div>
					{/if}
					{#if data.totalObservers != null}
						<div class="stat">
							<div class="stat-title">Beteiligt</div>
							<div class="stat-value text-secondary-strong">
								{new Intl.NumberFormat('de-DE').format(data.totalObservers)}
							</div>
							<div class="stat-desc">Melder-Adressen insgesamt</div>
						</div>
					{/if}
					<div class="stat">
						<div class="stat-title">Für die</div>
						<div class="stat-value text-accent-strong">Wissenschaft</div>
						<div class="stat-desc">verfügbar</div>
					</div>
				</div>

				<div class="flex flex-wrap justify-center gap-6">
					<a
						href="/"
						class="btn btn-primary btn-lg px-8 py-4 text-lg shadow-lg transition-all duration-300 hover:shadow-xl"
					>
						<Icon icon="custom:porpoise" width="20" height="20" class="mr-2" aria-hidden="true" />
						Sichtung melden
					</a>
					<a
						href="/map"
						class="btn btn-secondary btn-outline btn-lg px-8 py-4 text-lg shadow-lg transition-all duration-300 hover:shadow-xl"
					>
						<Icon icon="lucide:map" width="20" height="20" class="mr-2" />
						Karte erkunden
					</a>
					<a
						href="/docs"
						class="btn btn-accent btn-outline btn-lg px-8 py-4 text-lg shadow-lg transition-all duration-300 hover:shadow-xl"
					>
						<Icon icon="lucide:book-open" width="20" height="20" class="mr-2" />
						Mehr erfahren
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
