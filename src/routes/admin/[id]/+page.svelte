<script lang="ts">
	import { goto } from '$app/navigation';
	import AdminSightingView from '$lib/components/admin/AdminSightingView.svelte';
	import { PenLine } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	let { data } = $props();

	let sighting = $derived(data.sighting);

	function editSighting() {
		// Logic to edit the sighting
		goto(`/admin/${sighting.id}/edit`);
	}
</script>

<svelte:head>
	<title>Sichtung #{data.sighting?.id} - Details</title>
</svelte:head>

<div class="mb-0 flex items-center justify-between">
	<h2 class="text-xl font-bold">Sichtung Details</h2>
	<div class="flex gap-2">
		<button
			class="btn btn-primary btn-sm"
			onclick={editSighting}
			title="Bearbeiten"
			aria-label="Sichtung bearbeiten"
		>
			<Icon src={PenLine} class="mr-1 h-4 w-4" />
			Bearbeiten
		</button>
	</div>
</div>
<div class="mb-4 text-sm text-gray-600">
	Referenz-ID: {sighting.referenceId}
</div>
<AdminSightingView {sighting} />
