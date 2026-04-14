/**
 * Form-related type definitions
 */

import type { FormApi } from '$lib/form/createForm';
import { sightingSchema } from '$lib/form/validation/sightingSchema';
import type { MediaStore } from '$lib/utils/media/MediaFile';
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

export type SightingFormValues = Omit<SightingFormData, 'uploadedFiles'> & {
	sightingDatetime?: Date;
	inBalticSea?: boolean;
	inBalticSeaGeo?: boolean;
};

export type FormContext = FormApi<SightingFormData> & {
	mediaStore: MediaStore;
};

export type FormContextKey = symbol;
