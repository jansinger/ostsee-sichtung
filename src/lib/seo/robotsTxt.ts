/**
 * Inhalt von `/robots.txt`, abhängig vom Host der Anfrage.
 *
 * **Warum überhaupt eine Fallunterscheidung?** Staging und Production laufen
 * aus demselben Image und derselben `docker-compose.production.yml`; beide
 * setzen `NODE_ENV=production` und unterscheiden sich allein in ihrer `.env`
 * (`docs/RELEASE_PIPELINE.md`, Abschnitt „Host-Setup"). Eine statische Datei
 * unter `static/` läge auf beiden identisch — und der Staging-Host, der sich
 * automatisch das `staging`-Image zieht, wäre indexierbar. Duplicate Content
 * einer Museumsseite bekommt man aus einem Suchindex nur schwer wieder heraus.
 *
 * **Warum am Host und nicht an einer Umgebungsvariablen?** Eine neue Variable
 * müsste auf dem Production-Host gesetzt werden — und der läuft mit einem
 * eigenen Compose-Stand, den dieses Repository nicht erreicht. Eine Datei, die
 * ihre Wirkung erst nach einer Fremdänderung entfaltet, wäre bis dahin still
 * wirkungslos. Der Host steht dagegen in jeder Anfrage.
 *
 * Die Richtung ist bewusst gewählt: Unbekannter Host → alles gesperrt. Ein
 * versehentlich gesperrtes Production ist an einem Blick auf `/robots.txt`
 * erkennbar und in einer Zeile behoben; ein versehentlich indexiertes Staging
 * ist es nicht.
 *
 * Nicht enthalten, obwohl es naheläge: ein Riegel für `/en`. Ein gesperrter
 * Pfad wird gar nicht erst abgerufen — ein `X-Robots-Tag` oder `hreflang`
 * darauf bliebe ungelesen. Steuerung der Indexierung einzelner Sprachfassungen
 * gehört in den Header (`noindexEnglishPages.ts`), nicht hierher.
 */

/**
 * Hosts, unter denen die Anwendung öffentlich indexiert werden soll.
 *
 * Kommt eine weitere Domain dazu (etwa eine Subdomain des Museums), gehört sie
 * hier hinein — sonst liefert sie `Disallow: /` aus.
 */
const KANONISCHE_HOSTS = ['ostsee-tiere.de', 'www.ostsee-tiere.de'] as const;

/**
 * Pfade ohne Nutzen für einen Suchindex.
 *
 * `/api` und `/admin` kosten nur Crawl-Budget (und liefern ohnehin 401/404).
 * `/uploads` steht hier aus einem inhaltlichen Grund: Die Medien-Endpunkte
 * liefern freigegebene Dateien ohne Anmeldung und **ohne EXIF-Bereinigung**
 * aus. Landen sie in der Bildersuche, verbreiten sich mögliche Aufnahmeorte
 * aus den Metadaten weiter, als die Meldenden erwarten durften.
 *
 * Die Legacy-Endpunkte stehen doppelt: einmal blank, einmal je Sprachkürzel.
 * Der CakePHP-Router akzeptierte `/de/` und `/en/` vor jedem dieser Pfade, und
 * die Anwendung tut das weiterhin (`legacy-api/languagePrefix.ts`).
 * robots.txt vergleicht Präfixe wörtlich — `Disallow: /rest_sichtungen` deckt
 * `/en/rest_sichtungen` nicht ab. Einen Stern-Platzhalter im Pfad verstehen
 * Google und Bing, er ist aber nicht Teil des ursprünglichen Standards; die
 * ausgeschriebene Liste wirkt bei jedem Crawler.
 */
const GESPERRTE_PFADE = [
	'/admin',
	'/api/',
	'/uploads/',
	'/maintenance',
	'/health',
	'/rest_sichtungen',
	'/sichtungen/showreports.json',
	'/de/rest_sichtungen',
	'/de/sichtungen/showreports.json',
	'/en/rest_sichtungen',
	'/en/sichtungen/showreports.json'
] as const;

/**
 * Vorbereiteter Riegel für KI-Crawler — auskommentiert.
 *
 * Der Zustand vor dieser Datei war „alles erlaubt", und ob die Inhalte des
 * Museums (Bestimmungshilfe, Artfotos, Sichtungsdaten) in Trainingsdaten und
 * KI-Antworten eingehen sollen, ist eine Entscheidung des Deutschen
 * Meeresmuseums, keine technische. Sie hier still zu treffen, wäre eine
 * Änderung der Rechtelage im Vorbeigehen. Der Block steht deshalb fertig da:
 * Zum Sperren die Rautezeichen entfernen.
 *
 * Zu beachten, falls das je geschieht: `Google-Extended` steuert nur Gemini
 * und die KI-Übersichten, nicht die normale Google-Suche — die bleibt über
 * `Googlebot` erreichbar. `GPTBot` und `ClaudeBot` sammeln Trainingsdaten,
 * `OAI-SearchBot` und `PerplexityBot` beantworten Live-Anfragen; wer nur das
 * Training ausschließen will, sperrt nicht alle vier.
 */
const KI_CRAWLER = ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'PerplexityBot'] as const;

/** Vergleicht Hosts unabhängig von Groß-/Kleinschreibung und Port. */
export function istKanonischerHost(host: string): boolean {
	const ohnePort = host.toLowerCase().split(':')[0];
	return KANONISCHE_HOSTS.some((kanonisch) => kanonisch === ohnePort);
}

/**
 * @param url Die angefragte URL. Host **und** Origin kommen daraus, damit die
 *   `Sitemap:`-Zeile auf denselben Host zeigt, unter dem die Datei abgerufen
 *   wurde — eine absolute URL ist dort vorgeschrieben.
 */
export function buildRobotsTxt(url: URL): string {
	if (!istKanonischerHost(url.host)) {
		return [
			'# Diese Instanz ist nicht die öffentliche Fassung von Ostsee-Tiere',
			'# (Staging, Vorschau oder Direktzugriff auf den Hostnamen).',
			'# Erzeugt aus src/lib/seo/robotsTxt.ts — dort steht die Begründung.',
			'',
			'User-agent: *',
			'Disallow: /',
			''
		].join('\n');
	}

	const kiBlock = KI_CRAWLER.flatMap((bot) => [`# User-agent: ${bot}`, '# Disallow: /', '#']);

	return [
		'# Ostsee-Tiere — Meerestier-Sichtungen in der Ostsee',
		'# Deutsches Meeresmuseum, Stralsund',
		'#',
		'# Erzeugt aus src/lib/seo/robotsTxt.ts. Änderungen gehören dorthin,',
		'# nicht in eine Datei unter static/ — der Inhalt hängt am Host.',
		'',
		'User-agent: *',
		...GESPERRTE_PFADE.map((pfad) => `Disallow: ${pfad}`),
		'',
		'# KI-Crawler sind zugelassen. Zum Sperren die folgenden Zeilen',
		'# entkommentieren — Hintergrund in src/lib/seo/robotsTxt.ts.',
		...kiBlock,
		'',
		`Sitemap: ${url.origin}/sitemap.xml`,
		''
	].join('\n');
}
