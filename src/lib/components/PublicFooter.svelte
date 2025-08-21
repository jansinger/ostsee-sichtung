<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let isNotIFrame = $state(true);

	onMount(() => {
		if (browser) {
			isNotIFrame = window && typeof window !== 'undefined' && window === window.top;
		}
	});
</script>

<!-- Footer with navigation (versteckt in iFrame) -->
{#if isNotIFrame}
	<footer class="bg-base-200/50 mt-2 p-4 text-center">
		<div class="flex justify-center gap-4 text-sm">
			<a href="/about" class="link link-hover">Über uns</a>
			<span class="opacity-30">•</span>
			<a href="/docs" class="link link-hover">API-Dokumentation</a>
			<span class="opacity-30">•</span>
			<a href="/map" class="link link-hover">Sichtungskarte</a>
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
