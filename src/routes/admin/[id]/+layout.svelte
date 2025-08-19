<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ArrowLeftOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';

	let { children, data } = $props();

	function handleClose() {
		// Preserve only the filter-related search parameters
		const searchParams = page.url.searchParams;
		const adminUrl = new URL('/admin', page.url.origin);

		// List of filter parameters to preserve
		const filterParams = [
			'dateFrom',
			'dateTo',
			'verified',
			'entryChannel',
			'mediaUpload',
			'sort',
			'order',
			'page',
			'perPage'
		];

		// Copy only filter-related parameters to maintain filters
		for (const param of filterParams) {
			const value = searchParams.get(param);
			if (value) {
				adminUrl.searchParams.set(param, value);
			}
		}

		goto(adminUrl.toString());
	}
</script>

<div class="container mx-auto p-4">
	<div class="mb-2 flex justify-end">
		<button class="btn btn-ghost btn-sm" onclick={handleClose}>
			<ArrowLeftOutline class="mr-2 h-4 w-4" />
			Zurück zur Tabelle
		</button>
	</div>

	{#await data.sighting}
		<div class="flex justify-center p-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:then}
		<div class="bg-base-100 rounded-lg shadow-lg">
			<div class="p-6">
				{@render children()}
			</div>
		</div>
	{:catch error}
		<div class="alert alert-error">
			<ExclamationCircleOutline class="h-6 w-6 shrink-0" />
			<span>{error}</span>
		</div>
	{/await}
</div>
