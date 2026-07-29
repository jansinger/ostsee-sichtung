<script lang="ts">
	import { get } from 'svelte/store';
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

	// Startzustand, EINMALIG beim Mounten bestimmt — bewusst über `get(form)`
	// statt `$form`, damit daraus keine reaktive Abhängigkeit wird.
	//
	// `descriptionCollapsed` hängt an `waterway`/`seaMark`. Würde der Auf-/
	// Zuklapp-Zustand reaktiv daran gebunden, kippte er beim ersten `change` in
	// genau dem Feld, in dem gerade getippt wird. Vorher lag darunter sogar ein
	// `{#if}` mit zwei eigenen `FormField`-Instanzen: Svelte riss den Teilbaum ab,
	// das fokussierte Feld verschwand und `document.activeElement` fiel auf
	// `<body>` zurück. Die Felder stehen deshalb jetzt genau einmal im Markup, in
	// einem Container, der nie ausgetauscht wird.
	//
	// Kein `bind:open`: `PositionPanel.focusDescription()` klappt Vorfahren-
	// `<details>` imperativ auf, bevor es fokussiert. Ein gebundener Zustand
	// würde dagegen zurückschreiben.
	const initialValues = get(form);
	const startsOpen = !descriptionCollapsed(
		hasCoordinates(initialValues.latitude, initialValues.longitude),
		initialValues.waterway,
		initialValues.seaMark
	);
</script>

<details
	class="border-base-300 bg-base-200/40 collapse mt-4 rounded-lg border"
	open={startsOpen}
	data-testid="location-description"
>
	<!-- `<summary>` ist nativ fokussierbar — kein `tabindex` nötig. -->
	<summary class="collapse-title flex min-h-11 items-center gap-2 py-3 text-sm font-medium">
		<Icon aria-hidden="true" icon="lucide:waves" width="16" class="text-primary shrink-0" />
		{coordinatesPresent
			? 'Ortsbeschreibung ergänzen (optional)'
			: 'Kein GPS? Beschreiben Sie das Seegebiet'}
	</summary>
	<div class="collapse-content">
		<p class="text-base-content/70 text-support mb-3">
			Viele Fotos enthalten keine GPS-Daten, und nicht jede Position lässt sich auf der Karte
			wiederfinden — das ist kein Problem. Eine kurze Beschreibung des Fahrwassers genügt uns, auch
			ungefähre Angaben sind wertvoll.
		</p>

		<FormField name="waterway" required={waterwayRequired} />
		<FormField name="seaMark" />
	</div>
</details>
