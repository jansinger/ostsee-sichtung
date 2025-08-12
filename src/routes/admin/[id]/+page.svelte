<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AdminSichtungDetails from '$lib/components/admin/AdminSightingDetails.svelte';
	import { ArrowLeftOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';

	let loading = $derived(true);
	let error = $state<string | null>(null);

	let { data } = $props();

	function handleClose() {
		// Preserve only the filter-related search parameters
		const searchParams = $page.url.searchParams;
		const adminUrl = new URL('/admin', $page.url.origin);
		
		// List of filter parameters to preserve
		const filterParams = ['dateFrom', 'dateTo', 'verified', 'entryChannel', 'mediaUpload', 'sort', 'order', 'page', 'perPage'];
		
		// Copy only filter-related parameters to maintain filters
		for (const param of filterParams) {
			const value = searchParams.get(param);
			if (value) {
				adminUrl.searchParams.set(param, value);
			}
		}
		
		goto(adminUrl.toString());
	}

	$effect(() => {
		loading = data.sighting === null;
	});
</script>

<svelte:head>
	<title>Sichtung #{data.sighting?.id} - Details</title>
</svelte:head>

<div class="container mx-auto p-4">
	<div class="mb-4 flex justify-end">
		<button class="btn btn-ghost btn-sm" onclick={handleClose}>
			<ArrowLeftOutline class="mr-2 h-4 w-4" />
			Zurück zur Tabelle
		</button>
	</div>

	{#if loading}
		<div class="flex justify-center p-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<ExclamationCircleOutline class="h-6 w-6 shrink-0" />
			<span>{error}</span>
		</div>
	{:else if data.sighting}
		<div class="bg-base-100 rounded-lg shadow-lg">
			<AdminSichtungDetails sighting={data.sighting} onClose={handleClose} />
		</div>
	{/if}
</div>
