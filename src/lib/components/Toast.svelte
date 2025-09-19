<!--
  Toast notification component
  Supports different types: success, error, warning, info
  Modernized with Svelte 5 $effect rune
-->
<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

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
		success: 'lucide:circle-check',
		error: 'lucide:circle-x',
		warning: 'lucide:circle-alert',
		info: 'lucide:info'
	};

	const alertClasses = {
		success: 'alert alert-success',
		error: 'alert alert-error',
		warning: 'alert alert-warning',
		info: 'alert alert-info'
	};

	function dismiss() {
		visible = false;
		if (timeout) {
			clearTimeout(timeout);
		}
		onDismiss?.();
	}

	// Modern $effect replaces onMount/onDestroy pattern
	$effect(() => {
		if (duration > 0) {
			timeout = setTimeout(dismiss, duration);
		}

		// Cleanup function (replaces onDestroy)
		return () => {
			if (timeout) {
				clearTimeout(timeout);
			}
		};
	});
</script>

{#if visible}
	<div class="{alertClasses[type]} mb-4 shadow-lg max-w-sm pointer-events-auto" style="animation: slideIn 0.3s ease-out" role="alert" aria-live="polite">
		<Icon icon={iconMap[type]} width="20" />
		<div class="flex-1">
			{#if title}
				<h3 class="font-bold">{title}</h3>
			{/if}
			<div>{message}</div>
		</div>

		{#if dismissible}
			<button
				type="button"
				onclick={dismiss}
				class="btn btn-ghost btn-xs"
				aria-label="Toast schließen"
			>
				<Icon icon="lucide:x" width="16" />
			</button>
		{/if}
	</div>
{/if}

<!-- Animation und Styling ist jetzt global über app.css und Utility-Klassen definiert -->
