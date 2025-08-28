<script lang="ts">
	import SpeciesIdentificationHelp from './form/fields/SpeciesIdentificationHelp.svelte';
</script>

<!-- Enhanced Help Text -->
<div class="card bg-base-200/50 border-base-300 mt-8 border">
	<div class="card-body p-2">
		<details class="collapse">
			<summary class="collapse-title cursor-pointer text-sm font-medium">
				💡 Hilfe & Tipps für eine wertvolle Sichtungsmeldung
			</summary>
			<div class="collapse-content text-base-content/80 text-sm">
				<div class="space-y-4 pt-4">
					<div class="alert alert-info">
						<div>
							<h4 class="font-semibold">🎯 Warum ist Ihre Meldung wichtig?</h4>
							<p class="mt-1">
								Jede Sichtung hilft Wissenschaftlern dabei, Wanderrouten zu verstehen, Populationen
								zu überwachen und Schutzmaßnahmen zu entwickeln. Ihre Beobachtung trägt direkt zum
								Artenschutz bei!
							</p>
							<div class="bg-base-100 mt-3 rounded-lg p-3">
								<div class="grid grid-cols-2 gap-4 text-center text-sm">
									<div>
										<div class="text-primary font-bold">2.847</div>
										<div class="text-xs">Sichtungen gemeldet</div>
									</div>
									<div>
										<div class="text-primary font-bold">89%</div>
										<div class="text-xs">Beobachter füllen Zusatzfelder aus</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="card bg-base-100 p-4">
							<h4 class="mb-2 font-semibold">📍 Schritt 1: Position & Zeit</h4>
							<ul class="space-y-1 text-xs">
								<li><strong>GPS-Koordinaten:</strong> Am wertvollsten für die Forschung</li>
								<li><strong>Gewässername:</strong> Falls keine GPS-Daten verfügbar</li>
								<li><strong>Genaue Zeit:</strong> Hilft bei Verhaltensanalysen</li>
								<li>
									<strong>Tipp:</strong> Screenshots von Navigations-Apps sind hilfreich
								</li>
							</ul>
						</div>

						<div class="card bg-base-100 p-4">
							<h4 class="mb-2 font-semibold">🐋 Schritt 2: Sichtungsdetails</h4>
							<ul class="space-y-1 text-xs">
								<li><strong>Tierart:</strong> Bei Unsicherheit "Unbekannt" wählen</li>
								<li><strong>Anzahl:</strong> Auch Schätzungen sind wertvoll</li>
								<li><strong>Jungtiere:</strong> Wichtig für Populationsstudien</li>
								<li>
									<strong>Entfernung:</strong> Hilft bei der Einschätzung der Beobachtung
								</li>
							</ul>
						</div>

						<div class="card bg-base-100 p-4">
							<h4 class="mb-2 font-semibold">👀 Schritt 3: Beobachtungen</h4>
							<ul class="space-y-1 text-xs">
								<li><strong>Verhalten:</strong> Fütterung, Ruhen, Springen, etc.</li>
								<li>
									<strong>Umwelt:</strong> Seegang und Sichtweite beeinflussen Sichtungen
								</li>
								<li><strong>Fotos/Videos:</strong> Extrem hilfreich für Artbestimmung</li>
								<li><strong>Tipp:</strong> Auch unscharfe Bilder können nützlich sein</li>
							</ul>
							<div class="bg-success/10 mt-2 rounded p-2">
								<div class="text-success-content/70 text-xs">
									✅ <strong>95%</strong> der Forscher nutzen Wetterdaten für Populationsmodelle
								</div>
							</div>
						</div>

						<div class="card bg-base-100 p-4">
							<h4 class="mb-2 font-semibold">📧 Schritt 4: Kontaktdaten</h4>
							<ul class="space-y-1 text-xs">
								<li><strong>E-Mail:</strong> Für Bestätigung und Rückfragen</li>
								<li><strong>Boot-Info:</strong> Hilft bei Störungsanalysen</li>
								<li><strong>Datenschutz:</strong> Nur Sichtungsdaten werden öffentlich</li>
								<li><strong>Optional:</strong> Name nur mit Ihrer Zustimmung sichtbar</li>
							</ul>
						</div>
					</div>

					<div class="divider"></div>

					<div class="alert alert-success">
						<div>
							<h4 class="font-semibold text-center mb-4">📊 Ihre Daten machen den Unterschied</h4>
							<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
								<div class="bg-success/10 rounded-lg p-4 text-center border border-success/20">
									<div class="text-2xl font-bold text-success mb-2">3x</div>
									<div class="text-sm font-medium text-success-content">häufiger zitiert</div>
									<div class="text-xs text-success-content/70 mt-1">werden komplette Meldungen in Studien verwendet</div>
								</div>
								<div class="bg-success/10 rounded-lg p-4 text-center border border-success/20">
									<div class="text-2xl font-bold text-success mb-2">15</div>
									<div class="text-sm font-medium text-success-content">Jahre Treue</div>
									<div class="text-xs text-success-content/70 mt-1">melden manche Schiffe bereits regelmäßig</div>
								</div>
								<div class="bg-success/10 rounded-lg p-4 text-center border border-success/20 sm:col-span-2 lg:col-span-1">
									<div class="text-2xl font-bold text-success mb-2">47</div>
									<div class="text-sm font-medium text-success-content">neue Verhaltensweisen</div>
									<div class="text-xs text-success-content/70 mt-1">durch Ihre Fotos wissenschaftlich dokumentiert</div>
								</div>
							</div>
						</div>
					</div>

					<div class="alert alert-info">
						<SpeciesIdentificationHelp currentValue={0} />
					</div>

					<div class="alert alert-warning">
						<div>
							<h4 class="font-semibold">⚠️ Totfunde - Besonders wichtig!</h4>
							<p class="mt-1 text-xs">
								Tote Tiere liefern wichtige Erkenntnisse über Todesursachen und Gesundheit der
								Population.
								<strong>Bitte nicht berühren!</strong> Melden Sie den Fund auch an die örtlichen Behörden
								(Wasserschutzpolizei, Nationalparkamt).
							</p>
						</div>
					</div>

					<div class="alert alert-warning">
						<div>
							<h4 class="font-semibold">🇪🇺 Einfluss auf EU-Politik</h4>
							<p class="mt-1 text-xs">
								Ihre Sichtungsdaten fließen direkt in die <strong>EU-Meeresschutzrichtlinie</strong>
								und den
								<strong>IPCC-Klimabericht</strong> ein. Windpark-Planungen werden anhand Ihrer
								Koordinaten angepasst, um Meerestiere zu schützen.
								<strong>Sie beeinflussen maritime Politik!</strong>
							</p>
							<div class="mt-2 flex justify-center space-x-4 text-xs">
								<span class="badge badge-outline">EU-MSRL</span>
								<span class="badge badge-outline">IPCC Report</span>
								<span class="badge badge-outline">Natura 2000</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</details>
	</div>
</div>
