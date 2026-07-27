<script lang="ts">
	import { validateStep } from '$lib/form/validation/stepValidation';
	import { createLogger } from '$lib/logger';
	import { getFormContext } from '$lib/report/formContext';
	import { toast } from '$lib/stores/toastState.svelte';
	import {
		getErrorCount,
		scrollToFirstError,
		scrollToStepHeader
	} from '$lib/utils/fieldNavigation';
	import { formStepsConfig } from '$lib/report/formConfig';
	import {
		getStepAlertMessages,
		shouldShowStepAlert,
		type StepAttemptMarker
	} from './stepNavigationState';

	const logger = createLogger('report:StepNavigation');

	let {
		currentStep = $bindable(0),
		totalSteps = $bindable(formStepsConfig.length),
		onSubmit
	}: {
		onSubmit?: (e: Event) => Promise<void>;
		currentStep?: number;
		totalSteps?: number;
	} = $props();

	const formContext = getFormContext();
	const { isSubmitting, form, errors } = formContext;

	// Get field orders from form configuration
	const stepFieldOrders = formStepsConfig.map((step) => step.fields);

	// Single validation pass — used for both canGoNext and stepErrorMessages
	const stepValidation = $derived.by(() => validateStep(currentStep, $form));

	const canGoNext = $derived(stepValidation.isValid);

	// Tracks whether the user already attempted "Weiter"/"Absenden" on the
	// CURRENT step. Errors must never appear just from entering a step —
	// only after a failed navigation attempt (see stepNavigationState.ts).
	let attemptedStep = $state<StepAttemptMarker>(null);

	// Reset the attempt marker whenever currentStep changes — this covers
	// both our own next/previousStep() calls AND external changes via the
	// stepper in FormSteps.svelte (currentStep is a shared $bindable prop),
	// so a freshly (re-)entered step never shows a stale alert.
	$effect(() => {
		if (attemptedStep !== null && attemptedStep !== currentStep) {
			attemptedStep = null;
		}
	});

	// Whether the inline alert above the navigation should be visible
	const showStepAlert = $derived(shouldShowStepAlert(attemptedStep, currentStep, canGoNext));

	// All error messages of the current step, for inline display
	const stepErrorMessages = $derived(getStepAlertMessages(stepValidation.errors));

	const isLastStep = $derived(currentStep >= totalSteps - 1);
	const isFirstStep = $derived(currentStep <= 0);

	/**
	 * Scrollt zum Kopf des neuen Schritts (Icon/Überschrift/Badge) und fokussiert
	 * die Überschrift für die Screenreader-Ansage.
	 *
	 * U9: `#form-content` bleibt über den Schrittwechsel hinweg dasselbe Element,
	 * enthält aber auch den bisherigen Schritt-Inhalt — Scrollen direkt dorthin
	 * kann den Kopf des NEUEN Schritts (Badge/Überschrift) außerhalb des sichtbaren
	 * Bereichs lassen. `scrollToStepHeader` findet daher gezielt den Kopfbereich
	 * (Elternelement der `h2`, das laut Step-Konvention Icon+Badge umschließt).
	 *
	 * Suche UND Scroll werden verzögert, bis Svelte den neuen Schritt gerendert
	 * hat — sonst würden wir noch den Kopf des VORHERIGEN Schritts finden.
	 */
	function scrollAndFocusStep(): void {
		requestAnimationFrame(() => {
			const stepHeading = scrollToStepHeader('form-content');
			if (stepHeading) {
				stepHeading.setAttribute('tabindex', '-1');
				stepHeading.focus({ preventScroll: true });
			}
		});
	}

	// Navigation functions
	async function nextStep(): Promise<void> {
		try {
			if (!canGoNext) {
				logger.warn({ currentStep }, 'Validation failed for current step');
				attemptedStep = currentStep;
				await showValidationError();
				return;
			}

			if (isLastStep) {
				await handleFormSubmission();
			} else {
				currentStep += 1;
				scrollAndFocusStep();
			}
		} catch (error) {
			logger.error({ error }, 'Error in nextStep navigation');
		}
	}

	async function previousStep(): Promise<void> {
		try {
			if (!isFirstStep) {
				currentStep -= 1;
				scrollAndFocusStep();
			}
		} catch (error) {
			logger.error({ error }, 'Error in previousStep navigation');
		}
	}

	async function handleFormSubmission(): Promise<void> {
		if (!onSubmit) {
			logger.warn('No onSubmit handler provided');
			return;
		}

		try {
			// Create a synthetic submit event and call the handler
			const submitEvent = new Event('submit');
			await onSubmit(submitEvent);
			logger.info('Form submitted successfully');
		} catch (error) {
			logger.error({ error }, 'Error during form submission');
			toast.error('Fehler beim Absenden des Formulars. Bitte versuchen Sie es erneut.');
			// Navigate to first error field if validation failed
			await showValidationError();
		}
	}

	async function showValidationError(): Promise<void> {
		// Use the validation function that collects errors
		const { errors: stepErrors } = validateStep(currentStep, $form);
		const errorCount = getErrorCount(stepErrors);
		const currentStepName = formStepsConfig[currentStep]?.title || `Schritt ${currentStep + 1}`;

		if (errorCount === 0) {
			return;
		}

		// Update form errors with step-specific errors
		errors.update((currentErrors) => ({
			...currentErrors,
			...stepErrors
		}));

		let errorMessage: string;
		if (errorCount === 1) {
			errorMessage = `Bitte beheben Sie den Fehler in "${currentStepName}" bevor Sie fortfahren.`;
		} else {
			errorMessage = `Bitte beheben Sie die ${errorCount} Fehler in "${currentStepName}" bevor Sie fortfahren.`;
		}

		// Show toast notification
		toast.error(errorMessage, {
			title: 'Validierungsfehler',
			duration: 5000
		});

		// Navigate to first error field
		const fieldOrder = stepFieldOrders[currentStep] || [];
		const navigated = scrollToFirstError(stepErrors, fieldOrder);

		if (navigated) {
			logger.debug('Navigated to first error field');
		} else {
			logger.warn('Could not navigate to error field');
		}
	}
</script>

<!-- Inline validation error above navigation — only after a failed "Weiter"-attempt -->
{#if showStepAlert && stepErrorMessages.length > 0}
	<div class="alert alert-warning mb-2" role="alert">
		{#if stepErrorMessages.length === 1}
			<span>{stepErrorMessages[0]?.message}</span>
		{:else}
			<ul class="list-inside list-disc">
				{#each stepErrorMessages as { field, message } (field)}
					<li>{message}</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<!-- Navigation UI -->
<nav
	class="bg-base-200 flex items-center justify-between rounded-lg p-4"
	aria-label="Formular Navigation"
>
	<button
		type="button"
		onclick={previousStep}
		disabled={isFirstStep || $isSubmitting}
		class="btn btn-outline"
		aria-label="Vorheriger Schritt"
	>
		← Zurück
	</button>

	<button
		type="button"
		onclick={nextStep}
		disabled={$isSubmitting}
		class="btn btn-primary"
		aria-label={isLastStep ? 'Formular absenden' : 'Nächster Schritt'}
	>
		{#if $isSubmitting}
			<span class="loading loading-spinner loading-sm"></span>
		{/if}
		{isLastStep ? 'Absenden' : 'Weiter →'}
	</button>
</nav>
