<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import { BoatDriveEnum } from '$lib/report/formOptions/boatDrive';
	import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
	import { slide } from 'svelte/transition';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';
	import {
		NOT_YET_TRACKED,
		isBoatSightingFrom,
		shouldResetBoatDrive,
		type TrackedSightingFromValue
	} from './boatDriveReset';

	const { form, updateField } = getFormContext();

	/** Sichtung erfolgte von einem Boot mit Antrieb (Segelschiff/Motorboot) aus. */
	const showsBoatDrive = $derived(isBoatSightingFrom($form.sightingFrom));

	// Zuletzt gesehener sightingFrom-Wert. Startet mit NOT_YET_TRACKED, damit der
	// erste Durchlauf (Mount, ggf. mit vorbefüllten Admin-Daten) NIE einen Reset
	// auslöst - siehe shouldResetBoatDrive.
	let previousSightingFrom: TrackedSightingFromValue = NOT_YET_TRACKED;

	// Wechselt der NUTZER aktiv von Boot zu Land/Fähre/Sonstiges, verstecken wir
	// den Bootsantrieb-Block wieder. Dabei müssen boatDrive/boatDriveText im
	// Formular-State zurückgesetzt werden, damit keine versteckten
	// Boot-Angaben unbeabsichtigt mit übermittelt werden. Beim initialen Mount
	// (z.B. Admin-Edit einer bestehenden Land-Sichtung) darf das NICHT passieren,
	// sonst geht ein gespeicherter boatDrive-Wert unsichtbar verloren.
	$effect(() => {
		const currentSightingFrom = $form.sightingFrom;

		if (shouldResetBoatDrive(previousSightingFrom, currentSightingFrom)) {
			if ($form.boatDrive !== undefined) {
				updateField('boatDrive', undefined);
			}
			if ($form.boatDriveText !== undefined) {
				updateField('boatDriveText', undefined);
			}
		}

		previousSightingFrom = currentSightingFrom;
	});
</script>

<!-- Sighting Details Section -->
<SectionCard title="Sichtungsdetails" icon="lucide:activity">
	<div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-1">
		<FormField name="sightingFrom" />
		{#if String($form.sightingFrom) === String(SightingFromEnum.OTHER)}
			<div transition:slide>
				<FormField name="sightingFromText" />
			</div>
		{/if}
	</div>
	{#if showsBoatDrive}
		<div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-1" transition:slide>
			<FormField name="boatDrive" />
			{#if String($form.boatDrive) === String(BoatDriveEnum.OTHER)}
				<div transition:slide>
					<FormField name="boatDriveText" />
				</div>
			{/if}
		</div>
	{/if}

	<FormField name="distance" />
</SectionCard>
