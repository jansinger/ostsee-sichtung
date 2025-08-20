<script lang="ts">
	import { goto } from '$app/navigation';
	import AdminSightingEditForm from '$lib/components/admin/AdminSightingEditForm.svelte';
	import { createLogger } from '$lib/logger';
	import type { FrontendSighting } from '$lib/types/FrontendSighting.js';
	import { PenOff } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	const logger = createLogger('AdminSightingEditPage');

	let { data } = $props();

	function onCancel() {
		// Logic to handle cancel action
		goto(`/admin/${sighting.id}`);
	}

	function handleSave(updatedSighting: FrontendSighting) {
		logger.info({ updatedSighting }, 'Sichtung gespeichert');
		// Logic to save the updated sighting
		goto(`/admin/${sighting.id}`, { invalidateAll: true });
	}

	let sighting = $derived(data.sighting);
</script>

<svelte:head>
	<title>Sichtung #{data.sighting?.id} - Bearbeiten</title>
</svelte:head>

<div class="mb-0 flex items-center justify-between">
	<h2 class="text-xl font-bold">Sichtung Details</h2>
	<div class="flex gap-2">
		<button
			class="btn btn-ghost btn-sm"
			onclick={onCancel}
			title="Abbrechen"
			aria-label="Sichtungsbearbeitung abbrechen"
		>
			<Icon src={PenOff} class="mr-1 h-4 w-4" />
			Abbrechen
		</button>
	</div>
</div>
<div class="mb-4 text-sm text-gray-600">
	Referenz-ID: {sighting.referenceId}
</div>
<AdminSightingEditForm {sighting} {onCancel} onSave={handleSave} />
