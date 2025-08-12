<script lang="ts">
	import DeadAnimal from './DeadAnimal.svelte';

	import { getFormContext } from '$lib/report/formContext';
	import { Eye } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import FormField from '../form/fields/FormField.svelte';

	const { form } = getFormContext();
</script>

<!-- Animal Information Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon src={Eye} size="20" class="text-primary" />
			Tierinformationen
		</h3>

		<!-- Species Selection -->
		<FormField name="species" />

		<!-- Animal Count -->
		<div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField name="totalCount" />
			<FormField name="juvenileCount" />
		</div>

		<!-- Dead/Alive Status -->
		<div class="mt-4">
			<FormField name="isDead" />
		</div>

		<!-- Dead Animal Additional Fields -->
		{#if $form.isDead}
			<DeadAnimal></DeadAnimal>
		{/if}
	</div>
</div>

<style>
	/* Card hover effects for better interactivity */
	.card {
		transition: all 0.2s ease;
	}

	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 25px -8px oklch(var(--b3));
	}
</style>
