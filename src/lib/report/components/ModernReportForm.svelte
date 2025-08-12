<script lang="ts">
	import StepNavigation from './form/StepNavigation.svelte';

	import FormActions from './form/FormActions.svelte';
	import RequiredConsent from './form/RequiredConsent.svelte';

	import { submitSightingForm } from '$lib/form/submitSightingForm';
	import { sightingSchema } from '$lib/form/validation/sightingSchema';
	import { createLogger } from '$lib/logger';
	import { initialFormState } from '$lib/report/formConfig';
	import {
		clearStorage,
		loadFromStorage,
		loadUserContactData,
		saveToStorage,
		saveUserContactDataWithConsent,
		setupSessionCleanup,
		STORAGE_KEYS,
		type UserContactData
	} from '$lib/storage/localStorage';
	import { createId } from '@paralleldrive/cuid2';
	import { formStepsConfig } from '../formConfig';
	import type { FormContext, SightingFormData } from '../types';
	import Form from './form/Form.svelte';
	import FormSteps from './form/FormSteps.svelte';
	import Step1LocationTime from './steps/Step1LocationTime.svelte';
	import Step2SightingDetails from './steps/Step2SightingDetails.svelte';
	import Step3Observations from './steps/Step3Observations.svelte';
	import Step4Contact from './steps/Step4Contact.svelte';

	const logger = createLogger('report:modern-report-form');

	let {
		onSubmit = async (value) => {
			logger.info({ value }, 'Form submitted:');
		},
		onCancel = () => {}
	}: {
		onSubmit?: (data: SightingFormData) => Promise<void>;
		onCancel?: () => void;
	} = $props();

	// Lade gespeicherte Benutzer-Kontaktdaten
	const savedUserContactData = loadUserContactData();
	
	// Kombiniere initial state mit persistenten Benutzer-Kontaktdaten
	const initialFormData = { 
		...initialFormState, 
		...savedUserContactData,
		referenceId: createId() 
	};

	// Gespeicherte Formulardaten oder Initialwerte laden
	const savedFormData = loadFromStorage(STORAGE_KEYS.FORM_DATA, {
		...initialFormData
	});

	// Status für erfolgreiche Übermittlung
	let submissionSuccess = $state(false);
	let submissionId = $state<number | null>(null);
	let submissionError = $state<string | null>(null);

	// Formular initialisieren
	const formProps = {
		initialValues: { ...savedFormData },
		validationSchema: sightingSchema,
		onSubmit: async (values: SightingFormData) => {
			try {
				const result = await submitSightingForm(values);
				submissionId = result.id;
				submissionSuccess = result.success;
				
				// Speichere Benutzer-Kontaktdaten für zukünftige Formulare basierend auf Zustimmung
				if (result.success) {
					const userContactData: UserContactData = {
						firstName: values.firstName || undefined,
						lastName: values.lastName || undefined,
						email: values.email || undefined,
						phone: values.phone || undefined,
						street: values.street || undefined,
						zipCode: values.zipCode || undefined,
						city: values.city || undefined,
						shipName: values.shipName || undefined,
						homePort: values.homePort || undefined,
						boatType: values.boatType || undefined,
						nameConsent: values.nameConsent || false,
						shipNameConsent: values.shipNameConsent || false,
						persistentDataConsent: values.persistentDataConsent || false
					};
					saveUserContactDataWithConsent(userContactData);
					logger.info('User contact data saved with consent-based persistence');
				}
				
				clearStorage(); // Clears form data but keeps user contact data
				return onSubmit(values);
			} catch (error: unknown) {
				submissionError = (error as Error)?.message || 'Unbekannter Fehler bei der Übermittlung';
				logger.error(error, submissionError);
				throw error;
			}
		}
	};

	let formContext: FormContext = $state({} as FormContext);

	// Formularstatus
	async function handleFinalSubmit(e: Event): Promise<void> {
		logger.info('Final submission:');
		return formContext.handleSubmit(e);
	}

	function onReset() {
		clearStorage();
		currentStep = 0;
		formContext.updateInitialValues(initialFormData);
	}

	let currentStep: number = $state(-1);

	const form = $derived(formContext.form);

	// Session cleanup initialization
	$effect(() => {
		setupSessionCleanup();
	});

	$effect(() => {
		logger.info(
			{ form: $form, uploaded: $form.uploadedFiles },
			`Aktueller Schritt: ${currentStep}`
		);
		saveToStorage(STORAGE_KEYS.FORM_DATA, $form);
	});
</script>

<div class="bg-base-100 min-h-screen py-8">
	<div class="container mx-auto max-w-4xl px-4">
		<Form {...formProps} bind:context={formContext}>
			<!-- Form Title -->
			<div class="mb-8 text-center">
				<h1 class="text-base-content mb-2 text-3xl font-bold lg:text-4xl">
					Meerestier-Sichtung melden
				</h1>
				<p class="text-base-content/70 text-lg">
					Helfen Sie der Forschung mit Ihrer Wal- oder Robbensichtung
				</p>
			</div>

			<!-- Success Message -->
			{#if submissionSuccess}
				<div class="alert alert-success mb-6" role="alert">
					<span>Erfolgreich gesendet: {submissionId}</span>
				</div>
			{/if}

			<!-- Error Message -->
			{#if submissionError}
				<div class="alert alert-error mb-6" role="alert">
					<span>{submissionError}</span>
				</div>
			{/if}

			<!-- Step Progress -->
			<FormSteps steps={formStepsConfig} bind:currentStep />

			<!-- Form Content -->
			<div class="card bg-base-100 shadow-xl" id="form-content">
				<div class="card-body p-6 lg:p-8">
					<!-- Step Content -->
					<div class="min-h-[400px]">
						{#if currentStep === 0}
							<Step1LocationTime />
						{:else if currentStep === 1}
							<Step2SightingDetails />
						{:else if currentStep === 2}
							<Step3Observations />
						{:else if currentStep === 3}
							<Step4Contact />
						{/if}
					</div>

					<!-- Required Privacy Consent - Prominent placement before submit -->
					<RequiredConsent {currentStep} />

					<StepNavigation bind:currentStep onSubmit={handleFinalSubmit} />
				</div>
			</div>

			<FormActions {onCancel} {onReset}></FormActions>

			<!-- Enhanced Help Text -->
			<div class="card bg-base-200/50 border-base-300 mt-8 border">
				<div class="card-body p-4">
					<details class="collapse">
						<summary class="collapse-title cursor-pointer text-sm font-medium">
							💡 Hilfe & Tipps für eine wertvolle Sichtungsmeldung
						</summary>
						<div class="collapse-content text-base-content/80 text-sm">
							<div class="space-y-4 pt-4">
								<div class="alert alert-info">
									<div>
										<h4 class="font-semibold">🎯 Warum ist Ihre Meldung wichtig?</h4>
										<p class="mt-1">
											Jede Sichtung hilft Wissenschaftlern dabei, Wanderrouten zu verstehen, 
											Populationen zu überwachen und Schutzmaßnahmen zu entwickeln. Ihre Beobachtung 
											trägt direkt zum Artenschutz bei!
										</p>
									</div>
								</div>

								<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div class="card bg-base-100 p-4">
										<h4 class="font-semibold mb-2">📍 Schritt 1: Position & Zeit</h4>
										<ul class="space-y-1 text-xs">
											<li><strong>GPS-Koordinaten:</strong> Am wertvollsten für die Forschung</li>
											<li><strong>Gewässername:</strong> Falls keine GPS-Daten verfügbar</li>
											<li><strong>Genaue Zeit:</strong> Hilft bei Verhaltensanalysen</li>
											<li><strong>Tipp:</strong> Screenshots von Navigations-Apps sind hilfreich</li>
										</ul>
									</div>

									<div class="card bg-base-100 p-4">
										<h4 class="font-semibold mb-2">🐋 Schritt 2: Sichtungsdetails</h4>
										<ul class="space-y-1 text-xs">
											<li><strong>Tierart:</strong> Bei Unsicherheit "Unbekannt" wählen</li>
											<li><strong>Anzahl:</strong> Auch Schätzungen sind wertvoll</li>
											<li><strong>Jungtiere:</strong> Wichtig für Populationsstudien</li>
											<li><strong>Entfernung:</strong> Hilft bei der Einschätzung der Beobachtung</li>
										</ul>
									</div>

									<div class="card bg-base-100 p-4">
										<h4 class="font-semibold mb-2">👀 Schritt 3: Beobachtungen</h4>
										<ul class="space-y-1 text-xs">
											<li><strong>Verhalten:</strong> Fütterung, Ruhen, Springen, etc.</li>
											<li><strong>Umwelt:</strong> Seegang und Sichtweite beeinflussen Sichtungen</li>
											<li><strong>Fotos/Videos:</strong> Extrem hilfreich für Artbestimmung</li>
											<li><strong>Tipp:</strong> Auch unscharfe Bilder können nützlich sein</li>
										</ul>
									</div>

									<div class="card bg-base-100 p-4">
										<h4 class="font-semibold mb-2">📧 Schritt 4: Kontaktdaten</h4>
										<ul class="space-y-1 text-xs">
											<li><strong>E-Mail:</strong> Für Bestätigung und Rückfragen</li>
											<li><strong>Boot-Info:</strong> Hilft bei Störungsanalysen</li>
											<li><strong>Datenschutz:</strong> Nur Sichtungsdaten werden öffentlich</li>
											<li><strong>Optional:</strong> Name nur mit Ihrer Zustimmung sichtbar</li>
										</ul>
									</div>
								</div>

								<div class="divider"></div>

								<div class="space-y-3">
									<h4 class="font-semibold">🦭 Hilfe bei der Artenbestimmung</h4>
									<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
										<div class="text-center">
											<div class="text-lg">🐋</div>
											<strong>Schweinswal</strong>
											<p class="text-xs mt-1">Klein, dunkler Rücken, dreieckige Rückenflosse</p>
										</div>
										<div class="text-center">
											<div class="text-lg">🦭</div>
											<strong>Kegelrobbe</strong>
											<p class="text-xs mt-1">Groß, kegelförmiger Kopf, lange Schnauze</p>
										</div>
										<div class="text-center">
											<div class="text-lg">🐟</div>
											<strong>Seehund</strong>
											<p class="text-xs mt-1">Rundlicher Kopf, große Augen, V-förmige Nasenlöcher</p>
										</div>
									</div>
								</div>

								<div class="alert alert-warning">
									<div>
										<h4 class="font-semibold">⚠️ Totfunde - Besonders wichtig!</h4>
										<p class="mt-1 text-xs">
											Tote Tiere liefern wichtige Erkenntnisse über Todesursachen und Gesundheit der Population. 
											<strong>Bitte nicht berühren!</strong> Melden Sie den Fund auch an die örtlichen Behörden 
											(Wasserschutzpolizei, Nationalparkamt).
										</p>
									</div>
								</div>
							</div>
						</div>
					</details>
				</div>
			</div>
		</Form>
	</div>
</div>

<style>
	.container {
		max-width: 1024px;
	}

	.card {
		transition: all 0.2s ease;
	}

	.alert {
		animation: slideInDown 0.3s ease;
	}

	@keyframes slideInDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 640px) {
		.container {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.card-body {
			padding: 1rem !important;
		}
	}
</style>
