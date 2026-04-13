const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isExistingCalendarDate(value: string): boolean {
	const [yearPart, monthPart, dayPart] = value.split('-');
	const year = Number(yearPart);
	const month = Number(monthPart);
	const day = Number(dayPart);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
	);
}

export function isValidDateParam(value: string | null | undefined): value is string {
	return typeof value === 'string' && DATE_REGEX.test(value) && isExistingCalendarDate(value);
}
