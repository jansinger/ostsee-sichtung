<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { createLogger } from '$lib/logger';
	import type { Sighting } from '$lib/types/types';
	import { FilePenLine, SquareX } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import { onMount } from 'svelte';
	import AdminSightingEditForm from './AdminSightingEditForm.svelte';
	import AdminSightingView from './AdminSightingView.svelte';

	const logger = createLogger('SightingDetails');

	let {
		sighting,
		onClose = () => {},
		showCloseButton = false,
		allowEditing = true
	} = $props<{
		sighting: Sighting;
		onClose?: () => void;
		showCloseButton?: boolean;
		allowEditing?: boolean;
	}>();

	// Initialisiere isEditing basierend auf dem URL-Parameter
	let isEditing = $state(false);

	// Bei Mount den URL-Parameter auslesen
	onMount(() => {
		const editMode = $page.url.searchParams.get('edit') === 'true';
		if (editMode && allowEditing) {
			isEditing = true;
		}
	});

	// Toggle mit URL-Parameter-Update
	function toggleEdit() {
		const newEditState = !isEditing;
		isEditing = newEditState;

		// URL aktualisieren ohne vollständigen Reload
		const url = new URL(window.location.href);
		if (newEditState) {
			url.searchParams.set('edit', 'true');
		} else {
			url.searchParams.delete('edit');
		}
		goto(url.toString(), { replaceState: true, invalidateAll: true });
	}

	// Schließen-Handler mit URL-Bereinigung
	function handleClose() {
		// URL von edit-Parameter bereinigen, falls vorhanden
		if ($page.url.searchParams.has('edit')) {
			const url = new URL(window.location.href);
			url.searchParams.delete('edit');
			goto(url.toString(), { replaceState: true });
		}

		// Original onClose ausführen
		onClose();
	}

	async function handleSave(updatedSighting: Sighting) {
		logger.info({ updatedSighting }, 'Sichtung gespeichert');
		isEditing = false;
		const url = new URL(window.location.href);
		url.searchParams.delete('edit');
		goto(url.toString(), { replaceState: true, invalidateAll: true });
	}
</script>

<div class="p-6">
	<div class="mb-0 flex items-center justify-between">
		<h2 class="text-xl font-bold">Sichtung Details</h2>
		<div class="flex gap-2">
			{#if allowEditing && !isEditing}
				<button
					class="btn btn-primary btn-sm"
					onclick={toggleEdit}
					title="Bearbeiten"
					aria-label="Sichtung bearbeiten"
				>
					<Icon src={FilePenLine} class="mr-1 h-4 w-4" />
					Bearbeiten
				</button>
			{/if}
			{#if showCloseButton}
				<button
					class="btn btn-ghost btn-sm"
					onclick={handleClose}
					title="Schließen"
					aria-label="Schließen"
				>
					<Icon src={SquareX} class="h-4 w-4" />
				</button>
			{/if}
		</div>
	</div>
	<div class="mb-4 text-sm text-gray-600">
		Referenz-ID: {sighting.referenceId}
	</div>

	{#if isEditing}
		<AdminSightingEditForm {sighting} onCancel={toggleEdit} onSave={handleSave} />
	{:else}
		<AdminSightingView {sighting} />
	{/if}
</div>
