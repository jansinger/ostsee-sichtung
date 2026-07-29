<script lang="ts">
	import type { Component } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import LoadingOverlay from './LoadingOverlay.svelte';

	// Props
	let {
		mapContainerId = 'map',
		showTitle = true,
		title = 'Sichtungskarte',
		showLogo = true,
		containerClass = 'relative h-screen w-screen overflow-hidden',
		titleClass = 'glass text-base-content text-sm absolute top-4 left-12 z-30 rounded-lg px-3 py-1.5 font-bold shadow-xl backdrop-blur-md flex items-center gap-2'
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
		isLoading = true;
		loadError = null;
		// Only load once when component mounts
		if (MapComponent === null && isLoading) {
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
				isLoading = false;
			}
		}
	}

	// Use $effect for lazy loading the map component
	$effect(() => {
		if (MapComponent === null && isLoading) {
			loadMapComponent();
		}
	});
</script>

<!-- Use LoadingOverlay for better UX -->
<LoadingOverlay isVisible={isLoading} type="initial" />

{#if loadError}
	<div class={containerClass}>
		<div class="flex h-full flex-col items-center justify-center gap-4">
			<div class="alert alert-error" role="alert">
				<Icon icon="lucide:circle-alert" class="shrink-0" aria-hidden="true" />
				<span>{loadError}</span>
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
{:else if MapComponent}
	<MapComponent {mapContainerId} {showTitle} {title} {showLogo} {containerClass} {titleClass} />
{/if}
