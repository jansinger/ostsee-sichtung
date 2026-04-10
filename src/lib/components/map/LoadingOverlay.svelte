<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	// Props
	type LoadingType = 'default' | 'filter' | 'features' | 'initial';

	let { isVisible = false, type = 'default' }: { isVisible?: boolean; type?: LoadingType } =
		$props();

	// Typ-sichere Zuordnungen
	const iconMap: Record<LoadingType, string> = {
		default: 'lucide:loader-2',
		filter: 'lucide:filter',
		features: 'lucide:map-pin',
		initial: 'lucide:loader-2'
	};

	const messageMap: Record<LoadingType, string> = {
		default: 'Daten werden geladen...',
		filter: 'Filter werden angewendet...',
		features: 'Kartenfeatures werden geladen...',
		initial: 'Karte wird initialisiert...'
	};

	const loadingType = $derived(type as LoadingType);
	const displayMessage = $derived(messageMap[loadingType]);
</script>

{#if isVisible}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-all duration-300"
		style="animation: fadeIn 0.3s ease-out"
		role="dialog"
		aria-modal="true"
		aria-labelledby="loading-title"
	></div>

	<!-- Loading Content -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div
			class="bg-base-100 mx-auto w-full max-w-sm scale-100 transform rounded-2xl p-8 shadow-2xl transition-all duration-300"
			style="animation: bounceIn 0.4s ease-out"
		>
			<!-- Header -->
			<div class="mb-6 text-center">
				<div
					class="bg-primary/10 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
				>
					<Icon icon={iconMap[loadingType]} class="text-primary h-8 w-8 animate-spin" />
				</div>
				<h3 id="loading-title" class="text-base-content text-lg font-semibold">
					{displayMessage}
				</h3>
			</div>

			<!-- Indeterminate Loading Dots -->
			<div class="mb-2 flex items-center justify-center space-x-2">
				<div class="bg-primary h-2 w-2 animate-bounce rounded-full"></div>
				<div
					class="bg-primary h-2 w-2 animate-bounce rounded-full"
					style="animation-delay: 0.1s"
				></div>
				<div
					class="bg-primary h-2 w-2 animate-bounce rounded-full"
					style="animation-delay: 0.2s"
				></div>
			</div>

			{#if type === 'initial'}
				<div class="text-base-content/60 mt-4 text-center text-sm">
					<p>Verwenden Sie <kbd class="kbd kbd-xs">H</kbd> für Tastaturkürzel</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Animations sind jetzt global in app.css definiert -->
