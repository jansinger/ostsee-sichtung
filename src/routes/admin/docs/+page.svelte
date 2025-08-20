<script lang="ts">
	import ApiDocumentation from '$lib/components/docs/ApiDocumentation.svelte';
</script>

<svelte:head>
	<title>API-Dokumentation - Admin - Ostsee-Tiere</title>
	<meta name="description" content="Admin-Bereich: Umfassende OpenAPI-Dokumentation für die Ostsee-Tiere API mit interaktiver Schnittstelle" />
	<meta name="keywords" content="Admin, API, OpenAPI, Scalar, Ostsee, Meerestiere, Sichtungen, REST" />
	
	<!-- Open Graph -->
	<meta property="og:title" content="Admin: Ostsee-Tiere API Dokumentation" />
	<meta property="og:description" content="Interaktive API-Dokumentation für Administratoren - Meldung und Verwaltung von Meerestier-Sichtungen" />
	<meta property="og:type" content="website" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Admin: Ostsee-Tiere API Dokumentation" />
	<meta name="twitter:description" content="Interaktive API-Dokumentation für Administratoren - Meldung und Verwaltung von Meerestier-Sichtungen" />
</svelte:head>

<!-- Admin-spezifische API-Dokumentation -->
<ApiDocumentation
	title="Admin API-Dokumentation" 
	description="Umfassende OpenAPI-Dokumentation für Administratoren. Hier finden Sie alle verfügbaren Endpunkte, Schemas und können die API direkt testen. Als angemeldeter Admin haben Sie Zugriff auf erweiterte Funktionen wie Sichtungsverwaltung, Datenexport und Benutzerstatistiken."
	showQuickStart={true}
	showDownloadButton={true} 
	showNavButtons={true}
	containerClass="mx-auto max-w-full"
/>

<!-- Admin-spezifische Ergänzungen -->
<div class="mx-auto max-w-full mt-8">
	<!-- Admin-Hinweise -->
	<div class="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-8">
		<h2 class="text-xl font-semibold mb-4 text-primary">
			🔑 Admin-Bereich Hinweise
		</h2>
		<div class="grid md:grid-cols-2 gap-6">
			<div>
				<h3 class="text-lg font-medium mb-2">Erweiterte Funktionen</h3>
				<p class="text-sm text-gray-600 mb-3">
					Als angemeldeter Administrator haben Sie Zugriff auf zusätzliche Endpunkte:
				</p>
				<ul class="text-sm space-y-1">
					<li>• <code class="bg-gray-100 px-1 rounded">GET /admin/sightings</code> - Alle Sichtungen verwalten</li>
					<li>• <code class="bg-gray-100 px-1 rounded">PUT /admin/sightings/{'{id}'}</code> - Sichtungen bearbeiten</li>
					<li>• <code class="bg-gray-100 px-1 rounded">DELETE /admin/sightings/{'{id}'}</code> - Sichtungen löschen</li>
					<li>• <code class="bg-gray-100 px-1 rounded">GET /admin/export</code> - Datenexport (CSV, XML, KML)</li>
					<li>• <code class="bg-gray-100 px-1 rounded">GET /admin/statistics</code> - Detaillierte Statistiken</li>
				</ul>
			</div>
			<div>
				<h3 class="text-lg font-medium mb-2">⚠️ Sicherheitshinweise</h3>
				<div class="bg-warning/10 border border-warning/20 rounded p-4">
					<ul class="text-sm space-y-2">
						<li class="flex items-start gap-2">
							<span class="text-warning font-bold">•</span>
							<span>API-Schlüssel und Tokens niemals in Client-Code verwenden</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-warning font-bold">•</span>
							<span>Alle Admin-Aktionen werden protokolliert</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-warning font-bold">•</span>
							<span>Bei verdächtigen Aktivitäten wird die Session beendet</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-warning font-bold">•</span>
							<span>Lösch-Operationen können nicht rückgängig gemacht werden</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>

	<!-- Admin Tools -->
	<div class="bg-base-200 rounded-lg p-6">
		<h2 class="text-xl font-semibold mb-4">🛠️ Admin-Tools</h2>
		<div class="grid md:grid-cols-3 gap-4">
			<div class="text-center">
				<a href="/admin" class="btn btn-primary btn-wide">
					📊<br />
					<span class="text-sm">Dashboard</span>
				</a>
				<p class="text-xs text-gray-500 mt-2">Übersicht und Statistiken</p>
			</div>
			<div class="text-center">
				<a href="/admin/map" class="btn btn-secondary btn-wide">
					🗺️<br />
					<span class="text-sm">Admin-Karte</span>
				</a>
				<p class="text-xs text-gray-500 mt-2">Geografische Verwaltung</p>
			</div>
			<div class="text-center">
				<a href="/docs/api" class="btn btn-outline btn-wide">
					📖<br />
					<span class="text-sm">Öffentliche Docs</span>
				</a>
				<p class="text-xs text-gray-500 mt-2">Für Entwickler</p>
			</div>
		</div>
	</div>
</div>