import { createLogger } from '$lib/logger';
import { formStepsConfig } from '$lib/report/formConfig';
import type { SightingFormData } from '$lib/report/types';
import type { Writable } from 'svelte/store';
import { ValidationError } from 'yup';
import { sightingSchema } from './sightingSchema';

const logger = createLogger('formValidation');

/**
 * Validiert den aktuellen Formularschritt
 *
 * @param currentStep - Der aktuelle Formularschritt
 * @param form - Der aktuelle Formularstatus
 * @param hasGpsPosition - Flag, ob GPS-Position verwendet wird
 * @returns Boolean, ob der aktuelle Schritt valide ist
 */
export function validateCurrentStep(
	currentStep: number,
	form: Writable<SightingFormData>,
	errors: Writable<Record<string, string>>
): boolean {
	let isValid = true;

	const validateFields = formStepsConfig[currentStep]?.fields;

	if (validateFields) {
		try {
			sightingSchema
				.pick(validateFields as Array<keyof SightingFormData>)
				.validateSync(form, { abortEarly: false });
		} catch (error) {
			isValid = false;
			logger.info({ error, form }, 'Validation errors found');
			if (error instanceof ValidationError && error.inner.length > 0) {
				error.inner.forEach((validationError) => {
					if (validationError.path && validationError.message) {
						errors.update((currentErrors) => ({
							...currentErrors,
							[String(validationError.path)]: validationError.message
						}));
					}
				});
			}
		}
	}

	return isValid;
}
