<!--
  Step 3: Contact Information and Observer Details
  Personal information, boat details, and additional observations
-->
<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { confirmAndClearContactData } from '$lib/report/clearContactData';
	import { getFormContext } from '$lib/report/formContext';
	import { hasUploadedMedia, isFromLand } from '$lib/report/formConfig';
	import { loadUserContactData } from '$lib/storage/localStorage';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';

	const { form, updateField } = getFormContext();

	// Task 15: `mediaConsent` fragt nach der Freigabe von Aufnahmen — ohne
	// mindestens eine abgeschlossen hochgeladene Aufnahme ist das eine Frage
	// ohne Bezugsgegenstand (dieselbe Fehlerklasse wie `shipNameConsent` bei
	// Land unten). `hasUploadedMedia` (formConfig.ts) ist dieselbe Funktion,
	// die `getFormSteps` für die Validierung dieses Feldes aufruft — beide
	// Seiten (Markup hier, Validierung dort) lesen also garantiert dasselbe
	// Ergebnis, statt zwei eigene Bedingungen zu pflegen. Geprüft gegen
	// `$form.uploadedFiles`, nicht gegen den client-seitigen Medien-Store: Der
	// gehört den Dropzone-Instanzen auf Schritt 1/2 und bleibt leer, solange
	// keine von beiden gemountet ist — bei einem Reload direkt auf diesem
	// Schritt sonst fälschlich leer.
	let hasMedia = $derived(hasUploadedMedia($form.uploadedFiles));

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

<div class="space-y-6 md:space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 px-2 text-center md:px-0">
		<!-- Unterhalb `md` ausgeblendet: dekorativ, siehe Step1LocationTime.svelte. -->
		<div class="hidden justify-center md:flex">
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
		     KML-Export tragen sie ebenfalls — die sind allerdings, anders als in
		     der Analyse angenommen, nur für Admins erreichbar
		     (`requireUserRole(['admin','superadmin'])`); der öffentliche Weg ist
		     allein die Karten-API.

		     „Ortsangaben zum Seegebiet" steht bewusst in der Aufzählung:
		     `/api/map/sightings` liefert `waterway` und `seaMark` unkonditioniert
		     aus. Das sind Freitextfelder, die der Melder selbst tippt und die
		     beiläufig Personenbezug tragen können — wer sie ausfüllt, soll
		     wissen, dass sie öffentlich werden.

		     Die neue Fassung sagt, was tatsächlich passiert, und erklärt die
		     Ankreuzfelder darunter, statt ihnen zu widersprechen. -->
		<p class="text-base-content/70 mx-auto max-w-2xl text-sm md:text-base">
			<strong>Datenschutz:</strong> Ihre Kontaktdaten verwenden wir ausschließlich für Rückfragen zu Ihrer
			Meldung und geben sie nicht an Dritte weiter. Öffentlich sichtbar werden nur die Sichtungsdaten
			selbst — Datum, Position, Tierart, Anzahl und Ihre Ortsangaben zum Seegebiet. Ihr Name erscheint
			nur, wenn Sie das unten ausdrücklich erlauben.
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
				<li>Bestätigung Ihrer Meldung</li>
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
						nächsten Meldung automatisch ausgefüllt.
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
	<!-- `data-consent-surface` grenzt die Fläche ab, die die Fassungskennungen
	     bezeugen — hier die äußere, gemeinsame: Die Überschrift „Datenschutz und
	     Einverständnis" rahmt alle vier Einwilligungen darunter. Die beiden
	     Gruppen tragen je eine eigene, innere Fläche; `consentSurfaces.svelte.test.ts`
	     hasht pro Feld die äußere Fläche, die eigene Gruppe und den eigenen
	     Ankreuztext getrennt, sodass eine Gruppen-Überschrift nur die Kennungen
	     ihrer eigenen Gruppe bewegt. Text, der zu einer Einwilligung gehört,
	     gehört deshalb INNERHALB der passenden Fläche. -->
	<div class="border-primary/20 bg-base-200/50 rounded-lg border p-3 md:p-4" data-consent-surface>
		<h3 class="mb-3 flex gap-2 text-base font-semibold md:text-lg">
			<Icon icon="lucide:lock" width="20" class="text-primary" />
			Datenschutz und Einverständnis
		</h3>

		<!-- Optionale Einwilligungen: Namensnennung (eigener Name, Schiffsname)
		     und Veröffentlichung von Aufnahmen. Die Überschrift muss alle drei
		     Felder darunter tragen — `mediaConsent` ist keine Namensnennung, hier
		     stand bis zum Review von Task 14 (2026-08-06) noch „…Ihres Namens". -->
		<div class="mt-6 space-y-4" data-consent-surface>
			<h4 class="flex items-center gap-2 text-base font-semibold">
				<Icon icon="lucide:pen-line" width="16" class="text-primary" />
				Optionale Veröffentlichung von Namen und Aufnahmen
			</h4>
			<p class="text-base-content/70 mb-4 text-sm">
				Diese Einverständniserklärungen sind <strong>optional</strong>. Ihre Meldung wird auch ohne
				diese Zustimmungen gespeichert.
			</p>

			<div class="space-y-3">
				<FormField name="nameConsent" />
				<!-- Einwilligung zur Veröffentlichung eines Schiffsnamens, den bei
				     einer Land-Meldung nie jemand erhoben hat (`BoatInfo.svelte`
				     blendet `shipName` dort aus) — eine Frage ohne
				     Bezugsgegenstand. `getFormSteps` (formConfig.ts) nimmt
				     `shipNameConsent` bereits bei Land aus der Validierung;
				     dieselbe Bedingung (`isFromLand`) hier, sonst bliebe das Feld
				     sichtbar, aber unvalidiert ausgefüllt. -->
				{#if !isFromLand($form.sightingFrom)}
					<FormField name="shipNameConsent" />
				{/if}
				<!-- `mediaConsent` steht seit dem 2026-08-05 hier bei den übrigen
				     Einwilligungen, nicht mehr bei der Dropzone auf Schritt 2
				     (`sections/Media.svelte`). Alle vier Felder mit Nachweisspalten
				     (`…_am`/`…_version` in `schema.ts`) stehen damit an einer Stelle;
				     die Datei-Felder selbst bleiben auf Schritt 2. In der Admin-Maske
				     bleibt das Feld dagegen bei der Dropzone stehen — sie bindet diese
				     Komponente hier nicht ein.

				     Eine Einwilligung zur Veröffentlichung von Aufnahmen, die es nicht
				     gibt, ist eine Frage ohne Bezugsgegenstand — dieselbe Fehlerklasse
				     wie `shipNameConsent` oben bei einer Land-Meldung. `getFormSteps`
				     (formConfig.ts) nimmt `mediaConsent` bei fehlender Aufnahme aus der
				     Validierung — über dieselbe Funktion `hasUploadedMedia`, die auch
				     `hasMedia` hier oben berechnet, statt einer zweiten, separat
				     gepflegten Bedingung. Ohne diese Klammer hier bliebe das Feld
				     sichtbar, aber unvalidiert ausgefüllt (die „halbe Miete" aus der
				     Doku dort). -->
				{#if hasMedia}
					<FormField name="mediaConsent" />
				{/if}
			</div>
		</div>

		<!-- Persistent Data Storage Consent -->
		<div class="mt-6 space-y-4" data-consent-surface>
			<h4 class="text-base font-semibold">
				<Icon icon="lucide:save" width="16" class="inline" /> Dauerhafte Speicherung der Kontaktdaten
			</h4>
			<p class="text-base-content/70 mb-4 text-sm">
				Möchten Sie, dass Ihre Kontaktdaten auch nach dem Schließen des Browser-Fensters erhalten
				bleiben? Dies erspart Ihnen das erneute Eingeben bei zukünftigen Meldungen.
			</p>

			<div class="space-y-3">
				<FormField name="persistentDataConsent" />
			</div>
		</div>
	</div>
</div>
