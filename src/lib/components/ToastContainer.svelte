<!--
  Global toast container that displays all active toasts
  Should be placed in the main layout
-->
<script lang="ts">
	import { toastStore } from '$lib/stores/toastStore';
	import Toast from './Toast.svelte';
</script>

<!-- Toast Container positioned at top right -->
<div class="toast toast-top toast-end z-50">
	{#each $toastStore as toast (toast.id)}
		<Toast
			type={toast.type}
			title={toast.title || ''}
			message={toast.message}
			duration={toast.duration || 5000}
			dismissible={!!toast.dismissible}
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
