<script lang="ts">
	// Documentation overview page
</script>

<svelte:head>
	<title>Dokumentation - Ostsee-Tiere</title>
	<meta name="description" content="Übersicht über die verfügbare Dokumentation der Ostsee-Tiere Plattform" />
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="text-center mb-8">
		<h1 class="text-4xl font-bold mb-4">📚 Dokumentation</h1>
		<p class="text-lg text-gray-600">
			Willkommen zur Dokumentation der Ostsee-Tiere Plattform
		</p>
	</div>

	<div class="grid md:grid-cols-2 gap-6">
		<!-- API Documentation Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">
					🔌 API-Dokumentation
					<div class="badge badge-primary">Interactive</div>
				</h2>
				<p class="text-sm text-gray-600">
					Umfassende OpenAPI-Dokumentation mit interaktiver Schnittstelle. 
					Testen Sie alle Endpunkte direkt im Browser.
				</p>
				<div class="mt-4">
					<h3 class="font-semibold text-sm mb-2">Verfügbare APIs:</h3>
					<ul class="text-xs space-y-1 text-gray-600">
						<li>• Sichtungen verwalten</li>
						<li>• Dateien hochladen</li>
						<li>• Datenexport (CSV, JSON, XML, KML)</li>
						<li>• Authentifizierung</li>
						<li>• Geografische Validierung</li>
					</ul>
				</div>
				<div class="card-actions justify-end mt-4">
					<a href="/docs/api" class="btn btn-primary">
						API-Docs öffnen
					</a>
				</div>
			</div>
		</div>

		<!-- Getting Started Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">
					🚀 Erste Schritte
					<div class="badge badge-secondary">Guide</div>
				</h2>
				<p class="text-sm text-gray-600">
					Schnelleinstieg für Entwickler und API-Nutzer.
				</p>
				<div class="mt-4">
					<h3 class="font-semibold text-sm mb-2">Öffentliche Endpunkte:</h3>
					<div class="space-y-2">
						<div class="bg-gray-50 p-2 rounded text-xs">
							<code class="text-blue-600">GET /api/sightings</code>
							<span class="text-gray-500 ml-2">Öffentliche Sichtungen</span>
						</div>
						<div class="bg-gray-50 p-2 rounded text-xs">
							<code class="text-blue-600">POST /api/sightings</code>
							<span class="text-gray-500 ml-2">Neue Sichtung melden</span>
						</div>
						<div class="bg-gray-50 p-2 rounded text-xs">
							<code class="text-blue-600">POST /api/files/upload</code>
							<span class="text-gray-500 ml-2">Dateien hochladen</span>
						</div>
					</div>
				</div>
				<div class="card-actions justify-end mt-4">
					<a href="/docs/api#getting-started" class="btn btn-outline">
						Loslegen
					</a>
				</div>
			</div>
		</div>

		<!-- Download Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">
					📄 OpenAPI Spezifikation
					<div class="badge badge-accent">Download</div>
				</h2>
				<p class="text-sm text-gray-600">
					Laden Sie die vollständige OpenAPI-Spezifikation herunter für die Verwendung 
					in Tools wie Postman, Insomnia oder zur Code-Generierung.
				</p>
				<div class="mt-4">
					<h3 class="font-semibold text-sm mb-2">Formate:</h3>
					<ul class="text-xs space-y-1 text-gray-600">
						<li>• YAML (empfohlen)</li>
						<li>• JSON (über API)</li>
						<li>• Code-Generierung unterstützt</li>
					</ul>
				</div>
				<div class="card-actions justify-end mt-4">
					<a 
						href="/openapi.yml" 
						download="ostsee-tiere-api.yml"
						class="btn btn-accent"
					>
						YAML herunterladen
					</a>
				</div>
			</div>
		</div>

		<!-- Authentication Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">
					🔐 Authentifizierung
					<div class="badge badge-warning">Admin</div>
				</h2>
				<p class="text-sm text-gray-600">
					Für Admin-Funktionen ist eine Authentifizierung über Auth0 erforderlich.
				</p>
				<div class="mt-4">
					<h3 class="font-semibold text-sm mb-2">Authentifizierungs-Flow:</h3>
					<ol class="text-xs space-y-1 text-gray-600 list-decimal list-inside">
						<li>Login-Endpunkt aufrufen</li>
						<li>Auth0-Flow durchlaufen</li>
						<li>Session-Cookie wird gesetzt</li>
						<li>Admin-Endpunkte verfügbar</li>
					</ol>
				</div>
				<div class="card-actions justify-end mt-4">
					<a href="/docs/api#authentication" class="btn btn-outline btn-warning">
						Details anzeigen
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Quick Links Section -->
	<div class="mt-12 bg-base-200 rounded-lg p-6">
		<h2 class="text-2xl font-semibold mb-4">🔗 Schnellzugriff</h2>
		<div class="grid md:grid-cols-3 gap-4">
			<div class="text-center">
				<a href="/map" class="btn btn-ghost btn-lg w-full">
					🗺️<br/>
					<span class="text-sm">Karte anzeigen</span>
				</a>
			</div>
			<div class="text-center">
				<a href="/" class="btn btn-ghost btn-lg w-full">
					📝<br/>
					<span class="text-sm">Sichtung melden</span>
				</a>
			</div>
			<div class="text-center">
				<a href="/admin" class="btn btn-ghost btn-lg w-full">
					⚙️<br/>
					<span class="text-sm">Admin-Bereich</span>
				</a>
			</div>
		</div>
	</div>

	<!-- Project Information -->
	<div class="mt-8 text-center text-sm text-gray-500">
		<p>
			Die Ostsee-Tiere Plattform ermöglicht es Bürgern, Forschern und Naturbeobachtern, 
			ihre Sichtungen von Walen, Robben und anderen Meerestieren zu melden.
		</p>
		<div class="mt-4 flex justify-center gap-4">
			<span class="badge badge-outline">SvelteKit</span>
			<span class="badge badge-outline">OpenAPI 3.0</span>
			<span class="badge badge-outline">PostGIS</span>
			<span class="badge badge-outline">Auth0</span>
		</div>
	</div>
</div>