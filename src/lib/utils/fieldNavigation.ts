/**
 * Utility functions for navigating to form fields with errors
 */

/**
 * Scrolls to the first field with an error and focuses it
 * @param errors - Object containing field errors (from Yup validation)
 * @param fieldOrder - Optional array defining the order of fields to check
 */
export function scrollToFirstError(
	errors: Record<string, string | string[]>,
	fieldOrder?: string[]
): boolean {
	const errorFields = Object.keys(errors);

	if (errorFields.length === 0) {
		return false;
	}

	// Determine the first error field based on field order or natural order
	let firstErrorField: string | undefined;

	if (fieldOrder) {
		// Find the first field in the specified order that has an error
		firstErrorField = fieldOrder.find((field) => errorFields.includes(field)) || errorFields[0];
	} else {
		// Use the first error field found
		firstErrorField = errorFields[0];
	}

	if (firstErrorField) {
		// Try to find the field element
		const fieldElement = findFieldElement(firstErrorField);

		if (fieldElement) {
			scrollToElement(fieldElement);
			focusElement(fieldElement);
			return true;
		}
	}

	return false;
}

/**
 * Finds the DOM element for a given field name
 * Tries multiple strategies to locate the field
 */
function findFieldElement(fieldName: string): HTMLElement | null {
	// Strategy 1: Look for input/select/textarea with name attribute
	let element: HTMLElement | null = document.querySelector(`[name="${fieldName}"]`) as HTMLElement;

	if (element) {
		return element;
	}

	// Strategy 2: Look for element with id matching field name
	element = document.getElementById(fieldName);

	if (element) {
		return element;
	}

	// Strategy 3: Look for FormField wrapper with data-field attribute
	element = document.querySelector(`[data-field="${fieldName}"]`) as HTMLElement;

	if (element) {
		// Try to find input within the FormField wrapper
		const input = element.querySelector('input, select, textarea') as HTMLElement;
		return input || element;
	}

	// Strategy 4: Look for element with data-testid
	element = document.querySelector(`[data-testid="${fieldName}"]`) as HTMLElement;

	return element;
}

/**
 * Smoothly scrolls to an element with some offset for better UX
 */
export function scrollToElement(element: HTMLElement | null): void {
	if (!element) {
		return;
	}
	const yOffset = -80; // Offset to account for fixed headers
	const elementTop = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

	window.scrollTo({
		top: elementTop,
		behavior: 'smooth'
	});
}

/**
 * Focuses an element if it's focusable
 */
function focusElement(element: HTMLElement): void {
	// Small delay to ensure scroll animation starts before focus
	setTimeout(() => {
		if (element.focus) {
			element.focus();

			// If it's an input, select its content for easier editing
			if (element instanceof HTMLInputElement && element.type === 'text') {
				element.select();
			}
		}
	}, 500);
}

/**
 * Gets a user-friendly error message from field errors (internal use only)
 */
function _getErrorMessage(
	errors: Record<string, string | string[]>,
	fieldName: string
): string {
	const error = errors[fieldName];

	// Handle array of errors (multiple validation rules failed)
	if (Array.isArray(error)) {
		return error[0] || ''; // Return first error
	}

	return error || '';
}

/**
 * Counts the total number of validation errors
 */
export function getErrorCount(errors: Record<string, string | string[]>): number {
	return Object.keys(errors).length;
}
