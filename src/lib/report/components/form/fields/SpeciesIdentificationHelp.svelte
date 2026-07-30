<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
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
		currentValue = undefined
	}: {
		currentValue?: SightingFormData[keyof SightingFormData];
	} = $props();

	// Die Komponente wird mehrfach gerendert (Tierart-Feld und generisches
	// Hilfe-Panel). Eine feste ID wäre im DOM doppelt und würde aria-controls
	// unbrauchbar machen.
	const helpContentId = $props.id();

	let isExpanded = $state(false);
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

<div class="mt-2">
	<!-- Toggle Button -->
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

	<!-- Expandable Content -->
	{#if isExpanded}
		<div id={helpContentId} class="bg-base-100 border-base-300 mt-2 rounded-lg border p-4">
			<div class="mb-4">
				<h4 class="text-base-content mb-2 text-sm font-semibold">
					Bestimmungshilfe für Meerestiere
				</h4>
				<p class="text-base-content/70 text-xs">
					Klicken Sie auf eine Tierart, um die Erkennungsmerkmale zu sehen. Merkmale sind danach
					gekennzeichnet, ob sie bei einer echten Sichtung überhaupt zu erkennen sind.
				</p>
			</div>

			<!-- Wichtigste Regel zuerst -->
			<div class="bg-warning/10 border-warning/30 mb-4 rounded-lg border p-3">
				<h5 class="text-base-content mb-1 flex items-center gap-1 text-xs font-semibold">
					<Icon
						icon="lucide:triangle-alert"
						width="14"
						class="text-warning-strong"
						aria-hidden="true"
					/>
					Im Zweifel nicht raten
				</h5>
				<p class="text-base-content/80 text-xs">
					Wählen Sie „Unbekannte Walart" oder „Unbekannte Robbenart" und machen Sie wenn möglich ein
					Foto — auch ein unscharfes. Eine unsichere Meldung mit Bild ist für die Forschung
					wertvoller als eine falsch bestimmte.
				</p>
			</div>

			{#each groupedData as group (group.groupName)}
				<div class="mb-4">
					<h5 class="text-primary mb-2 text-sm font-medium">{group.groupName}</h5>
					<div class="grid grid-cols-1 gap-2">
						{#each group.species as species (species.enum)}
							<details class="collapse-arrow border-base-300 bg-base-100 collapse border">
								<summary class="collapse-title min-h-11 py-3 text-sm font-medium">
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
										<p class="text-base-content/80 text-xs italic">
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
															class="group relative overflow-hidden rounded-lg shadow-sm transition-all hover:shadow-md"
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
														<p class="text-base-content/70 mt-1 text-xs">{image.alt}</p>
														{#if image.copyright}
															<p class="text-base-content/70 text-xs">
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
											<h6
												class="text-base-content mb-1 flex items-center gap-1 text-xs font-semibold"
											>
												<Icon
													icon="lucide:eye"
													width="14"
													class="text-info-strong"
													aria-hidden="true"
												/>
												So sieht es an der Oberfläche aus
											</h6>
											<ul class="text-base-content/80 ml-3 list-disc space-y-0.5 text-xs">
												{#each species.surfacing as item (item)}
													<li>{item}</li>
												{/each}
											</ul>
										</div>

										<!-- Erkennungsmerkmale, nach Beobachtbarkeit gruppiert -->
										<div>
											<h6 class="text-base-content mb-1 text-xs font-medium">Erkennungsmerkmale</h6>
											<div class="space-y-2">
												{#each observabilityOrder as level (level)}
													{@const features = featuresFor(species.distinguishing, level)}
													{#if features.length > 0}
														<div>
															<span class="badge badge-xs {observabilityBadge[level]} mb-1">
																{observabilityLabels[level]}
															</span>
															<ul class="text-base-content/80 ml-3 list-disc space-y-0.5 text-xs">
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
												<h6
													class="text-base-content mb-1 flex items-center gap-1 text-xs font-medium"
												>
													<Icon icon="lucide:git-compare-arrows" width="14" />
													Häufig verwechselt mit
												</h6>
												<ul class="text-base-content/80 ml-3 list-disc space-y-0.5 text-xs">
													{#each species.confusion as item (item)}
														<li>{item}</li>
													{/each}
												</ul>
											</div>
										{/if}

										<!-- Typisches Verhalten -->
										<div>
											<h6 class="text-base-content mb-1 text-xs font-medium">
												Typisches Verhalten
											</h6>
											<ul class="text-base-content/80 ml-3 list-disc space-y-0.5 text-xs">
												{#each species.behavior as behaviorItem (behaviorItem)}
													<li>{behaviorItem}</li>
												{/each}
											</ul>
										</div>

										<!-- Merkregel -->
										{#if species.fieldTip}
											<p
												class="border-primary/40 text-base-content/80 border-l-2 pl-2 text-xs font-medium italic"
											>
												{species.fieldTip}
											</p>
										{/if}

										<!-- Grunddaten: bewusst zuletzt, weil im Feld nicht schätzbar -->
										<div class="border-base-300 border-t pt-2">
											<div class="text-base-content/60 grid grid-cols-1 gap-1 text-xs">
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

			<!-- Übergreifende Unterscheidungshilfen -->
			<div class="space-y-3">
				<div class="bg-base-200 rounded-lg p-3">
					<h6 class="text-base-content mb-1 flex items-center gap-1 text-xs font-semibold">
						<Icon icon="lucide:circle-help" width="14" />
						Wal oder Robbe? Die häufigste Verwechslung
					</h6>
					<div class="text-base-content/80 space-y-1 text-xs">
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
					<h6 class="text-base-content mb-1 flex items-center gap-1 text-xs font-semibold">
						<Icon icon="lucide:circle-help" width="14" />
						Robben unterscheiden: erst das Kopfprofil, dann die Nasenlöcher
					</h6>
					<div class="text-base-content/80 space-y-1 text-xs">
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
						<p class="text-base-content/60">
							Das Kopfprofil ist auch auf 100–200 m mit dem Fernglas erkennbar. Die Nasenlöcher sind
							das sicherste Merkmal, aber meist nur auf einem Foto zu beurteilen.
						</p>
					</div>
				</div>

				<div class="bg-base-200 rounded-lg p-3">
					<h6 class="text-base-content mb-1 flex items-center gap-1 text-xs font-semibold">
						<Icon icon="lucide:camera" width="14" />
						Was der Forschung am meisten hilft
					</h6>
					<ul class="text-base-content/80 ml-3 list-disc space-y-0.5 text-xs">
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
<dialog bind:this={modalElement} class="modal" onclose={handleDialogClose}>
	<div class="modal-box w-11/12 max-w-5xl p-0">
		{#if modalImageSrc}
			<div class="relative">
				<!-- Modal Header -->
				<div class="bg-base-200 flex items-center justify-between p-4">
					<h3 class="text-base-content text-lg font-bold">{modalImageAlt}</h3>
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

	<!-- Backdrop - click to close -->
	<div
		class="modal-backdrop cursor-pointer"
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
		box-shadow:
			0 20px 25px -5px oklch(0% 0 0 / 0.1),
			0 10px 10px -5px oklch(0% 0 0 / 0.04);
	}

	.modal-backdrop {
		backdrop-filter: blur(4px);
		background-color: oklch(0% 0 0 / 0.6);
	}

	.modal img {
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px oklch(0% 0 0 / 0.1);
	}

	/* Copyright-Links stammen aus {@html} und brauchen daher globale Selektoren */
	:global(.text-base-content\/50 a),
	:global(.text-base-content\/60 a) {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: opacity 0.2s ease;
	}
	:global(.text-base-content\/50 a:hover),
	:global(.text-base-content\/60 a:hover) {
		opacity: 0.8;
	}

	@media (max-width: 640px) {
		.collapse-title {
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
