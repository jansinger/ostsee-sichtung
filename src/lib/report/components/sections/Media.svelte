<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import { Camera } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import DropzoneEnhanced from '../form/fields/DropzoneEnhanced.svelte';
	import FormField from '../form/fields/FormField.svelte';

	// Generiere eine einfache referenceId für Upload (temporäre Lösung)
	const { form } = getFormContext();
	let referenceId = $derived($form.referenceId);
</script>

<!-- Media Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon src={Camera} size="20" class="text-primary" />
			Foto- oder Videoaufnahmen
		</h3>
		<div class="mb-4 text-sm text-base-content/70">
			<p class="font-medium mb-2">📸 Fotos und Videos sind extrem wertvoll für die Forschung!</p>
			<ul class="list-disc list-inside space-y-1 text-xs">
				<li><strong>Artbestimmung:</strong> Auch unscharfe Bilder können helfen</li>
				<li><strong>Verhaltensanalyse:</strong> Videos zeigen wichtige Verhaltensmuster</li>
				<li><strong>GPS-Daten:</strong> Automatische Positionserkennung aus Bildern</li>
				<li><strong>Formatunterstützung:</strong> JPG, PNG, MP4, MOV, AVI</li>
			</ul>
		</div>
		<FormField name="mediaConsent" />
		<DropzoneEnhanced {referenceId} />
		<div class="alert alert-info mt-4">
			<Icon src={Camera} size="20" />
			<span class="text-sm">
				Falls Sie uns Ihre Medien auf einem anderen Weg zukommen lassen möchten, erhalten Sie
				Instruktionen nach dem Absenden des Formulars.
			</span>
		</div>
	</div>
</div>

<style>
	/* Card hover effects */
	.card {
		transition: all 0.2s ease;
	}

	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 25px -8px oklch(var(--b3));
	}
</style>
