<!--
  Step 3: Contact Information and Observer Details
  Personal information, boat details, and additional observations
-->
<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { confirmAndClearContactData } from '$lib/report/clearContactData';
	import { getFormContext } from '$lib/report/formContext';
	import { loadUserContactData } from '$lib/storage/localStorage';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';

	const { form, updateField } = getFormContext();

	// Check if user has saved contact data
	let hasSavedContactData = $state(false);

	$effect(() => {
		const savedData = loadUserContactData();
		hasSavedContactData = !!(savedData.firstName || savedData.lastName || savedData.email);
	});

	function clearContactData() {
		if (confirmAndClearContactData($form, updateField)) {
			hasSavedContactData = false;
		}
	}
</script>

<div class="space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 px-2 text-center md:px-0">
		<div class="flex justify-center">
			<div
				class="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full md:h-12 md:w-12"
			>
				<Icon icon="lucide:user" width="20" class="text-primary md:h-6 md:w-6" />
			</div>
		</div>
		<h2 class="text-base-content text-xl font-bold md:text-2xl">Kontaktdaten</h2>
		<p class="text-base-content/70 mx-auto max-w-2xl text-sm md:text-base">
			Ihre <strong>E-Mail-Adresse</strong> ist erforderlich für die Bestätigung. Kontaktdaten ermöglichen
			wichtige Rückfragen zur Datenqualität.
		</p>
		<!-- Der frühere Satz „Ihre persönlichen Daten werden nie öffentlich
		     angezeigt!" war nachweislich falsch: Direkt darunter stehen die
		     Einwilligungen zur Namensnennung, und `/api/map/sightings` liefert
		     Vor- und Nachnamen aus, sobald `nameConsent` gesetzt ist
		     (`mapUtils.ts`). Die Kartensuche durchsucht sie, CSV-, XML- und
		     KML-Export tragen sie ebenfalls. Die neue Fassung sagt, was
		     tatsächlich passiert, und erklärt die Ankreuzfelder darunter,
		     statt ihnen zu widersprechen. -->
		<p class="text-base-content/70 mx-auto max-w-2xl text-sm md:text-base">
			<strong>Datenschutz:</strong> Ihre Kontaktdaten verwenden wir ausschließlich für Rückfragen zu Ihrer
			Meldung und geben sie nicht an Dritte weiter. Öffentlich sichtbar werden nur die Sichtungsdaten
			selbst — Datum, Position, Tierart und Anzahl. Ihr Name erscheint nur, wenn Sie das unten ausdrücklich
			erlauben.
		</p>
	</div>

	<!-- Personal Contact Information -->
	<div class="border-base-300 bg-base-200/50 rounded-lg border p-3 md:p-4">
		<h3 class="mb-3 flex gap-2 text-base font-semibold md:text-lg">
			<Icon icon="lucide:user" width="20" class="text-primary" />
			Ihre Kontaktdaten
		</h3>
		<div class="text-base-content/70 mb-4 text-sm">
			<p class="mb-1 flex items-center gap-2 font-medium">
				<Icon icon="lucide:mail" width="16" class="text-primary" />
				Ihre E-Mail-Adresse ist erforderlich für:
			</p>
			<ul class="list-inside list-disc space-y-1 text-xs">
				<li>Bestätigung Ihrer Sichtungsmeldung</li>
				<li>Wichtige Rückfragen zur Datenqualität</li>
				<li>Information über wissenschaftliche Ergebnisse (optional)</li>
			</ul>

			<div class="alert alert-info mt-4">
				<div class="text-xs">
					<p class="mb-2 flex items-center gap-2 font-medium">
						<Icon icon="lucide:save" width="16" class="text-info-strong" />
						Automatische Speicherung für Komfort
					</p>
					<p>
						Ihre Kontaktdaten werden nach erfolgreicher Übermittlung lokal gespeichert und bei der
						nächsten Sichtungsmeldung automatisch ausgefüllt.
					</p>

					{#if hasSavedContactData}
						<div class="mt-3 flex items-center justify-between">
							<span class="text-success-strong font-medium"
								>✓ Gespeicherte Kontaktdaten gefunden</span
							>
							<button
								type="button"
								class="btn btn-outline btn-error btn-sm min-h-11"
								onclick={clearContactData}
							>
								<Icon icon="lucide:trash-2" width="14" />
								Kontaktdaten löschen
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField name="firstName" />
			<FormField name="lastName" />
		</div>

		<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField name="email" />

			<FormField name="phone" />
		</div>

		<!-- Adresse (Straße/PLZ/Ort) wird nicht mehr abgefragt: Für Rückfragen
		     genügen E-Mail und Telefon, und weniger personenbezogene Daten sind
		     datenschutzrechtlich die bessere Wahl (Wunsch des Deutschen
		     Meeresmuseums). Schema-Einträge und DB-Spalten bleiben — die
		     Legacy-API führt `strasse`/`plz`/`ort` weiter. -->
	</div>

	<!-- Die Boot-/Schiffsangaben stehen seit dem 2026-07-31 auf Schritt 3
	     (`sections/BoatInfo.svelte`): Sie beschreiben die Beobachtungssituation,
	     nicht die Person. „Kontaktdaten löschen" oben räumt sie weiterhin mit
	     auf — sie bleiben Teil von `USER_CONTACT_FIELDS`. -->

	<!-- Additional Information Section -->
	<div class="border-base-300 bg-base-200/50 rounded-lg border p-3 md:p-4">
		<h3 class="mb-3 flex items-center gap-2 text-base font-semibold md:text-lg">
			<Icon icon="lucide:message-square" width="20" class="text-primary" />
			Zusätzliche Informationen
		</h3>

		<FormField name="notes" />
	</div>

	<!-- Privacy and Consent Section -->
	<div class="border-primary/20 bg-base-200/50 rounded-lg border p-3 md:p-4">
		<h3 class="mb-3 flex gap-2 text-base font-semibold md:text-lg">
			<Icon icon="lucide:lock" width="20" class="text-primary" />
			Datenschutz und Einverständnis
		</h3>

		<!-- Optional Consents für Namensnennung -->
		<div class="mt-6 space-y-4">
			<h4 class="flex items-center gap-2 text-base font-semibold">
				<Icon icon="lucide:pen-line" width="16" class="text-primary" />
				Optionale Veröffentlichung Ihres Namens
			</h4>
			<p class="text-base-content/70 mb-4 text-sm">
				Diese Einverständniserklärungen sind <strong>optional</strong>. Ihre Sichtung wird auch ohne
				diese Zustimmungen gespeichert.
			</p>

			<div class="space-y-3">
				<FormField name="nameConsent" />
				<FormField name="shipNameConsent" />
			</div>
		</div>

		<!-- Persistent Data Storage Consent -->
		<div class="mt-6 space-y-4">
			<h4 class="text-base font-semibold">
				<Icon icon="lucide:save" width="16" class="inline" /> Dauerhafte Speicherung der Kontaktdaten
			</h4>
			<p class="text-base-content/70 mb-4 text-sm">
				Möchten Sie, dass Ihre Kontaktdaten auch nach dem Schließen des Browser-Fensters erhalten
				bleiben? Dies erspart Ihnen das erneute Eingeben bei zukünftigen Sichtungsmeldungen.
			</p>

			<div class="space-y-3">
				<FormField name="persistentDataConsent" />
			</div>
		</div>
	</div>
</div>
