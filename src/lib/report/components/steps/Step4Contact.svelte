<!--
  Step 3: Contact Information and Observer Details
  Personal information, boat details, and additional observations
-->
<script lang="ts">
	import { Anchor, MessageSquare, User, Trash2 } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import FormField from '../form/fields/FormField.svelte';
	import { clearAllStorage, loadUserContactData } from '$lib/storage/localStorage';
	import { createLogger } from '$lib/logger';

	const logger = createLogger('report:step4-contact');

	// Check if user has saved contact data
	let hasSavedContactData = $state(false);

	$effect(() => {
		const savedData = loadUserContactData();
		hasSavedContactData = Object.keys(savedData).length > 0;
	});

	function clearContactData() {
		if (confirm('Sind Sie sicher, dass Sie alle gespeicherten Kontaktdaten löschen möchten?')) {
			clearAllStorage();
			hasSavedContactData = false;
			logger.info('User contact data cleared by user request');
			
			// Reload page to clear form data
			if (typeof window !== 'undefined') {
				window.location.reload();
			}
		}
	}
</script>

<div class="space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 text-center">
		<div class="flex justify-center">
			<div class="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
				<Icon src={User} size="24" class="text-primary" />
			</div>
		</div>
		<h2 class="text-base-content text-2xl font-bold">Kontaktdaten & Abschluss</h2>
		<p class="text-base-content/70 mx-auto max-w-2xl">
			Ihre <strong>E-Mail-Adresse</strong> ist erforderlich für die Bestätigung. Kontaktdaten
			ermöglichen wichtige Rückfragen zur Datenqualität. <strong>Datenschutz:</strong> Ihre persönlichen
			Daten werden nie öffentlich angezeigt!
		</p>
		<div class="flex justify-center">
			<div class="badge badge-outline badge-success text-center min-h-fit h-auto py-2 px-3 whitespace-normal sm:whitespace-nowrap max-w-xs sm:max-w-none">
				Schritt 4 von 4 - Fast geschafft!
			</div>
		</div>
	</div>

	<!-- Personal Contact Information -->
	<div class="card bg-base-200 shadow-sm">
		<div class="card-body">
			<h3 class="card-title flex items-center gap-2 text-lg">
				<Icon src={User} size="20" class="text-primary" />
				Ihre Kontaktdaten
			</h3>
			<div class="text-base-content/70 mb-4 text-sm">
				<p class="mb-1 font-medium">📧 Ihre E-Mail-Adresse ist erforderlich für:</p>
				<ul class="list-inside list-disc space-y-1 text-xs">
					<li>Bestätigung Ihrer Sichtungsmeldung</li>
					<li>Wichtige Rückfragen zur Datenqualität</li>
					<li>Information über wissenschaftliche Ergebnisse (optional)</li>
				</ul>
				
				<div class="alert alert-info mt-4">
					<div class="text-xs">
						<p class="font-medium">💾 Automatische Speicherung für Komfort</p>
						<p>Ihre Kontaktdaten werden nach erfolgreicher Übermittlung lokal gespeichert und bei der nächsten Sichtungsmeldung automatisch ausgefüllt.</p>
						
						{#if hasSavedContactData}
							<div class="mt-3 flex items-center justify-between">
								<span class="text-success font-medium">✓ Gespeicherte Kontaktdaten gefunden</span>
								<button 
									type="button"
									class="btn btn-ghost btn-xs text-error hover:bg-error/10"
									onclick={clearContactData}
								>
									<Icon src={Trash2} size="14" />
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
				<summary class="collapse-title text-sm font-medium">
					📍 Adresse (optional, für postalische Zusendungen)
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
	</div>

	<!-- Boat Information Section -->
	<div class="card bg-base-200 shadow-sm">
		<div class="card-body">
			<h3 class="card-title flex items-center gap-2 text-lg">
				<Icon src={Anchor} size="20" class="text-primary" />
				Boot-/Schiffsinformationen
			</h3>
			<p class="text-base-content/70 mb-4 text-sm">
				Diese Informationen helfen bei der Bewertung möglicher Störungen
			</p>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField name="shipName" />

				<FormField name="homePort" />
			</div>

			<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-1">
				<FormField name="boatType" />
			</div>
		</div>
	</div>

	<!-- Additional Information Section -->
	<div class="card bg-base-200 shadow-sm">
		<div class="card-body">
			<h3 class="card-title flex items-center gap-2 text-lg">
				<Icon src={MessageSquare} size="20" class="text-primary" />
				Zusätzliche Informationen
			</h3>

			<FormField name="notes" />
		</div>
	</div>

	<!-- Privacy and Consent Section -->
	<div class="card bg-base-200 border-primary/20 shadow-sm">
		<div class="card-body">
			<h3 class="card-title flex items-center gap-2 text-lg">🔒 Datenschutz und Einverständnis</h3>

			<!-- Optional Consents für Namensnennung -->
			<div class="mt-6 space-y-4">
				<h4 class="text-base font-semibold">📝 Optionale Veröffentlichung Ihres Namens</h4>
				<p class="text-base-content/70 mb-4 text-sm">
					Diese Einverständniserklärungen sind <strong>optional</strong>. Ihre Sichtung wird auch
					ohne diese Zustimmungen gespeichert.
				</p>

				<div class="space-y-3">
					<FormField name="nameConsent" />
					<FormField name="shipNameConsent" />
				</div>
			</div>

			<!-- Persistent Data Storage Consent -->
			<div class="mt-6 space-y-4">
				<h4 class="text-base font-semibold">💾 Dauerhafte Speicherung der Kontaktdaten</h4>
				<p class="text-base-content/70 mb-4 text-sm">
					Möchten Sie, dass Ihre Kontaktdaten auch nach dem Schließen des Browser-Fensters erhalten bleiben?
					Dies erspart Ihnen das erneute Eingeben bei zukünftigen Sichtungsmeldungen.
				</p>

				<div class="space-y-3">
					<FormField name="persistentDataConsent" />
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Card hover effects */
	.card {
		transition: all 0.2s ease;
	}

	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 25px -8px oklch(var(--b3));
	}

	/* Special styling for privacy section */
	.border-primary\/20 {
		border-color: oklch(var(--p) / 0.2);
	}

	/* Collapse styling */
	.collapse {
		border: 1px solid oklch(var(--b3));
		border-radius: 0.75rem;
	}

	.collapse-title {
		padding: 1rem;
	}

	.collapse[open] .collapse-title {
		border-bottom: 1px solid oklch(var(--b3));
	}

	/* Alert styling */
	.alert {
		border-radius: 0.75rem;
		border: 1px solid oklch(var(--in) / 0.2);
	}

	.alert ul {
		margin-top: 0.5rem;
	}

	.alert li {
		margin-left: 1rem;
	}

	/* Form field styling */
	:global(.form-control .label-text) {
		align-items: center;
	}
</style>
