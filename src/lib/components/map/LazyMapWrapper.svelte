<script lang="ts">
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

	let MapComponent: any = $state(null);
	let isLoading = $state(true);

	// Use $effect for lazy loading the map component
	$effect(() => {
		// Only load once when component mounts
		if (MapComponent === null && isLoading) {
			import('./SightingsMapView.svelte').then((module) => {
				MapComponent = module.default;
				isLoading = false;
			});
		}
	});
</script>

{#if isLoading}
	<div class={containerClass}>
		<div class="flex items-center justify-center h-full">
			<div class="loading loading-spinner loading-lg"></div>
		</div>
	</div>
{:else if MapComponent}
	<svelte:component 
		this={MapComponent}
		{mapContainerId}
		{showTitle}
		{title}
		{showLogo}
		{containerClass}
		{titleClass}
	/>
{/if}