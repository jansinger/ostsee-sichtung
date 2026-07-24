<script lang="ts">
	import { validateStep } from '$lib/form/validation/stepValidation';
	import { createLogger } from '$lib/logger';
	import { getFormContext } from '$lib/report/formContext';
	import { toast } from '$lib/stores/toastState.svelte';
	import { getErrorCount, scrollToElement, scrollToFirstError } from '$lib/utils/fieldNavigation';
	import { formStepsConfig } from '$lib/report/formConfig';

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

	// Inline-Warnung erst nach erstem "Weiter"-Versuch auf einem ungültigen Schritt zeigen.
	// Speichert den Schritt-Index des letzten Versuchs; bei Schrittwechsel greift die Warnung
	// nicht mehr (unberührter Schritt = keine Warnung).
	let attemptedStep = $state<number | null>(null);

	// Step error messages for inline display (only when step is invalid)
	const stepErrorMessages = $derived(
		canGoNext ? [] : (Object.values(stepValidation.errors).filter(Boolean) as string[])
	);

	const showInlineError = $derived(attemptedStep === currentStep && stepErrorMessages.length > 0);

	const isLastStep = $derived(currentStep >= totalSteps - 1);
	const isFirstStep = $derived(currentStep <= 0);

	/** Scroll to form and focus the step header for screen reader announcement */
	function scrollAndFocusStep(): void {
		scrollToElement(document.getElementById('form-content'));
		// Defer focus to after Svelte re-renders the new step content
		requestAnimationFrame(() => {
			const stepHeader = document.querySelector('#form-content h2');
			if (stepHeader instanceof HTMLElement) {
				stepHeader.setAttribute('tabindex', '-1');
				stepHeader.focus({ preventScroll: true });
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

<!-- Inline validation error above navigation (erst nach erstem Versuch) -->
{#if showInlineError}
	<div class="alert alert-warning mb-2" role="alert">
		<span>{stepErrorMessages[0]}</span>
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
		class="btn btn-secondary"
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
