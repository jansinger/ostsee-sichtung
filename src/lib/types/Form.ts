/**
 * Form-related type definitions
 */

import { sightingSchema } from '$lib/form/validation/sightingSchema';
import * as yup from 'yup';

export interface FormStep {
	id: string;
	title: string;
	description: string;
	fields: string[];
	isOptional?: boolean;
}

export interface FormProgress {
	currentStep: number;
	totalSteps: number;
	completedSteps: Set<number>;
	isStepValid: (stepIndex: number) => boolean;
}

export type SightingFormData = yup.InferType<typeof sightingSchema>;

export type SightingFormValues = Omit<SightingFormData, 'uploadedFiles'>;

// Import the actual FormAPI type from svelte-forms-lib
export type FormContext = ReturnType<
	typeof import('svelte-forms-lib').createForm<SightingFormData>
>;

export type FormContextKey = symbol;
