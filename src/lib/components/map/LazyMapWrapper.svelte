<script lang="ts">
	import type { Component } from 'svelte';
	import LoadingOverlay from './LoadingOverlay.svelte';

	// Props
	let {
		mapContainerId = 'map',
		showTitle = true,
		title = 'Sichtungskarte',
		showLogo = true,
		containerClass = 'relative h-screen w-screen overflow-hidden',
		titleClass = 'glass text-black text-sm absolute top-4 left-3 z-30 rounded-lg px-3 py-1.5 font-bold shadow-xl backdrop-blur-md flex items-center gap-2'
	} = $props<{
		mapContainerId?: string;
		showTitle?: boolean;
		title?: string;
		showLogo?: boolean;
		containerClass?: string;
		titleClass?: string;
	}>();

	let MapComponent: Component | null = $state(null);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	// Use $effect for lazy loading the map component
	$effect(() => {
		// Only load once when component mounts
		if (MapComponent === null && isLoading) {
			// SSR-Schutz: nur im Browser laden
			if (typeof window !== 'undefined') {
				import('./SightingsMapView.svelte')
					.then((module) => {
						MapComponent = module.default;
						isLoading = false;
					})
					.catch((err) => {
						console.error('Failed to load map component:', err);
						loadError = `Karte konnte nicht geladen werden: ${err.message || 'Unbekannter Fehler'}`;
						isLoading = false;
					});
			} else {
				isLoading = false;
			}
		}
	});
</script>

<!-- Use LoadingOverlay for better UX -->
<LoadingOverlay 
	isVisible={isLoading}
	type="initial"
	message="Kartenkomponente wird geladen..."
/>

{#if loadError}
	<div class={containerClass}>
		<div class="flex h-full items-center justify-center">
			<div class="alert alert-error max-w-md" role="alert">
				<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div>
					<h3 class="font-bold">Karte nicht verfügbar</h3>
					<div class="text-xs">{loadError}</div>
				</div>
				<button class="btn btn-sm" onclick={() => window.location.reload()}>
					Neu laden
				</button>
			</div>
		</div>
	</div>
{:else if MapComponent}
	<MapComponent {mapContainerId} {showTitle} {title} {showLogo} {containerClass} {titleClass} />
{/if}
