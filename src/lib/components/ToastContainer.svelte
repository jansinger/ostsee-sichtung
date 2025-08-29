<!--
  Global toast container that displays all active toasts
  Should be placed in the main layout
  Modernized with Svelte 5 runes
-->
<script lang="ts">
	import { getToasts, removeToast } from '$lib/stores/toastState';
	import Toast from './Toast.svelte';

	// Reactive getter for toasts using modern runes
	const toasts = $derived(getToasts());
</script>

<!-- Toast Container positioned at top right -->
<div class="toast toast-top toast-end z-50">
	{#each toasts as toast (toast.id)}
		<Toast
			type={toast.type}
			title={toast.title || ''}
			message={toast.message}
			duration={toast.duration || 5000}
			dismissible={!!toast.dismissible}
			onDismiss={() => removeToast(toast.id)}
		/>
	{/each}
</div>

<style>
	.toast {
		position: fixed;
		pointer-events: none;
	}

	.toast :global(.alert) {
		pointer-events: all;
		max-width: 400px;
	}
</style>
