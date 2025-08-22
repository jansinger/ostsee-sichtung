<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import { clearAllStorage, loadUserContactData } from '$lib/storage/localStorage';
	import { createToast } from '$lib/stores/toastStore';
	import { Trash2 } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	let {
		onCancel = () => {},
		onReset = () => {}
	}: {
		onCancel?: () => void;
		onReset?: () => void;
	} = $props();

	const { isSubmitting } = getFormContext();

	// Check if user has saved contact data
	const hasSavedContactData = $derived(() => {
		const contactData = loadUserContactData();
		return Object.keys(contactData).length > 0;
	});

	function clearContactData() {
		if (
			confirm(
				'Möchten Sie wirklich alle gespeicherten Kontaktdaten löschen? Diese müssen dann bei der nächsten Sichtung erneut eingegeben werden.'
			)
		) {
			clearAllStorage();
			createToast('success', 'Gespeicherte Kontaktdaten wurden gelöscht');
			// Reload the page to reset the form with empty contact data
			window.location.reload();
		}
	}
</script>

<!-- Form Actions -->
<div class="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
	<!-- Help and Reset -->
	<div class="flex flex-col items-center gap-4 sm:flex-row">
		<button type="button" class="btn btn-outline btn-sm" onclick={onReset} disabled={$isSubmitting}>
			Formular zurücksetzen
		</button>

		{#if hasSavedContactData()}
			<button
				type="button"
				class="btn btn-warning btn-sm"
				onclick={clearContactData}
				disabled={$isSubmitting}
				title="Löscht gespeicherte Kontaktdaten permanent"
			>
				<Icon src={Trash2} size="14" /> Kontaktdaten löschen
			</button>
		{/if}
	</div>

	<!-- Cancel Button -->
	{#if onCancel}
		<button type="button" class="btn btn-ghost" onclick={onCancel} disabled={$isSubmitting}>
			Abbrechen
		</button>
	{/if}
</div>
