<!--
  Toast notification component
  Supports different types: success, error, warning, info
-->
<script lang="ts">
	import { CircleAlert, CircleCheck, CircleX, Info, X } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import { onMount } from 'svelte';

	let {
		type = 'info',
		title = '',
		message = '',
		duration = 5000,
		dismissible = true,
		onDismiss
	}: {
		type?: 'success' | 'error' | 'warning' | 'info';
		title?: string;
		message: string;
		duration?: number;
		dismissible?: boolean;
		onDismiss?: () => void;
	} = $props();

	let visible = $state(true);
	let timeout: NodeJS.Timeout | null = null;

	const iconMap = {
		success: CircleCheck,
		error: CircleX,
		warning: CircleAlert,
		info: Info
	};

	const alertClasses = {
		success: 'alert-success',
		error: 'alert-error',
		warning: 'alert-warning',
		info: 'alert-info'
	};

	function dismiss() {
		visible = false;
		if (timeout) {
			clearTimeout(timeout);
		}
		onDismiss?.();
	}

	onMount(() => {
		if (duration > 0) {
			timeout = setTimeout(dismiss, duration);
		}

		return () => {
			if (timeout) {
				clearTimeout(timeout);
			}
		};
	});
</script>

{#if visible}
	<div class="alert {alertClasses[type]} mb-4 shadow-lg" role="alert" aria-live="polite">
		<Icon src={iconMap[type]} size="20" />
		<div class="flex-1">
			{#if title}
				<h3 class="text-sm font-bold">{title}</h3>
			{/if}
			<div class="text-sm">{message}</div>
		</div>

		{#if dismissible}
			<button
				type="button"
				onclick={dismiss}
				class="btn btn-ghost btn-xs"
				aria-label="Toast schließen"
			>
				<Icon src={X} size="16" />
			</button>
		{/if}
	</div>
{/if}

<style>
	.alert {
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
</style>
