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

<!-- Footer with navigation (versteckt in iFrame) -->
{#if typeof window !== 'undefined' && window === window.top}
	<footer class="bg-base-200/80 backdrop-blur-sm text-center p-3 fixed bottom-0 left-0 right-0 z-10">
		<div class="flex justify-center gap-4 text-xs">
			<a href="/" class="link link-hover">Sichtung melden</a>
			<span class="opacity-30">•</span>
			<a href="/about" class="link link-hover">Über uns</a>
			<span class="opacity-30">•</span>
			<a href="/docs" class="link link-hover">API-Dokumentation</a>
			<span class="opacity-30">•</span>
			<a 
				href="https://github.com/jansinger/ostsee-sichtung" 
				target="_blank" 
				rel="noopener noreferrer" 
				class="link link-hover"
			>
				GitHub
			</a>
		</div>
	</footer>
{/if}
