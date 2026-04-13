const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateParam(value: string | null | undefined): value is string {
	return typeof value === 'string' && DATE_REGEX.test(value);
}
