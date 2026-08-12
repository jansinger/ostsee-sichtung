/**
 * HTML-Inhalte für Popups und Hover-Infos der Sichtungskarte (M6).
 *
 * Reine String-Builder ohne DOM-/OpenLayers-Abhängigkeit, damit sie in
 * Node-Unit-Tests prüfbar sind. Alle Nutzdaten laufen durch sanitizeText;
 * die Darstellung kommt aus CSS-Klassen in mapStyles.css — keine
 * Inline-Styles am Theme vorbei.
 */
import { getLocale } from '$lib/paraglide/runtime';
import { sanitizeText } from '$lib/utils/sanitize';
import { resolveDisplayLocale } from '$lib/utils/format/dateTime';
import type { MapTranslations } from './mapUtils';

/** Feature-Properties einer Sichtung, wie sie im GeoJSON ankommen. */
export interface SightingPopupProperties {
	ta: string | number; // Tierart
	ct: number; // Anzahl
	jt?: number; // Jungtiere
	ts?: number; // Timestamp (Unix-Sekunden)
	tf?: boolean; // Totfund
	shipname?: string;
	waterway?: string;
	name?: string;
	firstname?: string;
}

// M5: timeZone explizit setzen, sonst bestimmt die Browser-Zone das Datum
// (bis zu ±1 Tag Abweichung von der Berlin-Anzeige).
function formatSightingDate(ts: number | undefined, fallback: string): string {
	return ts
		? new Date(ts * 1000).toLocaleDateString(resolveDisplayLocale(getLocale()), {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				timeZone: 'Europe/Berlin'
			})
		: fallback;
}

/** Artname aus der speciesMap, sanitisiert; der Fallback-Text variiert je Kontext. */
function speciesName(
	props: SightingPopupProperties,
	translations: MapTranslations,
	fallback: string
): string {
	return sanitizeText(translations.speciesMap[props.ta.toString()] || fallback);
}

/** Detail-Inhalt für das Klick-Popup einer einzelnen Sichtung. */
export function createSightingPopupContent(
	props: SightingPopupProperties,
	translations: MapTranslations
): string {
	const date = formatSightingDate(props.ts, 'Unbekannt');

	let content = `
		<div class="sighting-popup">
			<h3 class="popup-title">${speciesName(props, translations, `Unbekannte Art (${props.ta})`)}</h3>
			<div class="popup-row">
				<strong>${sanitizeText(translations.count)}:</strong> ${props.ct}
			</div>
	`;

	if (props.jt && props.jt > 0) {
		content += `
			<div class="popup-row">
				<strong>${sanitizeText(translations.young)}:</strong> ${props.jt}
			</div>
		`;
	}

	if (props.tf) {
		content += `
			<div class="popup-row popup-row-dead">
				<strong>${sanitizeText(translations.found_dead)}:</strong> Ja
			</div>
		`;
	}

	content += `
			<div class="popup-row">
				<strong>${sanitizeText(translations.report_date)}</strong> ${date}
			</div>
	`;

	if (props.waterway) {
		content += `
			<div class="popup-row">
				<strong>${sanitizeText(translations.area)}:</strong> ${sanitizeText(props.waterway)}
			</div>
		`;
	}

	if (props.name || props.firstname) {
		const fullName = [props.firstname, props.name]
			.filter(Boolean)
			.map((v) => sanitizeText(v!))
			.join(' ');
		content += `
			<div class="popup-row">
				<strong>${sanitizeText(translations.name)}:</strong> ${fullName}
			</div>
		`;
	}

	if (props.shipname) {
		content += `
			<div class="popup-row">
				<strong>${sanitizeText(translations.ship)}:</strong> ${sanitizeText(props.shipname)}
			</div>
		`;
	}

	content += '</div>';
	return content;
}

/**
 * Scrollbare Liste aller Sichtungen eines Clusters.
 * Erwartet bereits sortierte Properties (via sortFeaturesByDate im Controller).
 */
export function createClusterListContent(
	propsList: SightingPopupProperties[],
	translations: MapTranslations
): string {
	const count = propsList.length;

	let items = '';
	propsList.forEach((props, index) => {
		const name = speciesName(props, translations, `Art ${props.ta}`);
		const date = formatSightingDate(props.ts, 'Unbekannt');
		const deadBadge = props.tf ? '<span class="cluster-item-dead">&#x2020;</span>' : '';
		const tierWord = props.ct > 1 ? 'Tiere' : 'Tier';

		items += `
			<li>
				<button
					type="button"
					data-cluster-index="${index}"
					class="cluster-list-item"
					aria-label="${name}, ${props.ct} ${tierWord}, ${date}"
				>
					<span class="cluster-item-species">${name}${deadBadge}</span>
					<span class="cluster-item-count">${props.ct}&nbsp;${tierWord}</span>
					<span class="cluster-item-date">${date}</span>
				</button>
			</li>
		`;
	});

	return `
		<div class="cluster-popup">
			<h3 class="popup-title">${count} Sichtungen an diesem Ort</h3>
			<ul class="cluster-list" aria-label="${count} Sichtungen">
				${items}
			</ul>
		</div>
	`;
}

/** Kompakte Hover-Info einer einzelnen Sichtung. */
export function createInfoText(
	props: SightingPopupProperties,
	translations: MapTranslations
): string {
	const species = speciesName(props, translations, 'Unbekannte Art');
	const count = props.ct || 0;
	const date = formatSightingDate(props.ts, 'Unbekanntes Datum');
	const isDead = props.tf ? ` (${sanitizeText(translations.found_dead)})` : '';
	// M6: Fahrwasser konsistent auch im Hover anzeigen, nicht nur im Popup
	const waterway = props.waterway
		? `<br>${sanitizeText(translations.area)}: ${sanitizeText(props.waterway)}`
		: '';
	return `
		<div class="p-2 text-sm">
			<strong>${species}</strong><br>
			${sanitizeText(translations.count)}: ${count}${isDead}<br>
			${sanitizeText(translations.report_date)} ${date}${waterway}
		</div>
	`;
}

/** Hover-Zusammenfassung eines Clusters (häufigste Arten). */
export function createClusterInfoText(
	propsList: SightingPopupProperties[],
	translations: MapTranslations
): string {
	const count = propsList.length;
	const speciesCount: Record<string, number> = {};

	propsList.forEach((props) => {
		const speciesKey = props.ta.toString();
		speciesCount[speciesKey] = (speciesCount[speciesKey] || 0) + 1;
	});

	const sortedSpecies = Object.entries(speciesCount)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3) // Zeige nur die 3 häufigsten Arten
		.map(([speciesId, speciesTotal]) => {
			const name = sanitizeText(translations.speciesMap[speciesId] || 'Unbekannte Art');
			return `${name}: ${speciesTotal}`;
		});

	return `
		<div class="p-2 text-sm">
			<strong>${count} Sichtungen</strong><br>
			${sortedSpecies.join('<br>')}
		</div>
	`;
}
