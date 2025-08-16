<script lang="ts">
	import SightingsMapView from '$lib/components/map/SightingsMapView.svelte';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.meta?.title || 'Sichtungskarte - Ostsee-Tiere'}</title>
	<meta name="description" content={data.meta?.description || 'Interaktive Karte der Meerestier-Sichtungen'} />
</svelte:head>

<SightingsMapView 
	mapContainerId="map"
	title="Sichtungskarte"
	showTitle={true}
	showLogo={true}
/>
