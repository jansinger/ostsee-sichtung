<!--
  Boot-/Schiffsangaben zur Beobachtungssituation.

  Stand bis zum 2026-07-31 auf Schritt 4 zwischen den Kontaktdaten. Fachlich
  gehört die Angabe aber zur Beobachtung, nicht zur Person — von welchem Boot
  aus beobachtet wurde und wie viele andere Schiffe in der Nähe waren, ordnet
  die Sichtung ein (u. a. Unterwasserlärm), nicht den Melder.

  Zu beachten: `shipName`, `homePort` und `boatType` bleiben Teil der dauerhaft
  gespeicherten Kontaktdaten (`USER_CONTACT_FIELDS`) und werden von
  „Kontaktdaten löschen" auf Schritt 4 weiterhin mitgelöscht, obwohl sie jetzt
  hier stehen. Das ist gewollt — es sind Angaben zum immer gleichen Boot des
  Melders, die beim nächsten Mal wieder vorausgefüllt werden sollen.
-->
<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import { isFromLand } from '$lib/report/formConfig';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';

	const { form } = getFormContext();
</script>

<SectionCard title="Boot-/Schiffsinformationen" icon="lucide:anchor">
	<p class="text-base-content/70 mb-4 text-sm">
		Falls Sie von einem Boot aus beobachtet haben — diese Angaben helfen, die Sichtung einzuordnen.
	</p>

	<!-- `shipName`/`homePort`/`boatType` betreffen das EIGENE Wasserfahrzeug und
	     entfallen deshalb bei einer ausdrücklichen Land-Meldung — ein
	     Landbeobachter hat kein Boot, dessen Name oder Heimathafen er nennen
	     könnte. `getFormSteps` (formConfig.ts) nimmt dieselben drei Felder
	     bereits aus der Validierung; dieselbe Bedingung (`isFromLand`) hier,
	     sonst bliebe die Karte sichtbar, aber unvalidiert ausgefüllt (siehe die
	     Begründung bei `HIDDEN_WHEN_FROM_LAND`). `shipCount` bleibt außerhalb
	     des Blocks stehen — es fragt nach ANDEREN Schiffen in der Umgebung, das
	     ist auch von Land aus zu beobachten. -->
	{#if !isFromLand($form.sightingFrom)}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField name="shipName" />

			<FormField name="homePort" />
		</div>

		<div class="mt-4 grid grid-cols-1 gap-4">
			<FormField name="boatType" />
		</div>
	{/if}

	<div class="mt-4 grid grid-cols-1 gap-4">
		<FormField name="shipCount" />
	</div>
</SectionCard>
