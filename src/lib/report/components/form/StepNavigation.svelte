<script lang="ts">
	import { browser } from '$app/environment';
	import { isStepValid, validateStep } from '$lib/form/validation/stepValidation';
	import { createLogger } from '$lib/logger';
	import { getFormContext } from '$lib/report/formContext';
	import { toastStore } from '$lib/stores/toastStore';
	import { getErrorCount, scrollToElement, scrollToFirstError } from '$lib/utils/fieldNavigation';
	import { formStepsConfig } from '../../formConfig';

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

	// Reactive validation using safe validation function
	const canGoNext = $derived(isStepValid(currentStep, $form));

	const isLastStep = $derived(currentStep >= totalSteps - 1);
	const isFirstStep = $derived(currentStep <= 0);

	const formContent = browser ? (document.getElementById('form-content') as HTMLElement) : null;

	// Navigation functions
	async function nextStep(): Promise<void> {
		try {
			if (!canGoNext) {
				logger.warn({ currentStep }, 'Validation failed for current step');
				await showValidationError();
				return;
			}

			if (isLastStep) {
				await handleFormSubmission();
			} else {
				currentStep += 1;
				scrollToElement(formContent);
				logger.debug(`Navigated to step ${currentStep}`);
			}
		} catch (error) {
			logger.error({ error }, 'Error in nextStep navigation');
		}
	}

	async function previousStep(): Promise<void> {
		try {
			if (!isFirstStep) {
				currentStep -= 1;
				scrollToElement(formContent);
				logger.debug(`Navigated back to step ${currentStep}`);
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
			toastStore.error('Fehler beim Absenden des Formulars. Bitte versuchen Sie es erneut.');
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
		toastStore.error(errorMessage, {
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

	<div class="flex-1 text-center">
		<span class="text-sm font-medium" aria-live="polite">
			Schritt {currentStep + 1} von {totalSteps}
		</span>
		<progress
			class="progress progress-primary mt-2 w-full max-w-xs"
			value={currentStep + 1}
			max={totalSteps}
			aria-label={`Fortschritt: Schritt ${currentStep + 1} von ${totalSteps}`}
		></progress>
	</div>

	<button
		type="button"
		onclick={nextStep}
		disabled={$isSubmitting}
		class="btn btn-primary"
		class:loading={$isSubmitting}
		aria-label={isLastStep ? 'Formular absenden' : 'Nächster Schritt'}
	>
		{#if $isSubmitting}
			<span class="loading loading-spinner loading-sm"></span>
		{/if}
		{isLastStep ? 'Absenden' : 'Weiter →'}
	</button>
</nav>

<style>
	.btn {
		transition: all 0.2s ease;
	}

	.btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}
</style>
