<script lang="ts">
	import { goto } from '$app/navigation';
	import AdminSightingView from '$lib/components/admin/AdminSightingView.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { SpamCheckResult } from '$lib/types/spam';

	let { data } = $props();

	let sighting = $derived(data.sighting);

	let spamCheck = $state<{
		loading: boolean;
		result: SpamCheckResult | null;
		error: string | null;
	}>({
		loading: false,
		result: null,
		error: null
	});

	function editSighting() {
		// Logic to edit the sighting
		goto(`/admin/${sighting.id}/edit`);
	}

	async function runSpamCheck() {
		spamCheck.loading = true;
		spamCheck.error = null;
		spamCheck.result = null;

		try {
			const response = await fetch(`/api/sightings/${sighting.id}/spam-check`);
			if (!response.ok) {
				throw new Error(`Fehler ${response.status}: ${response.statusText}`);
			}
			spamCheck.result = await response.json();
		} catch (err) {
			spamCheck.error = err instanceof Error ? err.message : 'Unbekannter Fehler';
		} finally {
			spamCheck.loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sichtung #{data.sighting?.id} - Details - Admin - Ostsee-Tiere</title>
	<meta
		name="description"
		content="Detailansicht der Sichtung #{data.sighting
			?.id}. Vollständige Informationen zur gemeldeten Meerestier-Sichtung."
	/>
	<meta
		name="keywords"
		content="Sichtung, Details, Admin, {data.sighting?.species || 'Meerestier'}, Ostsee, Verwaltung"
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="Sichtung #{data.sighting?.id} - Details - Admin" />
	<meta
		property="og:description"
		content="Detailansicht einer Meerestier-Sichtung im Admin-Bereich"
	/>
	<meta property="og:type" content="website" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Sichtung #{data.sighting?.id} - Details - Admin" />
	<meta
		name="twitter:description"
		content="Detailansicht einer Meerestier-Sichtung im Admin-Bereich"
	/>
</svelte:head>

<div class="mb-0 flex items-center justify-between">
	<h2 class="text-xl font-bold">Sichtung Details</h2>
	<div class="flex gap-2">
		<button
			class="btn btn-ghost btn-sm"
			onclick={runSpamCheck}
			disabled={spamCheck.loading}
			title="Spam-Check durchführen"
			aria-label="Spam-Check für diese Sichtung durchführen"
		>
			{#if spamCheck.loading}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				<Icon icon="lucide:shield-alert" class="mr-1 h-4 w-4" />
			{/if}
			Spam-Check
		</button>
		<button
			class="btn btn-primary btn-sm"
			onclick={editSighting}
			title="Bearbeiten"
			aria-label="Sichtung bearbeiten"
		>
			<Icon icon="lucide:pen-line" class="mr-1 h-4 w-4" />
			Bearbeiten
		</button>
	</div>
</div>
<div class="mb-4 text-sm text-gray-600">
	Referenz-ID: {sighting.referenceId}
</div>

{#if spamCheck.error}
	<div class="alert alert-error mb-4">
		<Icon icon="lucide:alert-circle" class="h-4 w-4" />
		<span>Spam-Check fehlgeschlagen: {spamCheck.error}</span>
	</div>
{/if}

{#if spamCheck.result}
	{@const result = spamCheck.result}
	<div
		class="card mb-4 border {result.isHighRisk
			? 'border-error bg-error/10'
			: result.score > 0
				? 'border-warning bg-warning/10'
				: 'border-success bg-success/10'}"
	>
		<div class="card-body p-4">
			<div class="flex items-center gap-2">
				<Icon
					icon="lucide:shield-alert"
					class="h-5 w-5 {result.isHighRisk
						? 'text-error'
						: result.score > 0
							? 'text-warning'
							: 'text-success'}"
				/>
				<h3 class="card-title text-base">
					{#if result.isHighRisk}
						Spam-Warnung (Hochrisiko)
					{:else if result.score > 0}
						Spam-Hinweis (Geringes Risiko)
					{:else}
						Kein Spam erkannt
					{/if}
				</h3>
				<div class="ml-auto flex gap-2">
					<span
						class="badge {result.isHighRisk
							? 'badge-error'
							: result.score > 0
								? 'badge-warning'
								: 'badge-success'}"
					>
						Score: {result.score}
					</span>
				</div>
			</div>
			{#if result.indicators.length > 0}
				<ul class="mt-2 list-inside list-disc text-sm">
					{#each result.indicators as indicator (indicator)}
						<li>{indicator}</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}

<AdminSightingView {sighting} />
