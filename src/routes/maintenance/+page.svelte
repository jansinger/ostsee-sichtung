<script lang="ts">
	import OstseeTiereLogo from '$lib/components/OstseeTiereLogo.svelte';
	import { CogOutline, RefreshOutline } from 'flowbite-svelte-icons';

	let { data } = $props();
	
	function refreshPage() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>Wartungsmodus - Ostsee-Tiere</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-base-200">
	<div class="card w-full max-w-md bg-base-100 shadow-xl">
		<div class="card-body text-center">
			<!-- Logo -->
			<div class="mb-6 flex justify-center">
				<OstseeTiereLogo size="lg" showText={true} />
			</div>

			<!-- Maintenance Icon -->
			<div class="mb-6 flex justify-center">
				<div class="rounded-full bg-warning/20 p-6">
					<CogOutline class="size-16 animate-spin text-warning" />
				</div>
			</div>

			<!-- Title -->
			<h1 class="text-2xl font-bold text-base-content">
				🔧 Wartungsmodus
			</h1>

			<!-- Message -->
			<div class="mt-4 text-base-content/80">
				<p class="text-lg leading-relaxed">
					{data.maintenanceMessage || 'Die Anwendung wird gewartet. Bitte versuchen Sie es später erneut.'}
				</p>
			</div>

			<!-- Refresh Button -->
			<div class="mt-8">
				<button onclick={refreshPage} class="btn btn-primary gap-2">
					<RefreshOutline class="size-5" />
					Seite aktualisieren
				</button>
			</div>

			<!-- Info -->
			<div class="mt-6 text-sm text-base-content/60">
				<p>Wir arbeiten daran, die Anwendung zu verbessern.</p>
				<p class="mt-1">Vielen Dank für Ihr Verständnis!</p>
			</div>
		</div>
	</div>
</div>

<style>
	/* Custom animation for the maintenance icon */
	:global(.animate-spin) {
		animation: spin 3s linear infinite;
	}
	
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>