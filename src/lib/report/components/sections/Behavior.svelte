<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import { isFromLand } from '$lib/report/formConfig';
	import { AnimalBehaviorEnum } from '$lib/report/formOptions/animalBehavior';
	import { slide } from 'svelte/transition';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';

	const { form } = getFormContext();

	/**
	 * Zeigt zusätzlich die Felder, die das Meldeformular nicht mehr abfragt.
	 *
	 * Das Meldeformular ist eine kuratierte Teilmenge des Schemas — die
	 * Admin-Maske ist der vollständige Editor über denselben Datensatz. Ohne
	 * diesen Schalter hätte das Ausblenden im Formular auch die Korrektur im
	 * Admin genommen, denn beide benutzen diese Sektion.
	 */
	let { adminMode = false }: { adminMode?: boolean } = $props();
</script>

<!-- Animal Behavior Section -->
<SectionCard title="Verhalten der Tiere" icon="lucide:waves">
	<p class="text-base-content/70 mb-4 text-sm">
		Verhaltensinformationen helfen Wissenschaftlern, die Ökologie und das Wohlbefinden der Tiere zu
		verstehen
	</p>

	<!-- Behavior with select -->
	<FormField name="behavior" />

	{#if String($form.behavior) === String(AnimalBehaviorEnum.OTHER)}
		<!-- Additional field for custom behavior -->
		<div transition:slide>
			<FormField name="behaviorText" />
		</div>
	{/if}

	<!-- „Reaktion auf Ihr Boot" ist für einen Landbeobachter unbeantwortbar — er
	     hat kein Boot, auf das die Tiere reagieren könnten. `getFormSteps`
	     (formConfig.ts) nimmt `reaction` bereits bei einer Land-Meldung aus der
	     Validierung; dieselbe Bedingung (`isFromLand`) hier, sonst bliebe das
	     Feld sichtbar, aber unvalidiert ausgefüllt.

	     Nur außerhalb von `adminMode`: Die Admin-Maske muss `reaction` auch an
	     Altbestands-Datensätzen mit `vonwo = Land` korrigieren können. -->
	{#if adminMode || !isFromLand($form.sightingFrom)}
		<FormField name="reaction" />
	{/if}

	<!-- `otherObservations` ist aus dem Meldeformular genommen (Überschneidung
	     mit „Bemerkungen"), bleibt im Admin aber editierbar: 844 Datensätze
	     tragen dort Inhalt. -->
	{#if adminMode}
		<FormField name="otherObservations" />
	{/if}
</SectionCard>
