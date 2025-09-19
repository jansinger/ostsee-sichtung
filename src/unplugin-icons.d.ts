/// <reference types="@sveltejs/kit" />
/// <reference types="unplugin-icons/types/svelte" />

declare module '~icons/*' {
	import type { SvelteComponent } from 'svelte';
	const component: typeof SvelteComponent;
	export default component;
}

declare module 'virtual:icons/*' {
	import type { SvelteComponent } from 'svelte';
	const component: typeof SvelteComponent;
	export default component;
}