<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { InfoVariant } from '$lib/components/info/variant';
	import { speciesGroups } from '$lib/report/formOptions/species';
	import {
		frequencyLabels,
		observabilityLabels,
		speciesIdentification,
		type FrequencyLevel,
		type Observability
	} from '$lib/report/formOptions/speciesIdentification';
	import type { SightingFormData } from '$lib/types';
	import { sanitizeHtml } from '$lib/utils/sanitize';

	let {
		currentValue = undefined,
		variant = 'inline'
	}: {
		currentValue?: SightingFormData[keyof SightingFormData];
		/**
		 * `inline` ist die eingebettete Hilfe im Sichtungsformular: zugeklappt
		 * hinter einem Toggle, Überschriften ab h4, kompakte Schrift.
		 * `page` ist die eigenständige Route `/bestimmungshilfe`: sofort sichtbar,
		 * Überschriften ab h2 (die h1 gehört der Route) und Schriftgrößen aus den
		 * Typografie-Rollen statt 12px.
		 *
		 * Bewusst EINE Prop statt `defaultExpanded` + `headingLevel`: die beiden
		 * kippen immer gemeinsam, zwei Props ließen die sinnlose Kombination
		 * „aufgeklappt, aber h4" zu.
		 *
		 * Derselbe Typ wie an `DeadFindingNotice`/`DataUsageNotice` — die drei
		 * erscheinen immer gemeinsam und dürfen nicht auseinanderlaufen.
		 */
		variant?: InfoVariant;
	} = $props();

	const isPage = $derived(variant === 'page');

	/*
	 * Alle variantenabhängigen Tags und Klassen an einer Stelle statt als
	 * `{#if}`-Streuung im Markup. Die Klassennamen stehen ausgeschrieben, weil
	 * Tailwind Utilities nur aus vollständigen Strings im Quelltext erzeugt —
	 * zusammengesetzte Namen landen nicht im Build (siehe .claude/rules/daisyui.md).
	 */
	const INLINE_STYLE = {
		sectionTag: 'h5',
		subTag: 'h6',
		groupHeading: 'text-primary mb-2 text-sm font-medium',
		panelHeading: 'text-base-content mb-1 flex items-center gap-1 text-xs font-semibold',
		subHeading: 'text-base-content mb-1 text-xs font-medium',
		subHeadingWithIcon: 'text-base-content mb-1 flex items-center gap-1 text-xs font-medium',
		body: 'text-base-content/80 text-xs',
		list: 'text-base-content/80 ml-3 list-disc space-y-0.5 text-xs',
		support: 'text-base-content/70 text-xs',
		/* `/70`, nicht `/60`: Die Grunddaten (Größe, Gewicht, wissenschaftlicher
		   Name) sind Sekundärtext, und der gehört laut design-system.md auf `/70`
		   — `/60` ist die Untergrenze für Dekoratives, nicht der Normalwert. Beim
		   Bündeln in diese Konstante war der richtige Moment, das zu ziehen. */
		muted: 'text-base-content/70 text-xs',
		summary: 'collapse-title py-3 text-sm font-medium',
		iconWidth: '14'
	} as const;

	const PAGE_STYLE = {
		sectionTag: 'h2',
		subTag: 'h3',
		groupHeading: 'text-primary mt-8 mb-3 text-2xl font-bold',
		panelHeading: 'text-base-content mb-2 flex items-center gap-2 text-lg font-semibold',
		subHeading: 'text-base-content mb-1 text-lg font-semibold',
		subHeadingWithIcon: 'text-base-content mb-1 flex items-center gap-2 text-lg font-semibold',
		body: 'text-base-content/80 text-base',
		list: 'text-base-content/80 ml-4 list-disc space-y-1 text-base',
		support: 'text-base-content/70 text-support',
		muted: 'text-base-content/70 text-support',
		summary: 'collapse-title py-3 text-lg font-medium',
		iconWidth: '20'
	} as const;

	const styles = $derived(isPage ? PAGE_STYLE : INLINE_STYLE);

	// Die Komponente wird mehrfach gerendert (Tierart-Feld und generisches
	// Hilfe-Panel). Feste IDs wären im DOM doppelt und würden `aria-controls` und
	// `aria-labelledby` unbrauchbar machen.
	//
	// `$props.id()` darf pro Komponente nur EINMAL aufgerufen werden (Svelte:
	// `props_duplicate`) — der Rückgabewert ist das Instanz-Präfix, aus dem alle
	// weiteren IDs abgeleitet werden.
	const uid = $props.id();
	const helpContentId = `${uid}-content`;
	// WCAG 2.1 4.1.2: Ohne Namen meldet der Screenreader das Bild-Modal nur als
	// „Dialog". Den Namen trägt die Überschrift im Dialog, nicht ein zweiter,
	// eigenständig alternder `aria-label`-Text.
	const modalTitleId = `${uid}-modal-title`;

	// Auf der eigenen Seite gibt es nichts aufzuklappen — der Inhalt IST die Seite.
	let isExpanded = $state(false);
	const showContent = $derived(isPage || isExpanded);
	let modalImageSrc = $state<string | null>(null);
	let modalImageAlt = $state<string>('');
	let modalImageCopyright = $state<string | null>(null);
	let modalElement = $state<HTMLDialogElement | null>(null);
	let modalCloseTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		return () => {
			if (modalCloseTimer !== null) clearTimeout(modalCloseTimer);
		};
	});

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	function openImageModal(src: string, alt: string, copyright: string | null = null) {
		if (modalCloseTimer !== null) {
			clearTimeout(modalCloseTimer);
			modalCloseTimer = null;
		}
		modalImageSrc = src;
		modalImageAlt = alt;
		modalImageCopyright = copyright;
		modalElement?.showModal();
	}

	function closeImageModal() {
		modalElement?.close();
		// deferred state reset is handled by handleDialogClose (onclose event)
	}

	function handleDialogClose() {
		// Fires for ALL close paths: button, backdrop click, and native Escape key.
		// State is cleared after the DaisyUI animation completes to avoid flicker
		// (the close event fires synchronously, before the animation ends).
		if (modalCloseTimer !== null) clearTimeout(modalCloseTimer);
		modalCloseTimer = setTimeout(() => {
			modalImageSrc = null;
			modalImageAlt = '';
			modalImageCopyright = null;
			modalCloseTimer = null;
		}, 250);
	}

	const frequencyBadge: Record<FrequencyLevel, string> = {
		resident: 'badge-success',
		regular: 'badge-info',
		rare: 'badge-warning',
		vagrant: 'badge-error'
	};

	const observabilityBadge: Record<Observability, string> = {
		distance: 'badge-success',
		closeup: 'badge-warning',
		background: 'badge-ghost'
	};

	// Reihenfolge bewusst: zuerst das, was man im Feld tatsächlich sieht.
	const observabilityOrder: Observability[] = ['distance', 'closeup', 'background'];

	const groupedData = Object.entries(speciesGroups).map(([groupName, species]) => ({
		groupName,
		species: species.map((s) => ({ enum: s, ...speciesIdentification[s] }))
	}));

	function featuresFor(
		features: (typeof speciesIdentification)[keyof typeof speciesIdentification]['distinguishing'],
		observability: Observability
	) {
		return features.filter((f) => f.observability === observability);
	}
</script>

<div class={isPage ? 'help-page' : 'help-inline mt-2'}>
	<!-- Toggle Button — auf der eigenen Seite gibt es nichts aufzuklappen -->
	{#if !isPage}
		<button
			type="button"
			class="btn btn-ghost btn-sm flex w-full justify-start gap-2 text-left"
			onclick={toggleExpanded}
			aria-expanded={isExpanded}
			aria-controls={helpContentId}
		>
			<Icon icon={isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'} width="16" />
			<Icon icon="lucide:circle-help" width="16" />
			<span>Hilfe bei der Tiererkennung</span>
		</button>
	{/if}

	{#if showContent}
		<div
			id={helpContentId}
			class={isPage ? '' : 'bg-base-100 border-base-300 mt-2 rounded-lg border p-4'}
		>
			<!-- Titel und Einführung stellt im Seitenmodus die Route: sonst stünde
			     unter der h1 sofort eine zweite Überschrift mit demselben Inhalt. -->
			{#if !isPage}
				<div class="mb-4">
					<h4 class="text-base-content mb-2 text-sm font-semibold">
						Bestimmungshilfe für Meerestiere
					</h4>
					<p class="text-base-content/70 text-xs">
						Klicken Sie auf eine Tierart, um die Erkennungsmerkmale zu sehen. Merkmale sind danach
						gekennzeichnet, ob sie bei einer echten Sichtung überhaupt zu erkennen sind.
					</p>
				</div>
			{/if}

			<!-- Wichtigste Regel zuerst -->
			<div class="bg-warning/10 border-warning/30 mb-4 rounded-lg border p-3">
				<svelte:element this={styles.sectionTag} class={styles.panelHeading}>
					<Icon
						icon="lucide:triangle-alert"
						width={styles.iconWidth}
						class="text-warning-strong shrink-0"
						aria-hidden="true"
					/>
					Im Zweifel nicht raten
				</svelte:element>
				<p class={styles.body}>
					Wählen Sie „Unbekannte Walart" oder „Unbekannte Robbenart" und machen Sie wenn möglich ein
					Foto — auch ein unscharfes. Eine unsichere Meldung mit Bild ist für die Forschung
					wertvoller als eine falsch bestimmte.
				</p>
			</div>

			{#each groupedData as group (group.groupName)}
				<div class="mb-4">
					<svelte:element this={styles.sectionTag} class={styles.groupHeading}
						>{group.groupName}</svelte:element
					>
					<div class="grid grid-cols-1 gap-2">
						{#each group.species as species (species.enum)}
							<details class="collapse-arrow border-base-300 bg-base-100 collapse border">
								<summary class={styles.summary}>
									<div class="flex flex-wrap items-center gap-2">
										{#if species.images.length > 0 && species.images[0]}
											<div class="avatar">
												<div class="mask h-6 w-6 mask-circle">
													<img
														src={species.images[0].src}
														alt=""
														class="object-cover"
														loading="lazy"
													/>
												</div>
											</div>
										{/if}
										<span class={currentValue == species.enum ? 'text-primary font-semibold' : ''}>
											{species.name}
										</span>
										<span class="badge badge-xs {frequencyBadge[species.frequency.level]}">
											{frequencyLabels[species.frequency.level]}
										</span>
									</div>
								</summary>
								<div class="collapse-content px-4 pb-3">
									<div class="space-y-3">
										<!-- Häufigkeit einordnen -->
										<p class="{styles.body} italic">
											{species.frequency.text}
										</p>

										<!-- Bilder (klickbar für Vollbildansicht) -->
										{#if species.images.length > 0}
											<div
												class="grid grid-cols-1 gap-3"
												class:md:grid-cols-2={species.images.length > 1}
											>
												{#each species.images as image (image.src)}
													<div class="text-center">
														<button
															type="button"
															class="group shadow-raised hover:shadow-floating relative overflow-hidden rounded-lg transition-all"
															onclick={() => openImageModal(image.src, image.alt, image.copyright)}
															aria-label={`${image.alt} in Originalgröße anzeigen`}
														>
															<img
																src={image.src}
																alt={image.alt}
																class="h-32 w-full object-cover transition-all group-hover:brightness-110"
																loading="lazy"
															/>
															<!-- Schleier über dem Artfoto, kein Theme-Ton: bg-scrim/<n>
															     und text-on-scrim (--scrim-surface in tokens.css). -->
															<div
																class="bg-scrim/60 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
															>
																<Icon icon="lucide:zoom-in" width="24" class="text-on-scrim" />
															</div>
														</button>
														<p class="{styles.support} mt-1">{image.alt}</p>
														{#if image.copyright}
															<p class={styles.support}>
																<!-- eslint-disable-next-line svelte/no-at-html-tags -->
																{@html sanitizeHtml(image.copyright)}
															</p>
														{/if}
													</div>
												{/each}
											</div>
										{/if}

										<!-- So sieht es an der Oberfläche aus: das Wichtigste zuerst -->
										<div class="bg-info/10 rounded-lg p-3">
											<svelte:element this={styles.subTag} class={styles.subHeadingWithIcon}>
												<Icon
													icon="lucide:eye"
													width={styles.iconWidth}
													class="text-info-strong shrink-0"
													aria-hidden="true"
												/>
												So sieht es an der Oberfläche aus
											</svelte:element>
											<ul class={styles.list}>
												{#each species.surfacing as item (item)}
													<li>{item}</li>
												{/each}
											</ul>
										</div>

										<!-- Erkennungsmerkmale, nach Beobachtbarkeit gruppiert -->
										<div>
											<svelte:element this={styles.subTag} class={styles.subHeading}
												>Erkennungsmerkmale</svelte:element
											>
											<div class="space-y-2">
												{#each observabilityOrder as level (level)}
													{@const features = featuresFor(species.distinguishing, level)}
													{#if features.length > 0}
														<div>
															<span class="badge badge-xs {observabilityBadge[level]} mb-1">
																{observabilityLabels[level]}
															</span>
															<ul class={styles.list}>
																{#each features as feature (feature.text)}
																	<li>{feature.text}</li>
																{/each}
															</ul>
														</div>
													{/if}
												{/each}
											</div>
										</div>

										<!-- Verwechslungsgefahr -->
										{#if species.confusion.length > 0}
											<div>
												<svelte:element this={styles.subTag} class={styles.subHeadingWithIcon}>
													<Icon
														icon="lucide:git-compare-arrows"
														width={styles.iconWidth}
														class="shrink-0"
														aria-hidden="true"
													/>
													Häufig verwechselt mit
												</svelte:element>
												<ul class={styles.list}>
													{#each species.confusion as item (item)}
														<li>{item}</li>
													{/each}
												</ul>
											</div>
										{/if}

										<!-- Typisches Verhalten -->
										<div>
											<svelte:element this={styles.subTag} class={styles.subHeading}
												>Typisches Verhalten</svelte:element
											>
											<ul class={styles.list}>
												{#each species.behavior as behaviorItem (behaviorItem)}
													<li>{behaviorItem}</li>
												{/each}
											</ul>
										</div>

										<!-- Merkregel -->
										{#if species.fieldTip}
											<p class="border-primary/40 {styles.body} border-l-2 pl-2 font-medium italic">
												{species.fieldTip}
											</p>
										{/if}

										<!-- Grunddaten: bewusst zuletzt, weil im Feld nicht schätzbar -->
										<div class="border-base-300 border-t pt-2">
											<div class="{styles.muted} grid grid-cols-1 gap-1">
												<div>
													<span class="font-medium">Größe:</span>
													<span class="ml-1">{species.size}</span>
												</div>
												<div>
													<span class="font-medium">Gewicht:</span>
													<span class="ml-1">{species.weight}</span>
												</div>
												{#if species.scientificName !== '—'}
													<div>
														<span class="font-medium">Wissenschaftlich:</span>
														<span class="ml-1 italic">{species.scientificName}</span>
													</div>
												{/if}
											</div>
										</div>
									</div>
								</div>
							</details>
						{/each}
					</div>
				</div>
			{/each}

			<!-- Übergreifende Unterscheidungshilfen.
			     Sie stehen auf der Sektionsebene, nicht darunter: inhaltlich sind sie
			     Geschwister der Artgruppen („Wale", „Robben"), keine Unterpunkte. -->
			<div class="space-y-3">
				<div class="bg-base-200 rounded-lg p-3">
					<svelte:element this={styles.sectionTag} class={styles.panelHeading}>
						<Icon
							icon="lucide:circle-help"
							width={styles.iconWidth}
							class="shrink-0"
							aria-hidden="true"
						/>
						Wal oder Robbe? Die häufigste Verwechslung
					</svelte:element>
					<div class="{styles.body} space-y-1">
						<p>
							<strong>Robbe:</strong> Der runde Kopf steht senkrecht aus dem Wasser und bleibt liegen.
							Augen, Schnauze und Barthaare sind erkennbar. Es gibt keine Rückenflosse.
						</p>
						<p>
							<strong>Schweinswal:</strong> Kein Kopf zu sehen, nur ein rollender Rücken mit kleiner dreieckiger
							Finne. Sichtbar für ein bis zwei Sekunden, danach ist das Tier weg.
						</p>
					</div>
				</div>

				<div class="bg-base-200 rounded-lg p-3">
					<svelte:element this={styles.sectionTag} class={styles.panelHeading}>
						<Icon
							icon="lucide:circle-help"
							width={styles.iconWidth}
							class="shrink-0"
							aria-hidden="true"
						/>
						Robben unterscheiden: erst das Kopfprofil, dann die Nasenlöcher
					</svelte:element>
					<div class="{styles.body} space-y-1">
						<p>
							<strong>Kegelrobbe:</strong> langer Kopf, gerade Linie von der Schnauze zur Stirn; Nasenlöcher
							parallel, laufen unten nicht zusammen.
						</p>
						<p>
							<strong>Seehund:</strong> kurze Schnauze mit deutlichem Absatz zur Stirn, Augen weit vorn;
							Nasenlöcher V-förmig und unten zusammenlaufend.
						</p>
						<p>
							<strong>Ringelrobbe:</strong> kleinste Art, helle Ringe im Fell — in deutschen Gewässern
							aber praktisch nicht anzutreffen.
						</p>
						<p class="text-base-content/70">
							Das Kopfprofil ist auch auf 100–200 m mit dem Fernglas erkennbar. Die Nasenlöcher sind
							das sicherste Merkmal, aber meist nur auf einem Foto zu beurteilen.
						</p>
					</div>
				</div>

				<div class="bg-base-200 rounded-lg p-3">
					<svelte:element this={styles.sectionTag} class={styles.panelHeading}>
						<Icon
							icon="lucide:camera"
							width={styles.iconWidth}
							class="shrink-0"
							aria-hidden="true"
						/>
						Was der Forschung am meisten hilft
					</svelte:element>
					<ul class={styles.list}>
						<li>Ein Foto, auch unscharf — bei Großwalen möglichst die Fluke beim Abtauchen</li>
						<li>Genaue Position und Uhrzeit</li>
						<li>Größe im Vergleich zu Ihrem Boot statt einer Meterschätzung</li>
						<li>
							Bei Unsicherheit „Unbekannte Wal-" bzw. „Unbekannte Robbenart" statt einer Vermutung
						</li>
						<li>Halten Sie Abstand, besonders zu Robben an ihren Liegeplätzen</li>
					</ul>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Image Modal für Vollbildansicht -->
<!-- `aria-labelledby` nur, solange der Titel auch im DOM steht: Der Dialogtitel
     hängt an `modalImageSrc`, DaisyUI lässt den geschlossenen Dialog aber stehen
     (`visibility: hidden`, siehe .claude/rules/daisyui.md). Unbedingt gesetzt
     zeigte das Attribut nach dem 250-ms-Reset in `handleDialogClose` auf eine
     nicht existierende ID — ein ungültiger ARIA-IDREF. Ohne Bild hat der Dialog
     tatsächlich keinen Namen, und er ist dann auch nicht offen.
     Das `data-testid` ist deshalb kein Beiwerk: `e2e/modal-overflow.spec.ts`
     benennt Dialoge über `data-testid ?? aria-labelledby ?? dialog[i]` und misst
     den Ruhezustand — ohne es stünde diese Position dort wieder als `dialog[0]`. -->
<dialog
	bind:this={modalElement}
	class="modal"
	aria-labelledby={modalImageSrc ? modalTitleId : undefined}
	data-testid="species-image-dialog"
	onclose={handleDialogClose}
>
	<div class="modal-box w-11/12 max-w-5xl p-0">
		{#if modalImageSrc}
			<div class="relative">
				<!-- Modal Header -->
				<div class="bg-base-200 flex items-center justify-between p-4">
					<h3 id={modalTitleId} class="text-base-content text-lg font-bold">{modalImageAlt}</h3>
					<button
						type="button"
						class="btn btn-circle btn-ghost btn-sm"
						onclick={closeImageModal}
						aria-label="Schließen"
					>
						<Icon icon="lucide:x" width="24" />
					</button>
				</div>

				<!-- Modal Image -->
				<div class="flex flex-col items-center p-4">
					<img
						src={modalImageSrc}
						alt={modalImageAlt}
						class="max-h-[70vh] max-w-full object-contain"
					/>
					{#if modalImageCopyright}
						<p class="text-base-content/60 mt-3 text-sm">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html sanitizeHtml(modalImageCopyright)}
						</p>
					{/if}
				</div>

				<!-- Modal Footer -->
				<div class="bg-base-200 p-4 text-center">
					<p class="text-base-content/70 text-sm">
						Klicken Sie außerhalb des Bildes oder drücken Sie Escape zum Schließen
					</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Backdrop, Klick schließt. Schleier über der Seite dahinter, kein
	     Theme-Ton: bg-scrim/<n> (--scrim-surface in tokens.css). Deckkraft an
	     der Aufrufstelle, Farbton im Token — und /60, weil der Schleier den
	     Schließen-Bereich trägt. Stand vorher als oklch(0% 0 0 / 0.6) im
	     scoped <style> und umging das Theme damit vollständig.

	     Der Weichzeichner wird dabei von 4px auf 8px angehoben: `backdrop-blur-sm`
	     ist unter Tailwind 4 acht Pixel (4px hieße `backdrop-blur-xs`). Das ist
	     Absicht — MediaModal.svelte fährt denselben Wert, und zwei
	     Modal-Schleier derselben App sollen nicht unterschiedlich weich sein. -->
	<div
		class="modal-backdrop bg-scrim/60 cursor-pointer backdrop-blur-sm"
		onclick={closeImageModal}
		onkeydown={(e) => e.key === 'Escape' && closeImageModal()}
		role="button"
		tabindex="0"
		aria-label="Modal schließen"
	></div>
</dialog>

<style>
	.collapse-content {
		transition: all 0.2s ease-in-out;
	}

	/* WCAG 2.5.5: Das Ziel ist die ganze Zusammenfassungszeile, nicht der Text
	   darin. Der zentrale Touch-Target-Block in `app.css` greift hier nicht — er
	   zielt auf `.btn`, und ein `summary.collapse-title` ist keiner (dieselbe
	   Begründung wie beim Skip-Link dort). Der Wert kommt aus dem Token statt aus
	   einem `min-h-11` an der Aufrufstelle, damit der Feldmodus die 56px
	   mitnimmt. */
	.collapse-title {
		min-height: var(--target-min);
	}

	.avatar .mask {
		transition: transform 0.2s ease;
	}

	.avatar:hover .mask {
		transform: scale(1.05);
	}

	button.group {
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
	}

	.modal-box {
		box-shadow: var(--shadow-floating);
	}

	.modal img {
		border-radius: 0.5rem;
		box-shadow: var(--shadow-raised);
	}

	/* Copyright-Links stammen aus {@html} und brauchen daher globale Selektoren.
	   `/70` ist die Deckkraft der Bildunterschriften, `/60` die des
	   Modal-Copyrights. Ein dritter Zweig für `/50` stand hier ohne Fundstelle —
	   entfernt, weil ein Selektor ohne Ziel nicht prüfbar ist und beim nächsten
	   Leser den Eindruck erweckt, es gäbe irgendwo Text auf `/50` (was die
	   Deckkraft-Untergrenze aus design-system.md verletzen würde). */
	:global(.text-base-content\/60 a),
	:global(.text-base-content\/70 a) {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: opacity 0.2s ease;
	}
	:global(.text-base-content\/60 a:hover),
	:global(.text-base-content\/70 a:hover) {
		opacity: 0.8;
	}

	@media (max-width: 640px) {
		/* Nur die eingebettete Variante. Ungelayerte Scoped-Styles schlagen
		   Tailwind-Utilities (die in `@layer utilities` liegen) unabhängig von der
		   Spezifität — ohne die Einschränkung auf `.help-inline` würde diese Regel
		   das `text-lg` der Seitenvariante überschreiben und die zwölf Artnamen auf
		   `/bestimmungshilfe` unterhalb 640px auf 14px drücken. Also genau im
		   Feldfall, für den die Seitenvariante die Typografie-Rollen überhaupt
		   bekommen hat. Inline ändert die Regel nichts (`text-sm` ist derselbe
		   Wert) — sie bleibt nur als bewusster Deckel stehen. */
		.help-inline .collapse-title {
			font-size: 0.875rem;
		}

		.collapse-content {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.modal-box {
			width: 95%;
			max-width: 95%;
		}

		.modal img {
			max-height: 60vh;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.collapse-content,
		.avatar .mask,
		button {
			transition: none;
		}
	}

	@media (prefers-contrast: high) {
		.group:hover {
			outline: 2px solid;
		}

		.modal-box {
			border: 2px solid;
		}
	}
</style>
