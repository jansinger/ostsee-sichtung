#!/usr/bin/env bash
#
# Shard-Zuordnung der E2E-Specs — einzige Quelle für CI **und** lokal.
#
#   scripts/e2e-shards.sh --check     nur der Vollständigkeits-Abgleich (~2 s)
#   scripts/e2e-shards.sh form|map|smoke   Abgleich + Lauf des Shards
#
# Der Abgleich lag früher ausschließlich im Schritt „Run E2E tests" in
# .github/workflows/ci.yml und war damit erst nach dem Push prüfbar. Zwischen
# dem 2026-08-08 und dem 2026-08-09 waren vier von neun CI-Fehlschlägen genau
# dieser eine vergessene Eintrag (admin-status-history, admin-filter-presets,
# admin-queue, hover-transitions) — jedes Mal alle drei Shards rot, nach zwei
# Sekunden, bevor ein einziger Test lief. Deshalb steht das Ganze hier: Wer
# einen Spec anlegt, kann `npm run test:e2e:shards` fahren; `npm run test:quick`
# tut es ohnehin mit.
#
# Wer die Listen ändert, liest den Messblock weiter unten — die Zuordnung folgt
# der gemessenen CI-Schrittdauer, nicht dem Thema.

set -euo pipefail
shopt -s nullglob

# Die Listen unten sind relativ zum Repo-Wurzelverzeichnis, und der
# Playwright-Abgleich vergleicht gegen `process.cwd()`. Aus einem
# Unterverzeichnis heraus aufgerufen stimmte sonst keiner der beiden Pfade.
cd "$(dirname "$0")/.."

# In GitHub Actions faltet `::error::` die Meldung an die richtige Stelle im
# Log; lokal ist das Rauschen. Dieselbe Meldung, zwei Umgebungen.
fail() {
	if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
		echo "::error::$1"
	else
		echo "FEHLER: $1" >&2
	fi
	shift
	for line in "$@"; do
		echo "$line" >&2
	done
	exit 1
}

usage() {
	echo "Aufruf: scripts/e2e-shards.sh --check | form | map | smoke" >&2
	exit 2
}

[ $# -eq 1 ] || usage
target="$1"

# Die Specs stehen einzeln da, weil die drei Shards parallel laufen und
# ähnlich lang brauchen sollen — ein Verzeichnis je Shard gäbe das nicht
# her. Der Preis war bisher, dass ein neu angelegter Spec in keiner Liste
# stand und damit **nirgends** lief. Genau so konnte #749 einen roten
# Wächter auf `main` hinterlassen, ohne dass eine Prüfung anschlug; beim
# Aufräumen fielen 14 weitere Specs auf, die nie in CI gelaufen sind.
# Der Vollständigkeits-Abgleich unten macht aus „vergessen" einen
# Fehlschlag — die Aufzählung bleibt, ihr stiller Ausfall nicht.
form=(
	e2e/form-submit.spec.ts
	e2e/form-ux.spec.ts
	e2e/form-a11y.spec.ts
	e2e/form-autosave.spec.ts
	# Thematisch bei den beiden anderen Admin-Specs in `map` — steht
	# hier nach derselben Regel, die die dort begründet: Nach #769 misst
	# `form` 152 s und ist damit der kürzeste Shard, `map` mit 169 s der
	# längste. Der Spec wiegt lokal 9 s; er gehört an den kurzen Shard.
	# Der Aufschlag für die kalt kompilierte /admin-Route ist dabei
	# eingeplant (Begründung weiter unten bei `smoke`).
	e2e/admin-detail-actions.spec.ts
	# Aus demselben Grund hier und nicht bei den Admin-Specs in `map`:
	# `form` ist der kürzeste Shard, und die /admin-Route wird durch den
	# Spec darüber ohnehin schon kalt kompiliert — der Aufschlag fällt
	# hier also kein zweites Mal an. Lokal 13 s für zwei Tests.
	e2e/admin-table-dead-finding.spec.ts
	# Bei den beiden Admin-Specs darüber, nach derselben Laufzeit-Regel:
	# `form` ist der kürzeste Shard. Der Spec fährt die Eingangsseite
	# /admin und die Tabelle /admin/sichtungen — letztere kompiliert
	# der dead-finding-Spec darüber bereits kalt. Lokal 3 Tests, ~9 s.
	e2e/admin-inbox.spec.ts
	# Warteschlangen-Modus der Detailansicht: fährt /admin, /admin/[id]
	# und /admin/sichtungen — alle drei kompilieren die Admin-Specs
	# darüber bereits kalt. Lokal 4 Tests, ~10 s.
	#
	# Die Begründung „`form` ist der kürzeste Shard" aus den Blöcken
	# darüber stimmt so nicht mehr: Über die letzten drei erfolgreichen
	# main-Läufe (2026-08-09, aus den CI-Schrittdauern) misst `smoke`
	# 249–271 s und ist deutlich der längste, während `form` (202–217 s)
	# und `map` (203–221 s) gleichauf liegen. Der Spec kommt trotzdem
	# hierher und nicht nach `map`: Bei gleicher Laufzeit entscheidet die
	# bereits bezahlte Kaltkompilierung der drei Admin-Routen. Wer den
	# nächsten Spec zuordnet, sollte allerdings `smoke` entlasten statt
	# der veralteten Regel zu folgen.
	e2e/admin-queue.spec.ts
	# Die folgenden drei kamen mit der Vereinheitlichung des
	# Sichtungs-Status dazu und stehen aus demselben Grund hier wie die
	# drei Admin-Specs darüber: `form` war nach #769 der kürzeste Shard,
	# und /admin wie /admin/sichtungen kompilieren die Specs darüber
	# bereits kalt — der Aufschlag fällt hier kein weiteres Mal an.
	#
	# Die offene Frage von hier ist am 2026-08-08 beantwortet: über die
	# letzten drei erfolgreichen main-Läufe misst `form` 188/192/207 s,
	# `map` 211/215/216 s, `smoke` 247/260/273 s. `form` ist also auch
	# nach dem Zuwachs weiterhin der kürzeste Shard — die Zuordnungen
	# oben und unten bleiben damit gültig. Maßgeblich sind wie gehabt
	# die Schrittdauern aus GitHub Actions, nicht lokale Zahlen
	# (Begründung im Warnblock bei `smoke`).
	e2e/admin-sighting-status.spec.ts
	e2e/admin-table-mobile-status-overflow.spec.ts
	# Direkt beim Schwester-Spec darüber: dieselbe Route
	# (/admin/sichtungen), dieselbe Mobilkarte, derselbe Messhelfer.
	# Der Kaltkompilier-Aufschlag der Route fällt hier damit kein
	# weiteres Mal an. Lokal 2 Tests, ~8 s — er legt sich seine
	# Sichtung selbst an und räumt sie wieder weg.
	e2e/admin-table-mobile-reference-overflow.spec.ts
	# Fährt /admin/[id]/edit statt der Tabelle — der einzige der drei
	# mit einer eigenen kalt zu kompilierenden Route.
	e2e/admin-edit-toggle-no-wrap-lock.spec.ts
	# Direkt beim Schwester-Spec admin-detail-actions oben: dieselbe
	# Route (/admin/[id]), die dieser damit bereits kalt kompiliert
	# hat. `form` ist laut der Messung oben weiterhin der kürzeste
	# Shard. Lokal 1 Test, ~2 s — er legt sich seine Sichtung selbst an
	# und räumt sie per ON DELETE CASCADE wieder weg.
	e2e/admin-status-history.spec.ts
	# Nach derselben Regel wie die Admin-Specs darüber: `form` ist laut
	# der Messung oben weiterhin der kürzeste Shard, und
	# /admin/sichtungen kompiliert der dead-finding-Spec bereits kalt —
	# der Aufschlag fällt hier kein weiteres Mal an. Lokal 4 Tests,
	# ~12 s; die Presets liegen in `localStorage`, der Spec räumt sie
	# in `beforeEach` selbst ab und braucht keine Testzeilen in der DB.
	e2e/admin-filter-presets.spec.ts
	# Hover-Übergänge von .card/.btn. Thematisch stünde der Spec bei
	# design-tokens.spec.ts in `smoke` — er prüft das Design System,
	# nicht das Formular. Er kommt trotzdem hierher, weil der Hinweis
	# bei admin-queue.spec.ts oben ausdrücklich verlangt, `smoke` zu
	# entlasten (249–271 s gegen 202–217 s bei `form`). Er fährt mit
	# /about eine Route, die in `form` sonst niemand kalt kompiliert —
	# das ist der Preis dieser Zuordnung. Lokal 3 Tests, ~9 s.
	e2e/hover-transitions.spec.ts
)

# Die drei Shards laufen parallel; die Laufzeit des Jobs ist die des
# längsten. Ab hier folgt die Zuordnung deshalb der gemessenen Dauer
# und erst danach dem Thema — `map` trägt sichtbar Specs, die mit der
# Karte nichts zu tun haben. app-shell-height fährt immerhin die
# MapPage mit, der Rest ist Admin- und Formular-Verhalten. Alle Shards
# bekommen denselben Unterbau (PostGIS-Service, Migrationen, Seed),
# DB-Specs sind hier also genauso zu Hause wie anderswo.
map=(
	e2e/map-*.spec.ts
	e2e/horizontal-overflow.spec.ts
	e2e/admin-edit-preserves-record.spec.ts
	e2e/app-shell-height.spec.ts
	e2e/submit-offline.spec.ts
	e2e/meldung-wording.spec.ts
	# Trotz `form`-Präfix hier: teilt sich mit dem Schwester-Spec
	# map-pan-zoom.spec.ts das Messwerkzeug (e2e/helpers/mapCanvas.ts).
	# Fällt nicht unter das Glob und steht deshalb einzeln.
	e2e/form-map-pan-zoom.spec.ts
	# Ebenfalls trotz `form`-Präfix hier, aber aus dem Laufzeit-Grund
	# oben und nicht wegen geteilten Werkzeugs: Beide prüfen die Karte
	# im Meldeformular — ein Tippen setzt die Koordinaten, ein Foto mit
	# EXIF-GPS setzt Position, Datum und Uhrzeit, und die
	# Bereichsprüfung schlägt außerhalb der Ostsee an. Das ist dieselbe
	# Komponente, die die map-*-Specs fahren.
	e2e/form-position.spec.ts
	e2e/form-position-photo.spec.ts
)

# design-tokens.spec.ts gehört hierher, nicht zu form: es prüft das
# Theme, nicht das Formular. Läuft gegen /styleguide, das der
# dev-Guard nur im Entwicklungsmodus freigibt — der Shard startet
# ohnehin `vite dev` (playwright.config.ts).
#
# modal-overflow.spec.ts aus demselben Grund: Es prüft Layout über
# /, /bestimmungshilfe und /admin, nicht das Formular.
smoke=(
	e2e/basic.test.ts
	e2e/homepage.test.ts
	e2e/about-page.spec.ts
	e2e/auth.spec.ts
	e2e/design-tokens.spec.ts
	e2e/modal-overflow.spec.ts
	e2e/bestimmungshilfe.spec.ts
	e2e/navbar-structure.spec.ts
	e2e/seo-meta.spec.ts
	e2e/footer-layout.spec.ts
	# Die beiden Stepper-Specs stünden thematisch bei `form`. Sie liegen
	# hier, weil `form` der längste Shard ist und sie zusammen 44 s
	# wiegen.
	e2e/form-stepper.spec.ts
	e2e/form-stepper-affordance.spec.ts
	e2e/videoUpload.spec.ts
	# Aus demselben Laufzeit-Grund, und thematisch bei modal-overflow
	# zu Hause: Der Spec prüft den ortsfesten Balken gegen Viewport und
	# scroll-padding — Layout, nicht Formularlogik.
	e2e/form-field-mode.spec.ts
	# Die folgenden drei kamen mit der Einstiegsseite („Was möchten Sie
	# melden?") dazu. Sie stünden thematisch bei `form` und liegen hier,
	# weil `form` zum Zeitpunkt ihrer Zuordnung der längste Shard war.
	#
	# ACHTUNG: Diese Begründung ist seit #769 überholt — dort wurde nach
	# echten CI-Schrittdauern neu verteilt, und `form` ist seither der
	# kürzeste Shard. Neu gemessen wurde nach dem Merge noch nicht.
	# Wer das nächste Mal ausbalanciert, prüft diese drei zuerst: Sie
	# gehören thematisch zu `form` und dürften nach der aktuellen Regel
	# („Zuordnung folgt der gemessenen Dauer und erst danach dem Thema")
	# ohnehin dorthin. Lokal wiegen sie zusammen rund 45 s — lokale
	# Zahlen sind aber genau die, vor denen der Block weiter unten
	# warnt; maßgeblich ist die Schrittdauer aus GitHub Actions.
	e2e/report-kind-choice.spec.ts
	# Zweite Ausblende-Achse: `sightingFrom` auf Schritt 2, nicht die
	# Einstiegsseite. Der schwerste der drei.
	e2e/form-from-land.spec.ts
	# `mediaConsent` auf Schritt 4, nur bei vorhandener Aufnahme.
	e2e/media-consent-placement.spec.ts
)

# Der Rückstand von 14 Specs ist abgearbeitet: 13 davon liefen am
# 2026-08-05 lokal dreimal hintereinander durch (82 Tests je Lauf,
# kein Fehlschlag, kein Flake) und stehen jetzt in `map` bzw. `smoke`.
#
# Verteilt wurde nach gemessener Dauer, nicht nach Thema. `form` hat
# dabei bewusst nichts abbekommen; der Shard war schon der längste,
# und die Job-Laufzeit ist die des längsten.
#
# **Womit gemessen wird.** Maßgeblich ist die Schrittdauer „Run E2E
# tests" aus GitHub Actions selbst:
#
#   gh api "repos/jansinger/ostsee-tiere/actions/runs/<id>/jobs" --jq \
#     '.jobs[] | select(.name|startswith("E2E Tests")) | [.name,
#      ((.steps[]|select(.name=="Run E2E tests")
#        |(((.completed_at|fromdate)-(.started_at|fromdate))|tostring)))]|@tsv'
#
# **Nicht** die Summe der `result.duration` aus `--reporter=json`, mit
# der die Aufteilung bis hierher gerechnet wurde. Playwright rechnet
# `beforeAll` keinem Test zu, und fast alle map-Specs bauen ihre Seite
# genau dort auf (`test.describe.serial` + geteilte Page, siehe
# map-accessibility.spec.ts: 0,4 s für 18 Tests). Die Summe lässt
# `map` dadurch um ein Vielfaches zu billig aussehen. Gemessen an den
# echten Schrittdauern stand hier nicht 190/153/152, sondern nach #766
# form 205 s, smoke 128 s, map 122 s — und E2E Tests (form) war mit
# 258 s die Wanduhr des **gesamten** Workflows, nächstlängster Job
# 171 s.
#
# Ein einziger lokaler Lauf über alle Shards misst die Shards übrigens
# nicht: In CI ist jeder Shard ein eigener Job mit kaltem
# `node_modules/.vite`, lokal ist der Dep-Cache warm — die erste Datei
# trägt sonst die Kaltstartkosten aller anderen. Pro Shard mit eigenem,
# frisch gestartetem Dev-Server messen; lokale Wanduhr × Shard-Faktor
# (gemessen: form 1,35 · map 1,29 · smoke 1,37) trifft die
# CI-Schrittdauer eines **unveränderten** Shards gut.
#
# Was dieser Faktor **nicht** kann: die Kosten eines verschobenen Specs
# vorhersagen. Die Verschiebung hier war auf 157/158/155 geschätzt und
# kam bei 152/169/161 heraus — `form` fast genau, beide aufnehmenden
# Shards rund 10 s darüber. Der Grund ist derselbe wie oben: Der
# aufnehmende Shard zahlt die Vite-Kaltkompilierung der Routen, die er
# vorher nicht gefahren ist, noch einmal. Wer verschiebt, plant den
# Aufschlag ein und prüft danach an der echten Schrittdauer nach.
#
# Wer hier etwas hinzufügt oder verschiebt, misst vorher — so.
#
# Der Rückstand ist damit vollständig abgearbeitet: form-map-pan-zoom
# .spec.ts, der letzte verbliebene Eintrag, steht seit dem 2026-08-05
# in `map`.
#
# Der Befund („in 3 von 4 Baseline-Läufen rot") stimmte, die Diagnose
# war ungenau: Verglichen wurde nicht **nach** der Geste — die
# Canvas-Fingerprints dort hängen an `expect.poll` und sind robust —,
# sondern **davor**, in einer Vorprüfung `box.y >= 0` auf der Oberkante
# des Karten-Containers. `scrollIntoViewIfNeeded` zentriert die Karte,
# und der Sub-Pixel-Rest daraus macht `box.y` minimal negativ, sobald
# die 400px hohe Karte die Fensterhöhe ausfüllt. Reproduziert bei
# 1280×400: `box.y = -0.40625`, Vorprüfung rot, während die Geste bei
# `y = 311.6` mitten im Bild lag und die Karte einwandfrei schob. Die
# Vorprüfung fragt jetzt per `elementFromPoint`, ob die Geste die Karte
# trifft — dieselbe Frage ohne Fließkomma-Rand. 10 aufeinanderfolgende
# Läufe grün, dazu 4 von 4 bei 1280×400.
#
# Die Liste bleibt als leeres Array stehen, damit der Abgleich unten
# unverändert über vier Listen läuft. Sie ist **kein Parkplatz**: Ein
# neuer Spec gehört in einen Shard, und was hier landet, läuft nirgends.
unassigned=()

# Die Soll-Liste kommt von Playwright selbst, nicht von einem `find`,
# das dessen Auswahlregel nachbaut. Der Nachbau war in beide
# Richtungen falsch: Er kannte nur `.ts/.tsx/.js/.jsx`, während der
# Default-`testMatch` auch `.mts/.cts/.mjs/.cjs` einsammelt — eine
# `foo.spec.mts` hätte den Abgleich bestanden und wäre trotzdem in
# keinem Shard gelaufen, also genau der stille Ausfall, gegen den er
# gebaut wurde. Umgekehrt gilt `testIgnore: ['**/helpers/**']` auf
# jeder Ebene, `-not -path 'e2e/helpers/*'` nur auf der obersten; eine
# Datei unter `e2e/pages/helpers/` hätte CI rot gemacht und eine
# Zuordnung verlangt, die Playwright nie ausführt.
#
# `--list` braucht weder Dev-Server noch Datenbank (kein `webServer`,
# kein `globalSetup`) und läuft in rund zwei Sekunden. Genau deshalb
# ist der Abgleich auch lokal zumutbar und hängt in `test:quick`.
# Der Bericht geht über `PLAYWRIGHT_JSON_OUTPUT_NAME` in eine Datei
# statt über stdout: dort steht eine dotenv-Präambel davor, an der
# jedes JSON.parse scheitert. `suite.file` ist relativ zu
# `config.rootDir` — und das ist das testDir (`e2e/`), nicht das
# Repo-Wurzelverzeichnis.
#
# Ein Unterprozess statt eines `**`-Musters hält außerdem die Zusage aus
# #761 ein: Das Skript bleibt mit `bash -n` prüfbar, weil weder
# `globstar` noch `extglob` nötig sind.
playwright_report=$(mktemp)
trap 'rm -f "$playwright_report"' EXIT
PLAYWRIGHT_JSON_OUTPUT_NAME="$playwright_report" \
	npx playwright test --list --reporter=json > /dev/null

collect='
	const { readFileSync } = require("node:fs");
	const { relative, resolve } = require("node:path");
	const report = JSON.parse(readFileSync(process.argv[1], "utf8"));
	for (const suite of report.suites) {
	  console.log(relative(process.cwd(), resolve(report.config.rootDir, suite.file)));
	}
'
mapfile -t collected < <(node -e "$collect" "$playwright_report" | sort -u)

# Ohne diese Schranke ginge eine leere Auswahl — umbenanntes testDir,
# kaputte Config — als „alles zugeordnet" durch.
if [ ${#collected[@]} -eq 0 ]; then
	fail "Playwright hat keine Specs gemeldet; der Abgleich wäre wertlos."
fi

known=" ${form[*]} ${map[*]} ${smoke[*]} ${unassigned[*]} "
selected=" ${collected[*]} "

# Ein Spec, der in keiner der vier Listen steht, ist neu und beim
# Anlegen vergessen worden.
missing=()
for spec in "${collected[@]}"; do
	case "$known" in
		*" $spec "*) ;;
		*) missing+=("$spec") ;;
	esac
done
if [ ${#missing[@]} -gt 0 ]; then
	fail "Diese Specs stehen in keinem Shard und würden nirgends laufen: ${missing[*]}" \
		"Bitte in scripts/e2e-shards.sh einem Shard (form/map/smoke) zuordnen." \
		"Die Zuordnung folgt der gemessenen CI-Schrittdauer — siehe Messblock im Skript."
fi

# Die Gegenrichtung: Ein Eintrag, den Playwright nicht auswählt — weil
# die Datei umbenannt wurde oder der Pfad sich vertippt hat — läuft
# stillschweigend nicht. Playwright bricht nur ab, wenn **kein**
# Argument trifft; ein einzelner toter Eintrag neben lebenden fällt
# sonst nirgends auf.
dead=()
for spec in "${form[@]}" "${map[@]}" "${smoke[@]}" "${unassigned[@]}"; do
	case "$selected" in
		*" $spec "*) ;;
		*) dead+=("$spec") ;;
	esac
done
if [ ${#dead[@]} -gt 0 ]; then
	fail "Diese Einträge wählt Playwright nicht aus und liefen damit nie: ${dead[*]}" \
		"Bitte in scripts/e2e-shards.sh korrigieren oder entfernen."
fi

# `--check` endet hier: Der Abgleich ist das, was lokal in zwei Sekunden
# zu haben ist. Der Lauf selbst braucht Dev-Server, PostGIS und Seed und
# gehört damit nicht in `test:quick`.
if [ "$target" = "--check" ]; then
	echo "E2E-Shards: ${#collected[@]} Specs, alle zugeordnet."
	exit 0
fi

case "$target" in
	form) specs=("${form[@]}") ;;
	map) specs=("${map[@]}") ;;
	smoke) specs=("${smoke[@]}") ;;
	*)
		echo "Unknown shard: $target" >&2
		usage
		;;
esac

# Ohne diese Schranke wäre ein leer gelaufenes Glob (nullglob) ein
# `npm run test:e2e --` ohne Argumente — und das startet die gesamte
# Suite statt des Shards.
if [ ${#specs[@]} -eq 0 ]; then
	fail "Shard $target hat keine Specs ermittelt."
fi

npm run test:e2e -- "${specs[@]}"
