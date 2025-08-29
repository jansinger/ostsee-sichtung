<script lang="ts">
	import { createLogger } from '$lib/logger';
	import { browser } from '$app/environment';

	const logger = createLogger('docs:api:direct');

	let scalarContainer: HTMLDivElement | undefined;
	let isLoading = $state(true);
	let hasError = $state(false);
	let errorMessage = $state('');

	// Modern $effect for Scalar initialization
	$effect(() => {
		if (browser && scalarContainer) {
			(async () => {
				try {
					// Import Scalar dynamically to avoid SSR issues
					const { ApiReference } = await import('@scalar/api-reference');
					
					// Initialize Scalar directly without iframe
					const configuration = {
						spec: {
							url: '/openapi.yml'
						},
						layout: 'modern' as const,
						theme: 'default' as const,
						showSidebar: true,
						searchHotKey: 'k' as const,
						customCss: `
							.scalar-app {
								font-family: 'Roboto', system-ui, sans-serif;
								border: 1px solid #e5e7eb;
								border-radius: 0.5rem;
							}
						`
					};

					// Mount Scalar API Reference - use new operator
					new ApiReference(scalarContainer, configuration);
					isLoading = false;

				} catch (error: unknown) {
					logger.error({ error: error instanceof Error ? error.message : error }, 'Failed to load Scalar API Reference');
					hasError = true;
					errorMessage = (error instanceof Error ? error.message : 'Unknown error') || 'Scalar API-Dokumentation konnte nicht geladen werden';
					isLoading = false;
				}
			})();
		}
	});
</script>

<svelte:head>
	<title>API-Dokumentation (Direkt) - Ostsee-Tiere</title>
	<meta name="description" content="Direkte Scalar API-Dokumentation ohne iframe" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 text-center">
		<h1 class="mb-4 text-4xl font-bold">API-Dokumentation (Direkt)</h1>
		<p class="text-lg text-gray-600 max-w-3xl mx-auto">
			Direkte Integration der Scalar API-Dokumentation ohne iframe
		</p>
		
		<div class="mt-6 flex justify-center gap-4">
			<a href="/docs/api" class="btn btn-ghost">← Zurück zur Standard-Dokumentation</a>
			<a href="/openapi.yml" download="ostsee-tiere-api.yml" class="btn btn-outline btn-primary">
				📄 OpenAPI Spec herunterladen
			</a>
		</div>
	</div>

	{#if isLoading}
		<div class="text-center py-8">
			<div class="loading loading-spinner loading-lg"></div>
			<p class="mt-4 text-gray-500">Scalar API-Dokumentation wird geladen...</p>
		</div>
	{:else if hasError}
		<div class="alert alert-error">
			<div>
				<span>{errorMessage}</span>
				<div class="mt-4 flex gap-2">
					<a href="/docs/api/fallback" class="btn btn-sm btn-primary">
						📄 Fallback-Dokumentation
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
		<!-- Scalar API Reference Container -->
		<div 
			bind:this={scalarContainer} 
			class="w-full min-h-screen border-0"
		></div>
	{/if}
</div>