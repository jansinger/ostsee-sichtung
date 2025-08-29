<script lang="ts">
	import { browser } from '$app/environment';

	// Props
	let {
		title = 'API-Dokumentation',
		description = 'Umfassende OpenAPI-Dokumentation für die Ostsee-Tiere Plattform. Hier finden Sie alle verfügbaren Endpunkte, Schemas und können die API direkt testen.',
		showQuickStart = true,
		showDownloadButton = true,
		showNavButtons = true,
		containerClass = 'mx-auto max-w-full'
	} = $props<{
		title?: string;
		description?: string;
		showQuickStart?: boolean;
		showDownloadButton?: boolean;
		showNavButtons?: boolean;
		containerClass?: string;
	}>();

	let isLoading = $state(true);
	let hasError = $state(false);
	let errorMessage = $state('');

	// Modern $effect for API spec verification
	$effect(() => {
		if (browser) {
			(async () => {
				try {
					// Verify OpenAPI spec is available
					const response = await fetch('/openapi.yml');
					if (!response.ok) {
						throw new Error('OpenAPI Spec konnte nicht geladen werden');
					}

					// Set loading to false after verification
					isLoading = false;

				} catch (error) {
					console.error('Failed to load API documentation:', error);
					hasError = true;
					errorMessage = error instanceof Error ? error.message : 'API-Dokumentation konnte nicht geladen werden';
					isLoading = false;
				}
			})();
		}
	});
</script>

<div class={containerClass}>
	<!-- Header Section -->
	<div class="mb-8 text-center">
		<h1 class="mb-4 text-4xl font-bold text-gray-900">{title}</h1>
		<p class="text-lg text-gray-600 max-w-3xl mx-auto">
			{description}
		</p>
		
		{#if showNavButtons}
			<div class="mt-6 flex flex-wrap justify-center gap-4">
				{#if showDownloadButton}
					<a 
						href="/openapi.yml" 
						download="ostsee-tiere-api.yml"
						class="btn btn-outline btn-primary"
					>
						📄 OpenAPI Spec herunterladen
					</a>
				{/if}
				<a 
					href="#authentication" 
					class="btn btn-ghost"
				>
					🔐 Authentifizierung
				</a>
				<a 
					href="#getting-started" 
					class="btn btn-ghost"
				>
					🚀 Erste Schritte
				</a>
			</div>
		{/if}
	</div>

	<!-- Quick Start Guide -->
	{#if showQuickStart}
		<div class="mb-8 bg-base-200 rounded-lg p-6">
			<h2 id="getting-started" class="text-2xl font-semibold mb-4">🚀 Erste Schritte</h2>
			<div class="grid md:grid-cols-2 gap-6">
				<div>
					<h3 class="text-lg font-medium mb-2">Öffentliche Endpunkte</h3>
					<p class="text-sm text-gray-600 mb-3">
						Einige Endpunkte sind öffentlich verfügbar und benötigen keine Authentifizierung:
					</p>
					<ul class="text-sm space-y-1">
						<li>• <code class="bg-gray-100 px-1 rounded">GET /sightings</code> - Öffentliche Sichtungen</li>
						<li>• <code class="bg-gray-100 px-1 rounded">POST /sightings</code> - Neue Sichtung melden</li>
						<li>• <code class="bg-gray-100 px-1 rounded">GET /geo/inBaltic</code> - Koordinaten prüfen</li>
						<li>• <code class="bg-gray-100 px-1 rounded">POST /files/upload</code> - Dateien hochladen</li>
						<li>• <code class="bg-gray-100 px-1 rounded">GET /media/{'{path}'}</code> - Sichere Medien abrufen</li>
					</ul>
				</div>
				<div>
					<h3 id="authentication" class="text-lg font-medium mb-2">🔐 Admin-Authentifizierung</h3>
					<p class="text-sm text-gray-600 mb-3">
						Für Admin-Funktionen ist eine Anmeldung erforderlich:
					</p>
					<ol class="text-sm space-y-1">
						<li>1. <code class="bg-gray-100 px-1 rounded">GET /auth/login</code> aufrufen</li>
						<li>2. Auth0-Login-Flow durchlaufen</li>
						<li>3. Session-Cookie wird automatisch gesetzt</li>
						<li>4. Admin-Endpunkte sind nun verfügbar</li>
					</ol>
				</div>
			</div>
		</div>
	{/if}

	<!-- API Reference Container -->
	{#if isLoading}
		<div class="text-center py-8 text-gray-500">
			<div class="loading loading-spinner loading-lg"></div>
			<p class="mt-4">API-Dokumentation wird geladen...</p>
			<p class="text-sm mt-2">Falls die Dokumentation nicht lädt, versuchen Sie die Seite neu zu laden.</p>
		</div>
	{:else if hasError}
		<div class="alert alert-error">
			<div>
				<span>{errorMessage}</span>
				<div class="mt-4 flex gap-2">
					<a href="/docs/api/fallback" class="btn btn-sm btn-primary">
						📄 Fallback-Dokumentation anzeigen
					</a>
					<a href="/openapi.yml" download="ostsee-tiere-api.yml" class="btn btn-sm btn-outline">
						📥 OpenAPI Spec herunterladen
					</a>
					<button 
						class="btn btn-sm btn-ghost" 
						onclick={() => window.location.reload()}
					>
						🔄 Neu laden
					</button>
				</div>
			</div>
		</div>
	{:else}
		<!-- Scalar API Reference iframe -->
		<div class="scalar-container">
			<iframe 
				src="/docs/api/scalar" 
				title="Scalar API Documentation"
				class="w-full h-full border-0"
				style="min-height: 100vh;"
				loading="lazy"
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation allow-pointer-lock"
				allow="fullscreen"
				onload={() => console.log('Scalar API documentation loaded successfully')}
				onerror={() => {
					console.error('Failed to load Scalar API documentation');
					hasError = true;
					errorMessage = 'Scalar API-Dokumentation konnte nicht geladen werden';
				}}
			></iframe>
		</div>
		
		<!-- Fallback notice -->
		<div class="mt-4 text-center">
			<p class="text-sm text-gray-500">
				Falls die interaktive Dokumentation nicht funktioniert, nutzen Sie die 
				<a href="/docs/api/direct" class="link link-primary">Direkte Dokumentation</a>, 
				<a href="/docs/api/fallback" class="link link-primary">Fallback-Dokumentation</a>
				oder laden Sie die 
				<a href="/openapi.yml" download="ostsee-tiere-api.yml" class="link link-primary">OpenAPI-Spec</a> 
				direkt herunter.
			</p>
		</div>
	{/if}
</div>

<style>
	/* Ensure full width for Scalar container */
	.scalar-container {
		width: 100%;
		min-height: 100vh;
		position: relative;
	}
	
	/* Custom scrollbar for better UX */
	:global(*::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}
	
	:global(*::-webkit-scrollbar-track) {
		background: #f1f1f1;
		border-radius: 4px;
	}
	
	:global(*::-webkit-scrollbar-thumb) {
		background: #c1c1c1;
		border-radius: 4px;
	}
	
	:global(*::-webkit-scrollbar-thumb:hover) {
		background: #a8a8a8;
	}
</style>