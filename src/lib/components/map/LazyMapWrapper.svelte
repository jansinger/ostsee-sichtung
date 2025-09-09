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

	function loadMapComponent() {
		if (MapComponent !== null) return; // Already loaded
		
		isLoading = true;
		loadError = null;
		
		// SSR-Schutz: nur im Browser laden
		if (typeof window !== 'undefined') {
			import('./SightingsMapView.svelte')
				.then((module) => {
					MapComponent = module.default;
					isLoading = false;
				})
				.catch(() => {
					loadError = 'Karte konnte nicht geladen werden. Bitte versuchen Sie es erneut.';
					isLoading = false;
				});
		} else {
			// In SSR, keep loading state until we're in the browser
			// This will be fixed when the effect runs in the browser
		}
	}

	// Use $effect for lazy loading the map component
	$effect(() => {
		if (MapComponent === null) {
			loadMapComponent();
		}
	});
</script>

<!-- Use LoadingOverlay for better UX -->
<LoadingOverlay isVisible={isLoading} type="initial" />

{#if loadError}
	<div class={containerClass}>
		<div class="flex h-full flex-col items-center justify-center gap-4">
			<div class="alert alert-error" role="alert">{loadError}</div>
			<button
				type="button"
				class="btn btn-primary"
				onclick={loadMapComponent}
				aria-label="Karte neu laden"
			>
				Neu laden
			</button>
		</div>
	</div>
{:else if MapComponent}
	<MapComponent {mapContainerId} {showTitle} {title} {showLogo} {containerClass} {titleClass} />
{:else if !isLoading}
	<!-- Fallback wenn kein MapComponent aber auch nicht loading -->
	<div class={containerClass}>
		<div class="flex h-full flex-col items-center justify-center gap-4">
			<div class="alert alert-warning" role="alert">
				Karte konnte nicht geladen werden.
			</div>
			<button
				type="button"
				class="btn btn-primary"
				onclick={loadMapComponent}
				aria-label="Karte neu laden"
			>
				Neu laden
			</button>
		</div>
	</div>
{/if}
