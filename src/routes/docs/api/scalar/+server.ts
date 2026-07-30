import { ScalarApiReference } from '@scalar/sveltekit';
import type { RequestHandler } from './$types';

/**
 * KEIN `customCss` hier — und das ist eine bewusste Entscheidung, keine Lücke.
 *
 * Bis 2026-07-30 stand hier ein Block, der Scrolling und Sidebar-Navigation
 * „reparieren" sollte und beides erst kaputt gemacht hat. Von seinen Selektoren
 * existiert im ausgelieferten Scalar-Bundle nur `.scalar-app`:
 *
 * | Selektor                    | im Bundle | Wirkung                          |
 * | --------------------------- | --------- | -------------------------------- |
 * | `.scalar-app`               | ja        | `overflow: hidden` + `100vh`     |
 * | `.scalar-content`           | nein      | keine                            |
 * | `.scalar-sidebar`           | nein      | keine (nur `--scalar-sidebar-*`) |
 * | `.scalar-sidebar__item`     | nein      | keine                            |
 *
 * Die einzige greifende Regel hat also das Scrollen abgeschaltet, während die
 * Regeln, die es zurückholen sollten, ins Leere zielten. Im Browser gemessen:
 * `scrollHeight` 18.777 px gegen `clientHeight` 812 px — 17.965 px Inhalt waren
 * unerreichbar, und Klicks auf Endpunkte scrollten einen Container, der nicht
 * scrollen darf (deshalb wirkte die Navigation tot).
 *
 * Scalar bringt sein Layout (`.references-layout`, Grid mit `100dvh`) samt
 * Scroll-Containern selbst mit. Wer hier wieder CSS ergänzt, muss die
 * Klassennamen vorher im CDN-Bundle verifizieren — sie sind nicht Teil einer
 * öffentlichen API und ändern sich mit der unpinned CDN-Version.
 */
const configuration = {
	// `url` statt des deprecated `spec.url`: das Bundle migriert `spec.url`
	// intern weiter, protokolliert dabei aber eine Deprecation-Warnung.
	url: '/openapi.yml',
	theme: 'default' as const,
	layout: 'modern' as const,
	showSidebar: true,
	searchHotKey: 'k' as const,
	hiddenClients: [],
	isEditable: false,
	darkMode: false,
	metaData: {
		title: 'Ostsee-Tiere API Documentation',
		description: 'Interaktive API-Dokumentation für die Ostsee-Tiere Plattform',
		ogDescription: 'Umfassende OpenAPI-Dokumentation mit interaktiver Schnittstelle',
		ogTitle: 'Ostsee-Tiere API Docs',
		twitterCard: 'summary'
	}
};

export const GET: RequestHandler = ScalarApiReference(configuration);
