<!--
  Base radio button group component
  Independent of form context, accepts all props directly

  Kein `icon`-Prop: Das Feld-Icon gehört einmal an die Gruppe und wird von
  `FieldRenderer` in die Legende gesetzt. Hier stand es innerhalb der
  Options-Schleife — bei der Motorfrage mit ihren zwei Optionen also zweimal
  derselbe Blitz untereinander.
-->
<script lang="ts">
	import type { FieldOption, FieldSize } from '$lib/types';

	interface Props {
		value?: string | number;
		options?: FieldOption[];
		size?: FieldSize;
		onchange?: (event: Event) => void;
		// Common input attributes
		id?: string;
		name?: string;
		disabled?: boolean;
		required?: boolean;
		'aria-describedby'?: string;
		'data-testid'?: string;
	}

	let {
		value = $bindable(),
		options = [],
		size = 'md',
		onchange = undefined,
		id,
		name,
		disabled = false,
		required = false,
		'aria-describedby': ariaDescribedBy,
		'data-testid': dataTestId
	}: Props = $props();

	let hasOptions = $derived(options && options.length > 0);

	// Dynamic CSS classes
	let radioClasses = $derived.by(() => {
		const base = 'radio radio-primary';
		const sizeClass = size === 'sm' ? 'radio-sm' : size === 'lg' ? 'radio-lg' : '';
		return [base, sizeClass].filter(Boolean).join(' ');
	});
</script>

{#if hasOptions}
	<div class="mt-2 space-y-2">
		{#each options as option, index (option.value)}
			<label
				class="hover:bg-base-200/50 flex cursor-pointer justify-start gap-3 rounded-lg py-2 transition-colors"
			>
				<input
					type="radio"
					name={name || id || `radio-group-${index}`}
					value={option.value}
					class={radioClasses}
					bind:group={value}
					{onchange}
					{disabled}
					{required}
					aria-describedby={ariaDescribedBy}
					data-testid={dataTestId ? `${dataTestId}-${option.value}` : undefined}
				/>
				<span class="font-medium">{option.label}</span>
				{#if option?.description}
					<span class="text-base-content/60 ml-auto text-sm">{option.description}</span>
				{/if}
			</label>
		{/each}
	</div>
{/if}
