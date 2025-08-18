/**
 * @fileoverview Date/Time utilities for Legacy REST API - Timezone-safe formatting
 * 
 * Provides consistent UTC-based date/time formatting to avoid timezone-related 
 * test failures between local development and CI environments.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

/**
 * Formats a Date object to DD.MM.YY format using UTC (timezone-safe)
 * 
 * @param date - Date object to format
 * @returns Date string in DD.MM.YY format
 */
export function formatDateDDMMYY(date: Date): string {
	// Use UTC methods to ensure consistent formatting across timezones
	const day = date.getUTCDate().toString().padStart(2, '0');
	const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
	const year = date.getUTCFullYear().toString().slice(-2); // Last 2 digits
	
	return `${day}.${month}.${year}`;
}

/**
 * Formats a Date object to HH:MI format using UTC (timezone-safe)
 * 
 * @param date - Date object to format
 * @returns Time string in HH:MI format (24-hour)
 */
export function formatTimeHHMI(date: Date): string {
	// Use UTC methods to ensure consistent formatting across timezones
	const hours = date.getUTCHours().toString().padStart(2, '0');
	const minutes = date.getUTCMinutes().toString().padStart(2, '0');
	
	return `${hours}:${minutes}`;
}

/**
 * Converts Date to Unix timestamp (timezone-safe)
 * 
 * @param date - Date object to convert
 * @returns Unix timestamp (seconds since epoch)
 */
export function toUnixTimestamp(date: Date): number {
	return Math.floor(date.getTime() / 1000);
}