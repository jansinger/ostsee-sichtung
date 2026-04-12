<script lang="ts">
	import { USER_CONTACT_FIELDS } from '$lib/report/formConfig';
	import { getFormContext } from '$lib/report/formContext';
	import { clearAllStorage, loadUserContactData } from '$lib/storage/localStorage';
	import { createToast } from '$lib/stores/toastState.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let {
		onCancel = () => {},
		onReset = () => {}
	}: {
		onCancel?: () => void;
		onReset?: () => void;
	} = $props();

	const { isSubmitting, form, handleChange } = getFormContext();

	// Check if user has saved contact data
	const hasSavedContactData = $derived.by(() => {
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

			// Clear contact fields in form state without page reload
			for (const field of USER_CONTACT_FIELDS) {
				const defaultValue = typeof $form[field] === 'boolean' ? false : '';
				handleChange({ target: { name: field, value: defaultValue } } as unknown as Event);
			}

			createToast('success', 'Gespeicherte Kontaktdaten wurden gelöscht');
		}
	}
</script>

<!-- Form Actions - 3 Column Layout -->
<div class="mx-auto mt-8">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<!-- Left Column: Reset -->
		<div class="flex justify-center sm:justify-start">
			<button
				type="button"
				class="btn btn-outline btn-sm w-full sm:w-auto"
				onclick={onReset}
				disabled={$isSubmitting}
			>
				Formular zurücksetzen
			</button>
		</div>

		<!-- Middle Column: Clear Contact Data or Empty -->
		<div class="flex justify-center">
			{#if hasSavedContactData}
				<button
					type="button"
					class="btn btn-warning btn-sm w-full sm:w-auto"
					onclick={clearContactData}
					disabled={$isSubmitting}
					title="Löscht gespeicherte Kontaktdaten permanent"
				>
					<Icon icon="lucide:trash-2" class="h-[14px] w-[14px]" /> Kontaktdaten löschen
				</button>
			{:else}
				<!-- Empty space to maintain grid layout -->
				<div></div>
			{/if}
		</div>

		<!-- Right Column: Cancel or Empty -->
		<div class="flex justify-center sm:justify-end">
			{#if onCancel}
				<button
					type="button"
					class="btn btn-ghost w-full sm:w-auto"
					onclick={onCancel}
					disabled={$isSubmitting}
				>
					Abbrechen
				</button>
			{:else}
				<!-- Empty space to maintain grid layout -->
				<div></div>
			{/if}
		</div>
	</div>
</div>
