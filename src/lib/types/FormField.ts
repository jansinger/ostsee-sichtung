/**
 * Form field component types
 */

// Icon type from Steeze UI
export type IconType = Record<string, unknown>; // Lucide icons from @steeze-ui/lucide-icons

// Option type for selects and radios
export interface FieldOption {
	value: string | number;
	label: string;
	description?: string;
	group?: string;
}

// Common field sizes
export type FieldSize = 'sm' | 'md' | 'lg';

// Form field variants
export type FieldVariant = 'default' | 'compact' | 'full';

// Input types
export type InputType = 'text' | 'email' | 'tel' | 'number' | 'url' | 'password' | 'date' | 'time';

// Field state
export interface FieldState {
	hasError?: boolean;
	isValid?: boolean;
	size?: FieldSize;
	icon?: IconType;
}