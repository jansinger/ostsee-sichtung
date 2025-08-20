<script lang="ts">
	import { TriangleAlert } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import FormField from '../form/fields/FormField.svelte';
</script>

<div class="bg-warning/10 border-warning/20 mt-6 rounded-lg border p-4">
	<h4 class="text-warning-content mb-3 flex items-center gap-2 font-semibold md:whitespace-nowrap">
		<Icon src={TriangleAlert} size="16" class="text-warning-content shrink-0" />
		<span>Zusätzliche Informationen für Totfund</span>
	</h4>
	<div class="text-warning-content/80 mb-4 text-sm">
		<p class="mb-2 font-medium">Totfunde sind besonders wertvoll für die Wissenschaft!</p>
		<ul class="list-inside list-disc space-y-1 text-xs">
			<li><strong>Todesursachen:</strong> Helfen bei der Identifikation von Bedrohungen</li>
			<li><strong>Gesundheitszustand:</strong> Wichtig für Populationsanalysen</li>
			<li><strong>Nicht berühren:</strong> Sicherheitsrisiko und Störung der Untersuchung</li>
			<li>
				<strong>Behörden informieren:</strong> Meeresmuseum, Wasserschutzpolizei, Nationalparkamt kontaktieren
			</li>
		</ul>
	</div>

	<!-- These fields will be loaded from constants in the future -->
	<div class="space-y-4">
		<FormField name="deadCondition" />

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField name="deadSex" />
			<FormField name="deadSize" />
		</div>

		<FormField name="deadPhoneContact" />
	</div>
</div>
