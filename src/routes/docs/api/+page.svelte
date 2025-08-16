<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let isLoading = $state(true);
	let hasError = $state(false);
	let errorMessage = $state('');

	onMount(async () => {
		if (browser) {
			try {
				// Try to load and initialize Scalar
				const response = await fetch('/openapi.yml');
				if (!response.ok) {
					throw new Error('OpenAPI Spec konnte nicht geladen werden');
				}

				// Add Scalar via script tag approach to avoid DOM manipulation issues
				const script = document.createElement('script');
				script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.min.js';
				script.onload = () => {
					// @ts-expect-error - Scalar global will be available after script load
					if (typeof window.ApiReference !== 'undefined') {
						try {
							const container = document.getElementById('scalar-api-reference');
							if (container) {
								// @ts-expect-error - Scalar global will be available after script load
								window.ApiReference(container, {
									spec: { url: '/openapi.yml' },
									theme: 'default'
								});
								isLoading = false;
							}
						} catch (err) {
							console.error('Scalar initialization failed:', err);
							hasError = true;
							errorMessage = 'API-Dokumentation konnte nicht initialisiert werden';
							isLoading = false;
						}
					}
				};
				script.onerror = () => {
					hasError = true;
					errorMessage = 'Scalar konnte nicht geladen werden';
					isLoading = false;
				};
				document.head.appendChild(script);

				// Add CSS
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.min.css';
				document.head.appendChild(link);

			} catch (error) {
				console.error('Failed to load OpenAPI spec:', error);
				hasError = true;
				errorMessage = 'OpenAPI-Spezifikation konnte nicht geladen werden';
				isLoading = false;
			}
		}
	});
</script>

<svelte:head>
	<title>API-Dokumentation - Ostsee-Tiere</title>
	<meta name="description" content="Umfassende OpenAPI-Dokumentation für die Ostsee-Tiere API mit interaktiver Schnittstelle" />
	<meta name="keywords" content="API, OpenAPI, Swagger, Ostsee, Meerestiere, Sichtungen, REST" />
	
	<!-- Open Graph -->
	<meta property="og:title" content="Ostsee-Tiere API Dokumentation" />
	<meta property="og:description" content="Interaktive API-Dokumentation für die Meldung und Verwaltung von Meerestier-Sichtungen" />
	<meta property="og:type" content="website" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Ostsee-Tiere API Dokumentation" />
	<meta name="twitter:description" content="Interaktive API-Dokumentation für die Meldung und Verwaltung von Meerestier-Sichtungen" />
</svelte:head>

<div class="mx-auto max-w-full">
	<!-- Header Section -->
	<div class="mb-8 text-center">
		<h1 class="mb-4 text-4xl font-bold text-gray-900">API-Dokumentation</h1>
		<p class="text-lg text-gray-600 max-w-3xl mx-auto">
			Umfassende OpenAPI-Dokumentation für die Ostsee-Tiere Plattform. 
			Hier finden Sie alle verfügbaren Endpunkte, Schemas und können die API direkt testen.
		</p>
		
		<div class="mt-6 flex flex-wrap justify-center gap-4">
			<a 
				href="/openapi.yml" 
				download="ostsee-tiere-api.yml"
				class="btn btn-outline btn-primary"
			>
				📄 OpenAPI Spec herunterladen
			</a>
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
	</div>

	<!-- Quick Start Guide -->
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
				<div class="mt-2">
					<a href="/openapi.yml" class="btn btn-sm btn-primary">OpenAPI Spec direkt anzeigen</a>
				</div>
			</div>
		</div>
	{:else}
		<div id="scalar-api-reference" class="w-full min-h-screen"></div>
	{/if}
</div>

<style>
	/* Ensure full width for Scalar */
	:global(.scalar-app) {
		width: 100% !important;
		max-width: none !important;
	}
	
	/* Custom scrollbar for better UX */
	:global(.scalar-app *::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}
	
	:global(.scalar-app *::-webkit-scrollbar-track) {
		background: #f1f1f1;
		border-radius: 4px;
	}
	
	:global(.scalar-app *::-webkit-scrollbar-thumb) {
		background: #c1c1c1;
		border-radius: 4px;
	}
	
	:global(.scalar-app *::-webkit-scrollbar-thumb:hover) {
		background: #a8a8a8;
	}
</style>