<script lang="ts">
	import { Filter, Loader, MapPin } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	// Props
	let {
		isVisible = false,
		message = 'Laden...',
		type = 'default',
		progress = null,
		canCancel = false,
		onCancel = null
	} = $props<{
		isVisible?: boolean;
		message?: string;
		type?: 'default' | 'filter' | 'features' | 'initial';
		progress?: number | null;
		canCancel?: boolean;
		onCancel?: (() => void) | null;
	}>();

	// Icon basierend auf Typ
	const iconMap = {
		default: Loader,
		filter: Filter,
		features: MapPin,
		initial: Loader
	};

	// Nachrichten basierend auf Typ
	const messageMap = {
		default: 'Daten werden geladen...',
		filter: 'Filter werden angewendet...',
		features: 'Kartenfeatures werden geladen...',
		initial: 'Karte wird initialisiert...'
	};

	// Compute message based on type if not provided
	const displayMessage = $derived(() => {
		if (message && message !== 'Laden...') {
			return message;
		}
		return messageMap[type];
	});
</script>

{#if isVisible}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-all duration-300"
		role="dialog"
		aria-modal="true"
		aria-labelledby="loading-title"
	></div>

	<!-- Loading Content -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div
			class="bg-base-100 mx-auto w-full max-w-sm scale-100 transform rounded-2xl p-8 shadow-2xl transition-all duration-300"
		>
			<!-- Header -->
			<div class="mb-6 text-center">
				<div
					class="bg-primary/10 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
				>
					<Icon src={iconMap[type]} class="text-primary h-8 w-8 animate-spin" />
				</div>
				<h3 id="loading-title" class="text-base-content text-lg font-semibold">
					{displayMessage()}
				</h3>
			</div>

			<!-- Progress Bar (if applicable) -->
			{#if progress !== null && progress >= 0}
				<div class="mb-6">
					<div class="text-base-content/70 mb-2 flex justify-between text-sm">
						<span>Fortschritt</span>
						<span>{Math.round(progress)}%</span>
					</div>
					<div class="bg-base-200 h-2 w-full rounded-full">
						<div
							class="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
							style="width: {Math.min(progress, 100)}%"
						></div>
					</div>
				</div>
			{/if}

			<!-- Loading Dots Animation -->
			<div class="mb-6 flex items-center justify-center space-x-2">
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

			<!-- Cancel Button (if allowed) -->
			{#if canCancel && onCancel}
				<div class="text-center">
					<button onclick={onCancel} class="btn btn-ghost btn-sm" aria-label="Laden abbrechen">
						Abbrechen
					</button>
				</div>
			{/if}

			<!-- Loading Tips -->
			{#if type === 'initial'}
				<div class="text-base-content/60 mt-4 text-center text-sm">
					<p>💡 Tipp: Verwenden Sie <kbd class="kbd kbd-xs">H</kbd> für Tastaturkürzel</p>
				</div>
			{:else if type === 'filter'}
				<div class="text-base-content/60 mt-4 text-center text-sm">
					<p>
						🔍 Filter werden auf {progress !== null ? Math.round(progress / 10) : '...'} Datensätze angewendet
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Smooth animations */
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes bounceIn {
		0% {
			opacity: 0;
			transform: scale(0.3);
		}
		50% {
			opacity: 1;
			transform: scale(1.05);
		}
		70% {
			transform: scale(0.9);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Apply animations when visible */
	.fixed.inset-0.z-40 {
		animation: fadeIn 0.3s ease-out;
	}

	.fixed.inset-0.z-50 > div {
		animation: bounceIn 0.4s ease-out;
	}
</style>
