// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User } from '$lib/types';

declare global {
	namespace App {
		interface Error {
			message?: string;
			code?: string;
		}
		interface Locals {
			user?: User;
			cspNonce?: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}
declare module 'yup' {
	// Define your desired `SchemaMetadata` interface by merging the
	// `CustomSchemaMetadata` interface.
	export interface CustomSchemaMetadata {
		placeholder?: string;
		valueText?: string;
		helpText?: string;
		type?: string;
		options?: Array<{
			value: string | number;
			label: string;
			group?: string;
			description?: string;
		}>;
		description?: string;
		step?: number;
		selectPlaceholder?: string;
		rows?: number;
		description?: string;
		icon?: string | IconSource;
	}
}

export {};
