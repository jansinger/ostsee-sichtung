<script lang="ts">
	import type { Component } from 'svelte';

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
					.catch((_err) => {
						loadError = 'Karte konnte nicht geladen werden.';
						isLoading = false;
					});
			} else {
				isLoading = false;
			}
		}
	});
</script>

{#if isLoading}
	<div class={containerClass}>
		<div class="flex h-full items-center justify-center">
			<div
				class="loading loading-spinner loading-lg"
				role="status"
				aria-label="Karte wird geladen"
			></div>
		</div>
	</div>
{:else if loadError}
	<div class={containerClass}>
		<div class="flex h-full items-center justify-center">
			<div class="alert alert-error" role="alert">{loadError}</div>
		</div>
	</div>
{:else if MapComponent}
	<MapComponent {mapContainerId} {showTitle} {title} {showLogo} {containerClass} {titleClass} />
{/if}
