<!--
  Global toast container that displays all active toasts
  Should be placed in the main layout
-->
<script lang="ts">
	import { toastStore } from '$lib/stores/toastStore';
	import Toast from './Toast.svelte';

	const toasts = toastStore;
</script>

<!-- Toast Container positioned at top right -->
<div class="toast toast-top toast-end z-50">
	{#each $toasts as toast (toast.id)}
		<Toast
			type={toast.type}
			title={toast.title}
			message={toast.message}
			duration={toast.duration}
			dismissible={toast.dismissible}
			onDismiss={() => toastStore.removeToast(toast.id)}
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