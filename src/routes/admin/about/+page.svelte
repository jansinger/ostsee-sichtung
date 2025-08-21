<svelte:head>
	<title>Über die Plattform - Admin - Ostsee-Tiere</title>
	<meta
		name="description"
		content="Technische Informationen und Details über die Ostsee-Tiere Plattform für Administratoren. Architektur, Technologien und Verwaltungstools."
	/>
	<meta
		name="keywords"
		content="Admin, Plattform, Architektur, Technologie, Verwaltung, Ostsee-Tiere, Dashboard"
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="Über die Plattform - Admin - Ostsee-Tiere" />
	<meta
		property="og:description"
		content="Technische Details und Verwaltungsinformationen für Administratoren"
	/>
	<meta property="og:type" content="website" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Über die Plattform - Admin - Ostsee-Tiere" />
	<meta
		name="twitter:description"
		content="Technische Details und Verwaltungsinformationen für Administratoren"
	/>
</svelte:head>

<div class="mx-auto max-w-6xl">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="mb-4 text-4xl font-bold">🏛️ Plattform-Übersicht</h1>
		<p class="text-lg text-gray-600">
			Technische Informationen und Verwaltungsdetails für Administratoren der Ostsee-Tiere
			Plattform.
		</p>
	</div>

	<!-- Quick Stats -->
	<div class="mb-12 grid gap-6 md:grid-cols-4">
		<div class="card bg-primary/5 border-primary/20 border">
			<div class="card-body text-center">
				<div class="mb-2 text-2xl">🐋</div>
				<div class="stat-title text-xs">Aktive Plattform</div>
				<div class="stat-value text-primary text-lg">Live</div>
			</div>
		</div>
		<div class="card bg-secondary/5 border-secondary/20 border">
			<div class="card-body text-center">
				<div class="mb-2 text-2xl">🗺️</div>
				<div class="stat-title text-xs">Kartenabdeckung</div>
				<div class="stat-value text-secondary text-lg">Ostsee</div>
			</div>
		</div>
		<div class="card bg-accent/5 border-accent/20 border">
			<div class="card-body text-center">
				<div class="mb-2 text-2xl">🔐</div>
				<div class="stat-title text-xs">Authentifizierung</div>
				<div class="stat-value text-accent text-lg">Auth0</div>
			</div>
		</div>
		<div class="card bg-info/5 border-info/20 border">
			<div class="card-body text-center">
				<div class="mb-2 text-2xl">📊</div>
				<div class="stat-title text-xs">API Version</div>
				<div class="stat-value text-info text-lg">v1</div>
			</div>
		</div>
	</div>

	<!-- Architecture Overview -->
	<div class="mb-12">
		<h2 class="mb-6 text-3xl font-bold">🏗️ Architektur-Übersicht</h2>
		<div class="grid gap-8 md:grid-cols-2">
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h3 class="card-title mb-4 text-xl">🖥️ Frontend</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="font-medium">Framework:</span>
							<span class="badge badge-primary">SvelteKit 5</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="font-medium">Styling:</span>
							<span class="badge badge-secondary">TailwindCSS + DaisyUI</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="font-medium">Karten:</span>
							<span class="badge badge-accent">OpenLayers</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="font-medium">Formulare:</span>
							<span class="badge badge-info">svelte-forms-lib + Yup</span>
						</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h3 class="card-title mb-4 text-xl">🗄️ Backend</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="font-medium">Datenbank:</span>
							<span class="badge badge-primary">PostgreSQL + PostGIS</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="font-medium">ORM:</span>
							<span class="badge badge-secondary">Drizzle</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="font-medium">API:</span>
							<span class="badge badge-accent">REST + OpenAPI 3.0</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="font-medium">Auth:</span>
							<span class="badge badge-info">Auth0</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Admin Functions -->
	<div class="mb-12">
		<h2 class="mb-6 text-3xl font-bold">⚙️ Admin-Funktionen</h2>
		<div class="grid gap-6 md:grid-cols-3">
			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h3 class="card-title text-lg">📋 Sichtungsverwaltung</h3>
					<ul class="space-y-1 text-sm text-gray-600">
						<li>• Sichtungen prüfen und genehmigen</li>
						<li>• Bearbeitungs- und Löschfunktionen</li>
						<li>• Verifizierungsstatus setzen</li>
						<li>• Interne Kommentare hinzufügen</li>
					</ul>
					<div class="card-actions mt-4">
						<a href="/admin" class="btn btn-outline btn-sm">Zur Verwaltung</a>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h3 class="card-title text-lg">🗺️ Kartenverwaltung</h3>
					<ul class="space-y-1 text-sm text-gray-600">
						<li>• Geografische Sichtungsverteilung</li>
						<li>• Interaktive Admin-Kartenansicht</li>
						<li>• Räumliche Datenanalyse</li>
						<li>• Hotspot-Identifikation</li>
					</ul>
					<div class="card-actions mt-4">
						<a href="/admin/map" class="btn btn-outline btn-sm">Karte öffnen</a>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h3 class="card-title text-lg">📊 Statistiken</h3>
					<ul class="space-y-1 text-sm text-gray-600">
						<li>• Detaillierte Auswertungen</li>
						<li>• Zeitreihenanalysen</li>
						<li>• Artenstatistiken</li>
						<li>• Benutzer-Aktivität</li>
					</ul>
					<div class="card-actions mt-4">
						<a href="/admin/statistics" class="btn btn-outline btn-sm">Statistiken anzeigen</a>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Data Export -->
	<div class="mb-12">
		<h2 class="mb-6 text-3xl font-bold">📤 Datenexport</h2>
		<div class="bg-base-200 rounded-lg p-6">
			<p class="mb-4 text-gray-700">
				Die Plattform unterstützt verschiedene Exportformate für Forschung und Analyse:
			</p>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<div class="bg-base-100 flex items-center gap-2 rounded p-3">
					<span class="font-mono text-sm text-green-600">JSON</span>
					<span class="text-xs text-gray-600">Strukturierte Daten</span>
				</div>
				<div class="bg-base-100 flex items-center gap-2 rounded p-3">
					<span class="font-mono text-sm text-blue-600">CSV</span>
					<span class="text-xs text-gray-600">Tabellenformat</span>
				</div>
				<div class="bg-base-100 flex items-center gap-2 rounded p-3">
					<span class="font-mono text-sm text-orange-600">XML</span>
					<span class="text-xs text-gray-600">Markup-Format</span>
				</div>
				<div class="bg-base-100 flex items-center gap-2 rounded p-3">
					<span class="font-mono text-sm text-purple-600">KML</span>
					<span class="text-xs text-gray-600">Geografische Daten</span>
				</div>
			</div>
		</div>
	</div>

	<!-- API Documentation -->
	<div class="mb-12">
		<h2 class="mb-6 text-3xl font-bold">🔌 API-Integration</h2>
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<div class="mb-4 flex items-start justify-between">
					<div>
						<h3 class="text-xl font-semibold">OpenAPI 3.0 Spezifikation</h3>
						<p class="text-gray-600">
							Vollständig dokumentierte REST-API mit interaktiver Dokumentation
						</p>
					</div>
					<div class="badge badge-success">Verfügbar</div>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<h4 class="mb-2 font-medium">Öffentliche Endpunkte:</h4>
						<ul class="space-y-1 text-sm text-gray-600">
							<li>
								• <code class="text-green-600">GET</code> /api/sightings - Öffentliche Sichtungen
							</li>
							<li>• <code class="text-blue-600">POST</code> /api/sightings - Neue Sichtung</li>
							<li>
								• <code class="text-green-600">GET</code> /api/geo/inBaltic - Baltic Sea Check
							</li>
						</ul>
					</div>
					<div>
						<h4 class="mb-2 font-medium">Admin-Endpunkte:</h4>
						<ul class="space-y-1 text-sm text-gray-600">
							<li>
								• <code class="text-orange-600">PUT</code> /api/sightings/{'{id}'} - Bearbeiten
							</li>
							<li>• <code class="text-red-600">DELETE</code> /api/sightings/{'{id}'} - Löschen</li>
							<li>
								• <code class="text-blue-600">POST</code> /api/sightings/{'{id}'}/approve -
								Genehmigen
							</li>
						</ul>
					</div>
				</div>
				<div class="card-actions mt-6 justify-end">
					<a href="/admin/docs" class="btn btn-primary">API-Dokumentation öffnen</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Security & Compliance -->
	<div class="mb-12">
		<h2 class="mb-6 text-3xl font-bold">🔐 Sicherheit & Compliance</h2>
		<div class="grid gap-6 md:grid-cols-2">
			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h3 class="card-title text-lg">🛡️ Sicherheitsfeatures</h3>
					<ul class="space-y-2 text-sm text-gray-600">
						<li class="flex items-center gap-2">
							<span class="text-green-500">✓</span>
							HTTPS mit SSL/TLS-Verschlüsselung
						</li>
						<li class="flex items-center gap-2">
							<span class="text-green-500">✓</span>
							Auth0 OAuth 2.0 Authentifizierung
						</li>
						<li class="flex items-center gap-2">
							<span class="text-green-500">✓</span>
							CSRF-Schutz
						</li>
						<li class="flex items-center gap-2">
							<span class="text-green-500">✓</span>
							Input-Validierung & Sanitization
						</li>
						<li class="flex items-center gap-2">
							<span class="text-green-500">✓</span>
							Content Security Policy (CSP)
						</li>
					</ul>
				</div>
			</div>

			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h3 class="card-title text-lg">📋 Compliance</h3>
					<ul class="space-y-2 text-sm text-gray-600">
						<li class="flex items-center gap-2">
							<span class="text-green-500">✓</span>
							DSGVO-konforme Datenverarbeitung
						</li>
						<li class="flex items-center gap-2">
							<span class="text-green-500">✓</span>
							Webzugänglichkeit (WCAG 2.1 AA)
						</li>
						<li class="flex items-center gap-2">
							<span class="text-green-500">✓</span>
							Mobile-responsive Design
						</li>
						<li class="flex items-center gap-2">
							<span class="text-green-500">✓</span>
							SEO-optimierte Struktur
						</li>
						<li class="flex items-center gap-2">
							<span class="text-green-500">✓</span>
							Progressive Web App (PWA) Ready
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>

	<!-- Contact & Support -->
	<div class="bg-base-200 rounded-lg p-8 text-center">
		<h2 class="mb-4 text-2xl font-bold">📞 Support & Kontakt</h2>
		<p class="mx-auto mb-6 max-w-2xl text-gray-700">
			Bei technischen Fragen oder Support-Anfragen steht Ihnen das Administratoren-Team des
			Deutschen Meeresmuseums zur Verfügung.
		</p>
		<div class="flex items-center justify-center gap-6 text-sm text-gray-600">
			<span>© 2025 Deutsches Meeresmuseum</span>
			<span>•</span>
			<span>Stralsund, Deutschland</span>
			<span>•</span>
			<span>Admin Dashboard v1.0</span>
		</div>
	</div>
</div>
