<script lang="ts">
	import { onMount } from 'svelte';
	
	let openApiSpec = $state<string | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	
	onMount(async () => {
		try {
			const response = await fetch('/openapi.yml');
			if (!response.ok) {
				throw new Error('OpenAPI Spec konnte nicht geladen werden');
			}
			
			const yamlText = await response.text();
			// Simple YAML parsing for display (not full YAML parser)
			// This is just for fallback display purposes
			openApiSpec = yamlText;
			isLoading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unbekannter Fehler';
			isLoading = false;
		}
	});
</script>

<svelte:head>
	<title>API-Dokumentation (Fallback) - Ostsee-Tiere</title>
	<meta name="description" content="Fallback-Ansicht der OpenAPI-Dokumentation für die Ostsee-Tiere API" />
</svelte:head>

<div class="mx-auto max-w-6xl p-4">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-4">📄 API-Dokumentation (Fallback)</h1>
		<p class="text-gray-600 mb-4">
			Diese vereinfachte Ansicht zeigt die OpenAPI-Spezifikation an, falls die interaktive Dokumentation nicht geladen werden kann.
		</p>
		
		<div class="flex gap-4 mb-6">
			<a href="/docs/api" class="btn btn-primary">
				🔄 Interaktive Docs versuchen
			</a>
			<a href="/openapi.yml" download="ostsee-tiere-api.yml" class="btn btn-outline">
				📥 YAML herunterladen
			</a>
			<a href="/docs" class="btn btn-ghost">
				📚 Docs-Übersicht
			</a>
		</div>
	</div>

	{#if isLoading}
		<div class="text-center py-8">
			<div class="loading loading-spinner loading-lg"></div>
			<p class="mt-4">OpenAPI-Spezifikation wird geladen...</p>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<span>Fehler beim Laden der API-Spezifikation: {error}</span>
		</div>
	{:else if openApiSpec}
		<!-- Quick API Overview -->
		<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-lg">🔍 Sichtungen</h2>
					<div class="text-sm space-y-1">
						<div><code class="text-green-600">GET</code> /sightings - Öffentliche Sichtungen</div>
						<div><code class="text-blue-600">POST</code> /sightings - Neue Sichtung</div>
						<div><code class="text-green-600">GET</code> /sightings/{'{id}'} - Einzelne Sichtung</div>
						<div><code class="text-orange-600">PUT</code> /sightings/{'{id}'} - Sichtung ändern</div>
						<div><code class="text-red-600">DELETE</code> /sightings/{'{id}'} - Sichtung löschen</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-lg">🔐 Authentifizierung</h2>
					<div class="text-sm space-y-1">
						<div><code class="text-green-600">GET</code> /auth/login - Login starten</div>
						<div><code class="text-green-600">GET</code> /auth/logout - Logout</div>
						<div><code class="text-green-600">GET</code> /auth/callback - Auth0 Callback</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-lg">📁 Dateien</h2>
					<div class="text-sm space-y-1">
						<div><code class="text-blue-600">POST</code> /files/upload - Datei hochladen</div>
						<div><code class="text-red-600">DELETE</code> /files/delete - Datei löschen</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-lg">📊 Export</h2>
					<div class="text-sm space-y-1">
						<div><code class="text-green-600">GET</code> /sightings/export/json - JSON Export</div>
						<div><code class="text-green-600">GET</code> /sightings/export/csv - CSV Export</div>
						<div><code class="text-green-600">GET</code> /sightings/export/xml - XML Export</div>
						<div><code class="text-green-600">GET</code> /sightings/export/kml - KML Export</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-lg">⚙️ Admin</h2>
					<div class="text-sm space-y-1">
						<div><code class="text-blue-600">POST</code> /sightings/{'{id}'}/approve - Genehmigen</div>
						<div><code class="text-blue-600">POST</code> /sightings/{'{id}'}/verify - Verifizieren</div>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-lg">🌍 Geo</h2>
					<div class="text-sm space-y-1">
						<div><code class="text-green-600">GET</code> /geo/inBaltic - Ostsee-Prüfung</div>
						<div><code class="text-green-600">GET</code> /map/sightings - Kartendaten</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Authentication Info -->
		<div class="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
			<h2 class="text-xl font-semibold mb-4">🔐 Authentifizierung</h2>
			<div class="grid md:grid-cols-2 gap-6">
				<div>
					<h3 class="font-medium mb-2">Öffentliche Endpunkte</h3>
					<ul class="text-sm space-y-1">
						<li>• Sichtungen abrufen und melden</li>
						<li>• Dateien hochladen</li>
						<li>• Geografische Validierung</li>
						<li>• Kartendaten abrufen</li>
					</ul>
				</div>
				<div>
					<h3 class="font-medium mb-2">Admin-Endpunkte (Auth0)</h3>
					<ul class="text-sm space-y-1">
						<li>• Sichtungen verwalten</li>
						<li>• Datenexport</li>
						<li>• Genehmigung/Verifizierung</li>
						<li>• Einzelne Sichtung abrufen</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Raw OpenAPI Spec -->
		<div class="mb-8">
			<h2 class="text-xl font-semibold mb-4">📋 OpenAPI-Spezifikation (Raw)</h2>
			<details class="collapse bg-base-200">
				<summary class="collapse-title text-lg font-medium cursor-pointer">
					YAML-Inhalt anzeigen
				</summary>
				<div class="collapse-content">
					<pre class="text-xs overflow-auto max-h-96 bg-gray-50 p-4 rounded border"><code>{openApiSpec}</code></pre>
				</div>
			</details>
		</div>

		<!-- Alternative Tools -->
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
			<h2 class="text-xl font-semibold mb-4">🔧 Alternative Tools</h2>
			<p class="text-sm text-gray-600 mb-4">
				Sie können die OpenAPI-Spezifikation in diesen Tools verwenden:
			</p>
			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
				<div class="bg-white p-4 rounded border">
					<h3 class="font-medium mb-2">Postman</h3>
					<p class="text-xs text-gray-600">Importieren Sie die YAML-Datei für API-Tests</p>
				</div>
				<div class="bg-white p-4 rounded border">
					<h3 class="font-medium mb-2">Insomnia</h3>
					<p class="text-xs text-gray-600">Laden Sie die Spezifikation für REST-Tests</p>
				</div>
				<div class="bg-white p-4 rounded border">
					<h3 class="font-medium mb-2">Swagger Editor</h3>
					<p class="text-xs text-gray-600">Online-Editor für OpenAPI-Specs</p>
				</div>
			</div>
		</div>
	{/if}
</div>