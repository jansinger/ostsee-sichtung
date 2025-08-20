<script lang="ts">
	import OstseeTiereLogo from '$lib/components/OstseeTiereLogo.svelte';

	// About page for Ostsee-Tiere platform
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

<div class="mx-auto max-w-6xl p-6">
	<!-- Hero Section -->
	<div class="mb-12 text-center">
		<div class="flex flex-1 justify-center">
			<OstseeTiereLogo size="lg" showText={true} />
		</div>

		<h1 class="text-primary mb-6 text-5xl font-bold">Über Ostsee-Tiere</h1>
		<p class="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600">
			Die Ostsee-Tiere Plattform ermöglicht es Bürgern, Forschern und Naturbeobachtern, ihre
			Sichtungen von Walen, Robben und anderen Meerestieren zu melden und so wertvolle Daten für die
			Meeresforschung und den Naturschutz beizutragen.
		</p>
	</div>

	<!-- Mission Section -->
	<div class="mb-16">
		<div class="grid items-center gap-8 md:grid-cols-2">
			<div>
				<h2 class="mb-4 text-3xl font-bold">🎯 Unsere Mission</h2>
				<p class="mb-4 leading-relaxed text-gray-700">
					Wir glauben, dass jeder einen Beitrag zum Schutz der Meeresumwelt leisten kann. Durch das
					Sammeln und Teilen von Sichtungsdaten schaffen wir eine umfassende Wissensbasis über die
					Meerestiere der Ostsee.
				</p>
				<p class="leading-relaxed text-gray-700">
					Ihre Beobachtungen helfen Wissenschaftlern dabei, Wanderungsmuster zu verstehen,
					Populationen zu überwachen und Schutzmaßnahmen zu entwickeln.
				</p>
			</div>
			<div class="rounded-lg bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-8">
				<div class="text-center">
					<div class="mb-4 text-4xl">🔬</div>
					<h3 class="mb-2 text-xl font-semibold">Citizen Science</h3>
					<p class="text-gray-600">
						Bürgerwissenschaft macht jeden zum Forscher und trägt zu wichtigen wissenschaftlichen
						Erkenntnissen bei.
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Features Section -->
	<div class="mb-16">
		<h2 class="mb-8 text-center text-3xl font-bold">🚀 Unsere Plattform</h2>
		<div class="grid gap-6 md:grid-cols-3">
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body text-center">
					<div class="mb-4 text-3xl">📝</div>
					<h3 class="card-title justify-center">Einfaches Melden</h3>
					<p class="text-sm text-gray-600">
						Intuitive Formulare führen Sie Schritt für Schritt durch die Erfassung Ihrer Sichtung
						mit GPS-genauer Lokalisierung.
					</p>
				</div>
			</div>

			<div class="card bg-base-100 shadow-xl">
				<div class="card-body text-center">
					<div class="mb-4 text-3xl">🗺️</div>
					<h3 class="card-title justify-center">Interaktive Karte</h3>
					<p class="text-sm text-gray-600">
						Visualisieren Sie alle Sichtungen auf einer detaillierten Karte der Ostsee und entdecken
						Sie Muster und Hotspots.
					</p>
				</div>
			</div>

			<div class="card bg-base-100 shadow-xl">
				<div class="card-body text-center">
					<div class="mb-4 text-3xl">📊</div>
					<h3 class="card-title justify-center">Offene Daten</h3>
					<p class="text-sm text-gray-600">
						Alle Daten sind für Forschungszwecke verfügbar und können in verschiedenen Formaten
						exportiert werden.
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Partnership Section -->
	<div class="mb-16">
		<div class="rounded-lg p-8 text-center text-white" style="background-color: rgb(0, 60, 100)">
			<img
				src="/logo_dmm_negativ.svg"
				alt="Deutsches Meeresmuseum Logo"
				class="mx-auto mb-4 w-64 p-4"
			/>
			<p class="mx-auto mb-4 max-w-2xl leading-relaxed text-white">
				Diese Plattform wird vom Deutschen Meeresmuseum in Stralsund betrieben, einem der führenden
				Zentren für Meeresforschung und -bildung in Deutschland. Seit über 50 Jahren widmen wir uns
				der Erforschung und dem Schutz der marinen Lebensräume.
			</p>
			<div class="flex justify-center gap-4">
				<a
					href="https://www.deutsches-meeresmuseum.de"
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-outline btn-sm"
				>
					🌐 Meeresmuseum.de
				</a>
				<a
					href="https://www.deutsches-meeresmuseum.de/wissenschaft/sichtungen"
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-outline btn-sm"
				>
					📚 Mehr über Sichtungen
				</a>
			</div>
		</div>
	</div>

	<!-- Data Protection & Security Section -->
	<div class="mb-16">
		<h2 class="mb-8 text-center text-3xl font-bold">🔒 Datenschutz & Sicherheit</h2>

		<div class="grid gap-8 md:grid-cols-2">
			<!-- Data Protection Card -->
			<div class="card bg-base-100 border-success/20 border shadow-xl">
				<div class="card-body">
					<div class="mb-4 flex items-center gap-2">
						<div class="text-3xl">🛡️</div>
						<h3 class="card-title">Datenschutz</h3>
					</div>
					<p class="mb-4 text-sm text-gray-700">
						Ihre Daten sind bei uns sicher. Wir verarbeiten alle personenbezogenen Daten gemäß der
						EU-Datenschutz-Grundverordnung (DSGVO) und dem Bundesdatenschutzgesetz (BDSG).
					</p>
					<ul class="space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<span class="text-success mt-1">✓</span>
							<span>Freiwillige Angabe personenbezogener Daten</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-success mt-1">✓</span>
							<span>Verschlüsselte Übertragung aller Daten</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-success mt-1">✓</span>
							<span>Keine Weitergabe an unbefugte Dritte</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-success mt-1">✓</span>
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
						<div class="text-3xl">🔐</div>
						<h3 class="card-title">Technische Sicherheit</h3>
					</div>
					<p class="mb-4 text-sm text-gray-700">
						Wir nutzen modernste Sicherheitstechnologien, um Ihre Daten und unsere Plattform zu
						schützen.
					</p>
					<ul class="space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<span class="text-info mt-1">✓</span>
							<span>HTTPS/SSL-Verschlüsselung für alle Verbindungen</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-info mt-1">✓</span>
							<span>Sichere Authentifizierung mit Auth0</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-info mt-1">✓</span>
							<span>Regelmäßige Sicherheitsupdates</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-info mt-1">✓</span>
							<span>Gehostete Infrastruktur in Deutschland/EU</span>
						</li>
					</ul>
					<div class="border-info/10 mt-4 rounded-lg border bg-black p-3">
						<a href="https://auth0.com" target="_blank" rel="noopener noreferrer"
							><img src="/auth0.svg" alt="Auth0 Logo" class=" mx-auto mb-4" /></a
						>
						<p class="text-xs text-white">
							Gesichert durch <a
								href="https://auth0.com"
								target="_blank"
								rel="noopener noreferrer"
								class="text-info font-semibold hover:underline">Auth0</a
							>
							– der führenden Plattform für sichere Authentifizierung und Autorisierung.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- GDPR Compliance Notice -->
		<div
			class="border-success/10 mt-8 rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 p-6"
		>
			<div class="flex items-start gap-4">
				<div class="text-2xl">📋</div>
				<div class="flex-1">
					<h4 class="mb-2 font-semibold">DSGVO-Konformität</h4>
					<p class="mb-3 text-sm text-gray-700">
						Als öffentliche Einrichtung nehmen wir den Datenschutz besonders ernst. Unsere Plattform
						erfüllt alle Anforderungen der europäischen Datenschutz-Grundverordnung:
					</p>
					<div class="grid gap-3 text-sm md:grid-cols-2">
						<div class="flex items-center gap-2">
							<span class="text-success">✓</span>
							<span>Recht auf Auskunft</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-success">✓</span>
							<span>Recht auf Berichtigung</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-success">✓</span>
							<span>Recht auf Löschung</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-success">✓</span>
							<span>Recht auf Datenübertragbarkeit</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Contact for Data Protection -->
		<div class="bg-base-200 mt-8 rounded-lg p-6 text-center">
			<h4 class="mb-3 font-semibold">Fragen zum Datenschutz?</h4>
			<p class="mb-4 text-sm text-gray-700">
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
		<h2 class="mb-6 text-center text-3xl font-bold">⚡ Technologie</h2>
		<p class="mx-auto mb-8 max-w-3xl text-center text-gray-700">
			Unsere Plattform nutzt moderne Web-Technologien für eine optimale Benutzererfahrung und
			zuverlässige Datenverarbeitung.
		</p>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<div class="text-center">
				<div class="badge badge-primary badge-lg">SvelteKit</div>
				<p class="mt-2 text-xs text-gray-600">Modern Web Framework</p>
			</div>
			<div class="text-center">
				<div class="badge badge-secondary badge-lg">PostGIS</div>
				<p class="mt-2 text-xs text-gray-600">Geografische Datenbank</p>
			</div>
			<div class="text-center">
				<div class="badge badge-accent badge-lg">OpenAPI</div>
				<p class="mt-2 text-xs text-gray-600">Standardisierte API</p>
			</div>
			<div class="text-center">
				<div class="badge badge-info badge-lg">OpenLayers</div>
				<p class="mt-2 text-xs text-gray-600">Interaktive Karten</p>
			</div>
		</div>
	</div>

	<!-- Open Source & Licensing Section -->
	<div class="mb-16">
		<h2 class="mb-8 text-center text-3xl font-bold">⚖️ Open Source & Lizenzen</h2>

		<div class="grid gap-8 md:grid-cols-2">
			<!-- Project License -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<div class="mb-4 flex items-center gap-2">
						<div class="text-3xl">📜</div>
						<h3 class="card-title">Projekt-Lizenz</h3>
					</div>
					<p class="mb-4 text-sm text-gray-700">
						Die Ostsee-Tiere Plattform ist Open Source Software und steht unter der MIT-Lizenz. Dies
						bedeutet, dass der Quellcode frei verfügbar ist und für eigene Projekte genutzt werden
						kann.
					</p>
					<div class="rounded-lg bg-gray-50 p-4">
						<div class="mb-2 font-mono text-xs font-semibold">MIT License</div>
						<div class="max-h-48 overflow-y-auto rounded border border-gray-200 bg-white p-3">
							<pre
								class="font-mono text-xs whitespace-pre-wrap text-gray-600">Copyright (c) 2025 Ostsee-Tiere WebApp Contributors

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
							href="https://github.com/jansinger/ostsee-sichtung"
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
						<div class="text-3xl">📦</div>
						<h3 class="card-title">Verwendete Technologien</h3>
					</div>
					<p class="mb-4 text-sm text-gray-700">
						Diese Plattform baut auf bewährten Open Source Technologien auf:
					</p>
					<div class="space-y-2 text-xs">
						<div class="flex items-center justify-between rounded bg-gray-50 p-2">
							<span class="font-medium">SvelteKit</span>
							<span class="badge badge-sm">MIT</span>
						</div>
						<div class="flex items-center justify-between rounded bg-gray-50 p-2">
							<span class="font-medium">TailwindCSS</span>
							<span class="badge badge-sm">MIT</span>
						</div>
						<div class="flex items-center justify-between rounded bg-gray-50 p-2">
							<span class="font-medium">DaisyUI</span>
							<span class="badge badge-sm">MIT</span>
						</div>
						<div class="flex items-center justify-between rounded bg-gray-50 p-2">
							<span class="font-medium">OpenLayers</span>
							<span class="badge badge-sm">BSD-2</span>
						</div>
						<div class="flex items-center justify-between rounded bg-gray-50 p-2">
							<span class="font-medium">PostgreSQL</span>
							<span class="badge badge-sm">PostgreSQL</span>
						</div>
						<div class="flex items-center justify-between rounded bg-gray-50 p-2">
							<span class="font-medium">Drizzle ORM</span>
							<span class="badge badge-sm">Apache-2.0</span>
						</div>
					</div>
					<p class="mt-3 text-xs text-gray-500">
						Alle verwendeten Bibliotheken sind sorgfältig ausgewählt und lizenzkonform eingesetzt.
					</p>
				</div>
			</div>
		</div>

		<!-- Contribution & Issues -->
		<div
			class="border-purple/10 mt-8 rounded-lg border bg-gradient-to-r from-purple-50 to-indigo-50 p-6"
		>
			<div class="flex items-start gap-4">
				<div class="text-2xl">🐛</div>
				<div class="flex-1">
					<h4 class="mb-2 font-semibold">Fehler gefunden oder Verbesserungsvorschlag?</h4>
					<p class="mb-3 text-sm text-gray-700">
						Wir freuen uns über Ihr Feedback! Die Ostsee-Tiere Plattform wird kontinuierlich
						weiterentwickelt. Ihre Hinweise helfen uns dabei, die Plattform zu verbessern.
					</p>
					<div class="flex flex-wrap gap-3">
						<a
							href="https://github.com/jansinger/ostsee-sichtung/issues/new"
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
							href="https://github.com/jansinger/ostsee-sichtung/issues"
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
			<h4 class="mb-3 font-semibold">🙏 Danksagung</h4>
			<p class="mb-4 text-sm text-gray-700">
				Wir danken allen Entwicklern und Organisationen, die durch ihre Open Source Projekte diese
				Plattform ermöglichen. Besonderer Dank gilt:
			</p>
			<div class="flex flex-wrap justify-center gap-4 text-sm">
				<a
					href="https://svelte.dev"
					target="_blank"
					rel="noopener noreferrer"
					class="link link-hover">Svelte Team</a
				>
				<span class="opacity-30">•</span>
				<a
					href="https://tailwindcss.com"
					target="_blank"
					rel="noopener noreferrer"
					class="link link-hover">Tailwind Labs</a
				>
				<span class="opacity-30">•</span>
				<a
					href="https://openlayers.org"
					target="_blank"
					rel="noopener noreferrer"
					class="link link-hover">OpenLayers Contributors</a
				>
				<span class="opacity-30">•</span>
				<a
					href="https://auth0.com"
					target="_blank"
					rel="noopener noreferrer"
					class="link link-hover">Auth0</a
				>
				<span class="opacity-30">•</span>
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
	<div class="bg-primary/5 border-primary/10 rounded-lg border p-8 text-center">
		<h2 class="mb-4 text-3xl font-bold">🌊 Werden Sie Teil der Bewegung</h2>
		<p class="mx-auto mb-6 max-w-2xl text-gray-700">
			Jede Sichtung zählt! Helfen Sie uns dabei, die Geheimnisse der Ostsee zu entschlüsseln und
			ihre einzigartigen Bewohner zu schützen.
		</p>
		<div class="flex flex-wrap justify-center gap-4">
			<a href="/" class="btn btn-primary btn-lg"> 🐋 Sichtung melden </a>
			<a href="/map" class="btn btn-outline btn-lg"> 🗺️ Karte erkunden </a>
			<a href="/docs" class="btn btn-ghost btn-lg"> 📚 Mehr erfahren </a>
		</div>
	</div>

	<!-- Contact Section -->
	<div class="mt-12 text-center text-sm text-gray-500">
		<p class="mb-2">Bei Fragen oder Anregungen stehen wir Ihnen gerne zur Verfügung.</p>
		<div class="flex items-center justify-center gap-4">
			<span>© 2025 Deutsches Meeresmuseum</span>
			<span>•</span>
			<span>Stralsund, Deutschland</span>
		</div>
	</div>
</div>
