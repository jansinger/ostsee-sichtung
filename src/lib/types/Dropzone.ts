/**
 * Dropzone component types
 */

import type { Snippet } from 'svelte';
import type { HTMLInputAttributes, HTMLLabelAttributes } from 'svelte/elements';

// dropzone
export interface DropzoneProps extends HTMLInputAttributes {
	children: Snippet;
	files?: FileList | null;
	onDrop?: HTMLLabelAttributes['ondrop'];
	onDragOver?: HTMLLabelAttributes['ondragover'];
	onChange?: HTMLInputAttributes['onchange'];
}