<script lang="ts">
	import { goto, invalidateAll, preloadData } from '$app/navigation';
	import { page } from '$app/state';
	import AdminSightingView from '$lib/components/admin/AdminSightingView.svelte';
	import { carryReturnParams, returnTarget } from './tableReturnUrl';
	import {
		deleteSighting,
		sendTestEmail,
		TEST_EMAIL_HINT
	} from '$lib/components/admin/sightingActions';
	import { planAdvance } from '$lib/components/admin/queueAdvance';
	import { queueHref } from '$lib/components/admin/sightingQueue';
	import SightingQueueNav from '$lib/components/admin/SightingQueueNav.svelte';
	import {
		getSightingStatus,
		SIGHTING_STATUS_PRESENTATION,
		SIGHTING_STATUS_UNDO_MS,
		verdictToStatus
	} from '$lib/components/admin/sightingStatus';
	import { submitVerdict, type SightingVerdict } from '$lib/components/admin/sightingVerdict';
	import Icon from '$lib/components/Icon.svelte';
	import DeleteDialog from '$lib/components/ui/Dialog/DeleteDialog.svelte';
	import { toast } from '$lib/stores/toastState.svelte';
	import type { SpamCheckResult } from '$lib/types/spam';

	let { data } = $props();

	let sighting = $derived(data.sighting);
	let queue = $derived(data.queue);
	let queueFailed = $derived(data.queueFailed);
	let queueOrder = $derived(data.queueOrder);
	/**
	 * Ob die Seite gerade aus dem Warteschlangen-Modus heraus bedient wird —
	 * `SightingQueueNav` blendet sich zwar selbst aus, wenn `queue === null &&
	 * !queueFailed`, das reicht hier aber nicht: Der Wert entscheidet zusätzlich
	 * über den Toast-Text (Sichtungsname statt „Status: …") und wird von der
	 * Tastatursteuerung (Task 8) gebraucht — beides Stellen ohne eigenes
	 * Rendering, an denen die Selbstausblendung der Komponente nicht greift.
	 */
	let imArbeitsmodus = $derived(Boolean(queue) || queueFailed);

	/**
	 * Die letzte Entscheidung — Ziel von `U` und vom Toast-Knopf. Der Toast-Knopf
	 * (unten in `handleStatusChange`) liest die Werte direkt aus der lokalen
	 * `entschiedeneId`/`plan`, nicht aus diesem State — er wird erst mit dem
	 * Tastenkürzel `U` (Task 8) zum Lesezugriff. Bis dahin bleibt er bewusst
	 * geschrieben, aber ungelesen: Ihn erst mit Task 8 einzuführen würde
	 * `zurueckNehmen` von einer noch nicht existenten ID-Quelle abhängig machen,
	 * statt die beiden Tasks unabhängig testbar zu halten.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Lesezugriff kommt mit Task 8 (Tastenkürzel „U")
	let letzteEntscheidung = $state<{
		id: number;
		href: string;
		verdict: SightingVerdict;
	} | null>(null);

	let showDeleteDialog = $state(false);
	let emailPending = $state(false);
	let statusBusy = $state(false);

	async function handleStatusChange(verdict: SightingVerdict): Promise<void> {
		if (statusBusy) return;
		const previous = getSightingStatus(sighting);
		/* Die ID wird festgehalten, bevor irgendetwas navigiert: `sighting` ist
		   `$derived` und zeigt nach dem Sprung die nächste Meldung. Ein Undo,
		   der `sighting.id` erst beim Klick liest, träfe die falsche. */
		const entschiedeneId = sighting.id;
		const plan = planAdvance({
			sightingId: entschiedeneId,
			verdict,
			queue,
			queueFailed,
			order: queueOrder
		});
		statusBusy = true;
		try {
			const ok = await submitVerdict(sighting.id, verdict);
			if (!ok) return;

			/* Die letzte Entscheidung wird festgehalten, damit die Taste `U`
			   dasselbe tut wie der Toast-Knopf: die **letzte Entscheidung**
			   zurücknehmen — nicht den Status der gerade angezeigten Sichtung.
			   Nach dem Auto-Advance sind das zwei verschiedene Meldungen, und
			   die zweite Lesart würde eine unbeteiligte Sichtung anfassen. */
			letzteEntscheidung = {
				id: entschiedeneId,
				href: plan.undoHref,
				verdict: SIGHTING_STATUS_PRESENTATION[previous].verdict
			};

			const nach = SIGHTING_STATUS_PRESENTATION[verdictToStatus(verdict)];
			const meldung = imArbeitsmodus ? plan.toastMessage : `Status: ${nach.label}`;
			toast.success(meldung, {
				duration: SIGHTING_STATUS_UNDO_MS,
				/* Fester Key: Im Arbeitsmodus fällt ein Toast pro Meldung an, jeder
				   fünf Sekunden lang. Ohne Dedupe stünden bei zügiger Arbeit zwei
				   bis drei „Rückgängig"-Knöpfe übereinander — für verschiedene
				   Sichtungen, ohne dass der oberste zur zuletzt entschiedenen
				   gehören muss. `addToast` entfernt den vorherigen Toast mit
				   demselben Key, es bleibt also immer genau der aktuelle. */
				key: 'sighting-verdict-undo',
				action: {
					label: 'Rückgängig',
					onClick: () => {
						void zurueckNehmen(
							entschiedeneId,
							plan.undoHref,
							SIGHTING_STATUS_PRESENTATION[previous].verdict
						);
					}
				}
			});

			/* Kein `invalidateAll()` im Advance-Pfad: Es lädt die Sichtung neu, die
			   man gerade verlässt — reine Wartezeit vor dem Sprung. Für „Status
			   zurückgesetzt" (kein Advance) bleibt es unten stehen. */
			if (plan.target.kind === 'sighting') {
				await goto(plan.target.href);
				return;
			}
			if (plan.target.kind === 'inbox') {
				toast.info('Keine weiteren offenen Meldungen');
				await goto(returnTarget(page.url).href);
				return;
			}
			await invalidateAll();
		} finally {
			statusBusy = false;
		}
	}

	async function zurueckNehmen(id: number, href: string, verdict: SightingVerdict): Promise<void> {
		/* Der Verdict geht an die **gemerkte** ID und nicht an `sighting.id`:
		   Nach dem Auto-Advance zeigt die Seite eine andere Sichtung, und ein
		   `handleStatusChange()` hier würde den Status der falschen Meldung
		   ändern. Erst zurücksetzen, dann navigieren — in dieser Reihenfolge
		   hängt nichts an der Ladezeit der Seite. */
		if (await submitVerdict(id, verdict)) {
			await goto(href);
			await invalidateAll();
		}
	}

	$effect(() => {
		if (queue?.next) void preloadData(queueHref(queue.next, queueOrder));
	});

	function editSighting() {
		// Herkunft und Tabellenfilter reisen mit — sonst endet der Rückweg nach
		// „Bearbeiten" in der ungefilterten Tabelle statt dort, wo man herkam.
		goto(`/admin/${sighting.id}/edit${carryReturnParams(page.url)}`);
	}

	async function handleTestEmail() {
		// Wächter statt `disabled`: Die Schaltfläche bleibt fokussierbar, wer per
		// Tastatur arbeitet verliert seine Position nicht (design-system.md).
		if (emailPending) return;
		emailPending = true;
		try {
			await sendTestEmail(sighting.id);
		} finally {
			emailPending = false;
		}
	}

	async function handleDelete() {
		// Die Sichtung, die diese Seite anzeigt, existiert nach dem Löschen nicht
		// mehr — zurück, woher man kam, statt auf einen 404 zu warten. Ohne
		// `sighting.id`: Der Anker zeigte auf eine Karte, die es nicht mehr gibt.
		if (await deleteSighting(sighting.id)) {
			await goto(returnTarget(page.url).href);
		}
	}

	let spamCheck = $state<{
		loading: boolean;
		result: SpamCheckResult | null;
		error: string | null;
	}>({
		loading: false,
		result: null,
		error: null
	});

	async function runSpamCheck() {
		spamCheck.loading = true;
		spamCheck.error = null;
		spamCheck.result = null;

		try {
			const response = await fetch(`/api/sightings/${sighting.id}/spam-check`);
			if (!response.ok) {
				throw new Error(`Fehler ${response.status}: ${response.statusText}`);
			}
			spamCheck.result = await response.json();
		} catch (err) {
			spamCheck.error = err instanceof Error ? err.message : 'Unbekannter Fehler';
		} finally {
			spamCheck.loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sichtung #{data.sighting?.id} - Details - Admin - Ostsee-Tiere</title>
	<meta
		name="description"
		content="Detailansicht der Sichtung #{data.sighting
			?.id}. Vollständige Informationen zur gemeldeten Meerestier-Sichtung."
	/>
	<meta
		name="keywords"
		content="Sichtung, Details, Admin, {data.sighting?.species ?? 'Meerestier'}, Ostsee, Verwaltung"
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="Sichtung #{data.sighting?.id} - Details - Admin" />
	<meta
		property="og:description"
		content="Detailansicht einer Meerestier-Sichtung im Admin-Bereich"
	/>
	<meta property="og:type" content="website" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Sichtung #{data.sighting?.id} - Details - Admin" />
	<meta
		name="twitter:description"
		content="Detailansicht einer Meerestier-Sichtung im Admin-Bereich"
	/>
</svelte:head>

{#if imArbeitsmodus}
	<!-- Eigener Außenabstand hier: `SightingQueueNav` trägt seit dem Umbau kein
	     `mb-4` mehr, und ohne Bedingung stünde bei `queue === null &&
	     !queueFailed` ein leerer Abstands-Wrapper, obwohl die Komponente selbst
	     nichts rendert. Aus der Tabelle heraus (kein Arbeitsmodus) gibt es
	     ohnehin keine Warteschlange — eine Leiste behauptete dort einen Stapel,
	     den es nicht gibt. -->
	<div class="mb-4">
		<SightingQueueNav {queue} {queueFailed} order={queueOrder} />
	</div>
{/if}

<div class="mb-0 flex flex-wrap items-center justify-between gap-2">
	<h2 class="text-xl font-bold">Sichtung Details</h2>
	<div class="flex flex-wrap gap-2">
		<button
			class="btn btn-ghost btn-sm"
			onclick={runSpamCheck}
			disabled={spamCheck.loading}
			title="Spam-Check durchführen"
			aria-label="Spam-Check für diese Sichtung durchführen"
		>
			{#if spamCheck.loading}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				<Icon icon="lucide:shield-alert" class="mr-1 h-4 w-4" />
			{/if}
			Spam-Check
		</button>
		<!-- Nur Superadmins: Der Klick erzeugt im Team-Postfach eine Mail, die von
		     einer echten Neu-Meldung nicht zu unterscheiden ist. Das Gate steht
		     zusätzlich am Endpunkt — hier verschwindet nur das Bedienelement. -->
		{#if data.isSuperAdmin}
			<button
				class="btn btn-ghost btn-sm"
				onclick={handleTestEmail}
				aria-disabled={emailPending}
				title={TEST_EMAIL_HINT}
				aria-label="Benachrichtigung zu dieser Sichtung an das Team senden"
			>
				{#if emailPending}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					<Icon icon="lucide:mail" class="mr-1 h-4 w-4" />
				{/if}
				Benachrichtigung an Team
			</button>
		{/if}
		<button
			class="btn btn-outline btn-error btn-sm"
			onclick={() => (showDeleteDialog = true)}
			title="Eintrag löschen"
			aria-label="Sichtung löschen"
		>
			<Icon icon="lucide:trash-2" class="mr-1 h-4 w-4" />
			Löschen
		</button>
		<button
			class="btn btn-primary btn-sm"
			onclick={editSighting}
			title="Bearbeiten"
			aria-label="Sichtung bearbeiten"
		>
			<Icon icon="lucide:pen-line" class="mr-1 h-4 w-4" />
			Bearbeiten
		</button>
	</div>
</div>

<DeleteDialog
	bind:show={showDeleteDialog}
	onConfirm={handleDelete}
	onCancel={() => (showDeleteDialog = false)}
/>
<div class="text-base-content/70 mb-4 text-sm">
	Referenz-ID: {sighting.referenceId}
</div>

{#if spamCheck.error}
	<div class="alert alert-error mb-4">
		<Icon icon="lucide:alert-circle" class="h-4 w-4" />
		<span>Spam-Check fehlgeschlagen: {spamCheck.error}</span>
	</div>
{/if}

{#if spamCheck.result}
	{@const result = spamCheck.result}
	<div
		class="card mb-4 border {result.isHighRisk
			? 'border-error bg-error/10'
			: result.score > 0
				? 'border-warning bg-warning/10'
				: 'border-success bg-success/10'}"
	>
		<div class="card-body p-4">
			<div class="flex items-center gap-2">
				<Icon
					icon="lucide:shield-alert"
					class="h-5 w-5 {result.isHighRisk
						? 'text-error'
						: result.score > 0
							? 'text-warning-strong'
							: 'text-success-strong'}"
				/>
				<h3 class="card-title text-base">
					{#if result.isHighRisk}
						Spam-Warnung (Hochrisiko)
					{:else if result.score > 0}
						Spam-Hinweis (Geringes Risiko)
					{:else}
						Kein Spam erkannt
					{/if}
				</h3>
				<div class="ml-auto flex gap-2">
					<span
						class="badge {result.isHighRisk
							? 'badge-error'
							: result.score > 0
								? 'badge-warning'
								: 'badge-success'}"
					>
						Score: {result.score}
					</span>
				</div>
			</div>
			{#if result.indicators.length > 0}
				<ul class="mt-2 list-inside list-disc text-sm">
					{#each result.indicators as indicator (indicator)}
						<li>{indicator}</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}

<AdminSightingView
	{sighting}
	onStatusChange={handleStatusChange}
	{statusBusy}
	statusLog={data.statusLog}
	statusLogFailed={data.statusLogFailed}
/>
