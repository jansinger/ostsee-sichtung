<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import Icon from '$lib/components/Icon.svelte';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import { hasCoordinates } from '$lib/report/components/form/coordinateValue';
	import { descriptionCollapsed } from './positionPanelState';

	const { form } = getFormContext();

	const coordinatesPresent = $derived(hasCoordinates($form.latitude, $form.longitude));

	// Fahrwasser ist laut Schema Pflicht, solange keine GPS-Position vorliegt
	// (`waterway.when('hasPosition', { is: (v) => v !== true, ... })`).
	const waterwayRequired = $derived($form.hasPosition !== true);

	const collapsed = $derived(
		descriptionCollapsed(coordinatesPresent, $form.waterway, $form.seaMark)
	);
</script>

{#if collapsed}
	<details class="bg-base-100 collapse mt-4" data-testid="location-description">
		<summary class="collapse-title min-h-11 py-3 text-sm font-medium">
			Ortsbeschreibung ergänzen (optional)
		</summary>
		<div class="collapse-content">
			<FormField name="waterway" required={waterwayRequired} />
			<FormField name="seaMark" />
		</div>
	</details>
{:else}
	<div
		class="border-base-300 bg-base-200/40 mt-4 rounded-lg border p-3 sm:p-4"
		data-testid="location-description"
	>
		<h3 class="mb-1 flex items-center gap-2 text-sm font-semibold">
			<Icon aria-hidden="true" icon="lucide:waves" width="16" class="text-primary" />
			{coordinatesPresent
				? 'Ortsbeschreibung ergänzen (optional)'
				: 'Kein GPS? Beschreiben Sie das Seegebiet'}
		</h3>
		<p class="text-base-content/70 mb-3 text-xs">
			Viele Fotos enthalten keine GPS-Daten, und nicht jede Position lässt sich auf der Karte
			wiederfinden — das ist kein Problem. Eine kurze Beschreibung des Fahrwassers genügt uns, auch
			ungefähre Angaben sind wertvoll.
		</p>

		<FormField name="waterway" required={waterwayRequired} />
		<FormField name="seaMark" />
	</div>
{/if}
