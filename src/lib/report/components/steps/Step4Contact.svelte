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
	<div class="space-y-2 px-2 text-center sm:px-0">
		<div class="flex justify-center">
			<div
				class="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full sm:h-12 sm:w-12"
			>
				<Icon icon="lucide:user" width="20" class="text-primary sm:h-6 sm:w-6" />
			</div>
		</div>
		<h2 class="text-base-content text-xl font-bold sm:text-2xl">Kontaktdaten & Abschluss</h2>
		<p class="text-base-content/70 mx-auto max-w-2xl text-sm sm:text-base">
			Ihre <strong>E-Mail-Adresse</strong> ist erforderlich für die Bestätigung. Kontaktdaten
			ermöglichen wichtige Rückfragen zur Datenqualität. <strong>Datenschutz:</strong> Ihre persönlichen
			Daten werden nie öffentlich angezeigt!
		</p>
		<div class="flex justify-center">
			<div
				class="badge badge-outline badge-primary h-auto min-h-fit max-w-xs px-3 py-2 text-center text-xs whitespace-normal sm:max-w-none sm:text-sm sm:whitespace-nowrap"
			>
				Schritt 4 von 4 - Fast geschafft!
			</div>
		</div>
	</div>

	<!-- Personal Contact Information -->
	<div class="border-base-300 bg-base-200/50 rounded-lg border p-3 sm:p-4">
		<h3 class="mb-3 flex gap-2 text-base font-semibold sm:text-lg">
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
						<Icon icon="lucide:save" width="16" class="text-info" />
						Automatische Speicherung für Komfort
					</p>
					<p>
						Ihre Kontaktdaten werden nach erfolgreicher Übermittlung lokal gespeichert und bei der
						nächsten Sichtungsmeldung automatisch ausgefüllt.
					</p>

					{#if hasSavedContactData}
						<div class="mt-3 flex items-center justify-between">
							<span class="text-success font-medium">✓ Gespeicherte Kontaktdaten gefunden</span>
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

		<!-- Address (optional) -->
		<details class="bg-base-100 collapse mt-4">
			<summary class="collapse-title min-h-0 py-2 text-sm font-medium">
				<span class="inline-flex items-center gap-1.5">
					<Icon icon="lucide:map-pin" width="14" class="text-primary" />
					Adresse (optional)
				</span>
			</summary>
			<div class="collapse-content space-y-4 pt-4">
				<FormField name="street" />

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField name="zipCode" />

					<FormField name="city" />
				</div>
			</div>
		</details>
	</div>

	<!-- Boat Information Section -->
	<div class="border-base-300 bg-base-200/50 rounded-lg border p-3 sm:p-4">
		<h3 class="mb-3 flex items-center gap-2 text-base font-semibold sm:text-lg">
			<Icon icon="lucide:anchor" width="20" class="text-primary" />
			Boot-/Schiffsinformationen
		</h3>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField name="shipName" />

			<FormField name="homePort" />
		</div>

		<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-1">
			<FormField name="boatType" />
		</div>
	</div>

	<!-- Additional Information Section -->
	<div class="border-base-300 bg-base-200/50 rounded-lg border p-3 sm:p-4">
		<h3 class="mb-3 flex items-center gap-2 text-base font-semibold sm:text-lg">
			<Icon icon="lucide:message-square" width="20" class="text-primary" />
			Zusätzliche Informationen
		</h3>

		<FormField name="notes" />
	</div>

	<!-- Privacy and Consent Section -->
	<div class="border-primary/20 bg-base-200/50 rounded-lg border p-3 sm:p-4">
		<h3 class="mb-3 flex gap-2 text-base font-semibold sm:text-lg">
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
