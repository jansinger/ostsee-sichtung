<script lang="ts">
	import { goto } from '$app/navigation';
	import AdminSightingEditForm from '$lib/components/admin/AdminSightingEditForm.svelte';
	import { createLogger } from '$lib/logger';
	import type { FrontendSighting } from '$lib/types/FrontendSighting.js';
	import Icon from '$lib/components/Icon.svelte';

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
	<title>Sichtung #{data.sighting?.id} - Bearbeiten - Admin - Ostsee-Tiere</title>
	<meta 
		name="description" 
		content="Bearbeitung der Sichtung #{data.sighting?.id}. Admin-Bereich zur Korrektur und Anpassung von Sichtungsdaten." 
	/>
	<meta 
		name="keywords" 
		content="Sichtung, Bearbeiten, Admin, {data.sighting?.species || 'Meerestier'}, Ostsee, Verwaltung" 
	/>
	
	<!-- Open Graph -->
	<meta property="og:title" content="Sichtung #{data.sighting?.id} bearbeiten - Admin" />
	<meta 
		property="og:description" 
		content="Bearbeitung einer Meerestier-Sichtung im Admin-Bereich" 
	/>
	<meta property="og:type" content="website" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Sichtung #{data.sighting?.id} bearbeiten - Admin" />
	<meta 
		name="twitter:description" 
		content="Bearbeitung einer Meerestier-Sichtung im Admin-Bereich" 
	/>
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
			<Icon icon="lucide:pen-off" class="mr-1 h-4 w-4" />
			Abbrechen
		</button>
	</div>
</div>
<div class="mb-4 text-sm text-gray-600">
	Referenz-ID: {sighting.referenceId}
</div>
<AdminSightingEditForm {sighting} {onCancel} onSave={handleSave} />
