/**
 * notificationEmailDefault.ts — Standard-Vorlage der Benachrichtigungs-Mail
 *
 * **Warum als eigenes Modul und nicht als Literal in `configInitializer.ts`:**
 * Dieselbe Zeichenkette wird an zwei Stellen gebraucht — beim Seeden nach
 * `app_config` und vom Nachzieh-Werkzeug `src/tools/refresh-email-template.ts`,
 * das einen unveränderten Seed in einer bestehenden Installation auf den
 * aktuellen Stand hebt. Das Modul hat deshalb bewusst **keine Importe**: so lässt
 * es sich aus einem `tsx`-Skript ohne SvelteKit-Alias-Auflösung laden.
 *
 * **Der Ostsee-Status kommt aus dem Kontext, nicht aus den Flags.** Die Vorlage
 * verzweigt über `sighting.balticSea` (siehe `balticSeaEmailContext.ts`) — ein
 * Wert, der aus derselben Funktion stammt wie die Anzeige im Admin-Bereich.
 * Wer hier wieder `{{#if sighting.inBalticSeaGeo}}` einbaut, prüft die grobe
 * Bounding Box und weist damit Meldungen aus dem Hamburger Hafen als Ostsee aus
 * (Fehler 4 in `docs/OSTSEE_FLAGS.md`).
 *
 * **Wer diese Vorlage ändert, muss den Seed nachziehen.** Der in `app_config`
 * gespeicherte Wert gewinnt gegen diesen Default
 * (`ConfigRepository.getString(…, NOTIFICATION_EMAIL_DEFAULT_TEMPLATE)`) — eine Änderung hier
 * wirkt auf keine bestehende Installation. Ablauf und Fingerabdruck-Liste:
 * `src/tools/refresh-email-template.ts`.
 */
/**
 * SHA-256 aller Vorlagen, die dieses Projekt jemals als Default **ausgeliefert**
 * hat — jüngste zuerst. Ein in `app_config` gespeicherter Wert, dessen Hash hier
 * steht, ist ein unveränderter Seed und darf nachgezogen werden; jeder andere
 * Wert ist ein angepasster Kundentext und wird nicht angefasst.
 *
 * **Wer `NOTIFICATION_EMAIL_DEFAULT_TEMPLATE` ändert, trägt den Hash des alten
 * Stands hier oben ein.** Fehlt er, hält `src/tools/refresh-email-template.ts`
 * jeden frisch geseedeten Bestand für angepasst und zieht ihn nie wieder nach.
 * `notificationEmailDefault.test.ts` erzwingt das: der Test pinnt den Hash des
 * aktuellen Stands und schlägt bei jeder Änderung fehl.
 */
export const PREVIOUS_SHIPPED_TEMPLATE_HASHES = [
	// Stand bis 2026-08-04: ohne Totfund-Abschnitt. `isDead`, `deadCondition`
	// und `deadSize` lagen im Kontext, wurden aber von keiner ausgelieferten
	// Vorlage gerendert — die Mail zu einem Totfund war von der zu einer
	// lebenden Sichtung nicht zu unterscheiden.
	'2444299392fe83096f5a2ebbcd4806c20f4fc1866dd0d13c105066ccfc0dd7f0',
	// Stand bis 2026-07-30: Foto-Hinweis wortidentisch, aber „rebuilter
	// iOS-Client" statt der im Projekt sonst üblichen Formulierung „neu
	// gebauter iOS-Client" (siehe .claude/rules/legacy-api.md).
	'e40a8d357f37192aa47c71cf1883514110b50ed773e98620bbd9110aa3e17390',
	// Stand bis 2026-07-30: ohne Hinweis auf ein per E-Mail nachgereichtes
	// Foto (neu gebauter iOS-Client `OstSeeTiere/8` setzt `aufnahmeHochladen`,
	// kann aber keine Datei hochladen).
	'7f55d293b7799debff9908e074e8e22c2b87323c98bf7b76cc7ba86186e95a8e',
	// Stand bis 2026-07-30: verzweigte über `inBalticSeaGeo` (Bounding Box) und
	// zeigte einer Meldung aus dem Hamburger Hafen „Ostsee ✓".
	'28cc78828fb2383bf92a3738dc75fc83f57ae041884d790ca877e6f46b9a1c72',
	// Stand vor der Umstellung auf emailTokens.ts (hartcodierte Hex-Farben).
	'ba2a26024338b19b441c6b5aa2d6b8d66aea611fa474952952d859b0c40d46bc'
] as const;

export const NOTIFICATION_EMAIL_DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="de">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Neue Sichtung - {{referenceId}}</title>
	<style>
		.alert-warning { background: {{colors.warningSurface}}; border-left: 4px solid {{colors.warningStrong}}; padding: 12px; margin: 16px 0; }
		.alert-success { background: {{colors.successSurface}}; border-left: 4px solid {{colors.successStrong}}; padding: 12px; margin: 16px 0; }
		.alert-info { background: {{colors.infoSurface}}; border-left: 4px solid {{colors.infoStrong}}; padding: 12px; margin: 16px 0; }
		/* Die Fläche kommt inline aus {{sighting.balticSea.surface}} — ein
		   Klassenname pro Status wäre eine zweite Zuordnung des Status. */
		.badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
		.coordinates { font-family: monospace; background: {{colors.page}}; padding: 4px 8px; border-radius: 4px; }
	</style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; line-height: 1.6; color: {{colors.text}};">
	<!-- Header -->
	<div style="background: {{colors.brand}}; color: {{colors.brandContent}}; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
		<h1 style="margin: 0; font-size: 24px;">🐋 Neue Sichtung eingegangen</h1>
		<p style="margin: 8px 0 0 0; opacity: 0.9;">Referenz: <strong>{{referenceId}}</strong></p>
		<p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.8;">{{currentDate}} um {{currentTime}}</p>
	</div>

	<!-- Spam Check Warning -->
	{{#if spamCheck.isHighRisk}}
	<div class="alert-warning">
		<h4 style="margin: 0 0 8px 0; color: {{colors.warningStrong}};">⚠️ Spam-Verdacht (Score: {{spamCheck.score}})</h4>
		<ul style="margin: 8px 0 0 20px; padding: 0;">
			{{#each spamCheck.indicators}}
			<li style="margin: 4px 0;">{{this}}</li>
			{{/each}}
		</ul>
		<p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Hinweis:</strong> Bitte prüfen Sie diese Sichtung besonders sorgfältig.</p>
	</div>
	{{/if}}

	<!-- Geographic Validation -->
	{{!--
		Handlebars-Kommentar, kein HTML-Kommentar: in einem <!-- --> würde die
		unten genannte Bedingung ausgewertet statt zitiert.

		Der ganze Block hing früher an der Koordinaten-Bedingung — eine Meldung
		ohne Koordinaten erwähnte die Position dann gar nicht, während die
		Admin-Übersicht „ohne Position" anzeigte. Der Status steht deshalb immer
		da; nur die Koordinatenzeile hängt an den Koordinaten.
	--}}
	<div style="background: {{colors.surface}}; padding: 20px; border-radius: 8px; margin: 20px 0;">
		<h3 style="margin: 0 0 16px 0; color: {{colors.brand}}; display: flex; align-items: center;">
			📍 Positionsangabe
			<span class="badge" style="margin-left: 12px; background: {{sighting.balticSea.surface}}; color: {{colors.text}};">{{sighting.balticSea.label}}</span>
		</h3>
		{{#if sighting.coordinatesFormatted}}
		<p><strong>Koordinaten:</strong> <span class="coordinates">{{sighting.coordinatesFormatted}}</span></p>
		{{/if}}
		{{#if sighting.waterway}}
		<p><strong>Gewässer:</strong> {{sighting.waterway}}</p>
		{{/if}}
		{{#if sighting.seaMark}}
		<p><strong>Seezeichen:</strong> {{sighting.seaMark}}</p>
		{{/if}}
		
		{{#if sighting.balticSea.needsAttention}}
		<div class="alert-info">
			<p style="margin: 0; font-size: 14px;">
				<strong>Achtung:</strong> {{sighting.balticSea.title}}
			</p>
		</div>
		{{/if}}
	</div>

	<!-- Sighting Details -->
	<div style="background: {{colors.surface}}; padding: 20px; border-radius: 8px; margin: 20px 0;">
		<h3 style="margin: 0 0 16px 0; color: {{colors.brand}};">🔍 Sichtungsdetails</h3>
		<table style="width: 100%; border-collapse: collapse;">
			<tr>
				<td style="padding: 8px 12px 8px 0; font-weight: bold; vertical-align: top; width: 120px;">Datum:</td>
				<td style="padding: 8px 0;">{{sighting.sightingDate}}</td>
			</tr>
			{{#if sighting.species}}
			<tr>
				<td style="padding: 8px 12px 8px 0; font-weight: bold; vertical-align: top;">Tierart:</td>
				<td style="padding: 8px 0;">{{sighting.species}}</td>
			</tr>
			{{/if}}
			{{#if sighting.totalCount}}
			<tr>
				<td style="padding: 8px 12px 8px 0; font-weight: bold; vertical-align: top;">Anzahl:</td>
				<td style="padding: 8px 0;">{{sighting.totalCount}}</td>
			</tr>
			{{/if}}
			{{#if sighting.distance}}
			<tr>
				<td style="padding: 8px 12px 8px 0; font-weight: bold; vertical-align: top;">Entfernung:</td>
				<td style="padding: 8px 0;">{{sighting.distance}}</td>
			</tr>
			{{/if}}
			{{#if sighting.behavior}}
			<tr>
				<td style="padding: 8px 12px 8px 0; font-weight: bold; vertical-align: top;">Verhalten:</td>
				<td style="padding: 8px 0;">{{sighting.behavior}}</td>
			</tr>
			{{/if}}
		</table>
	</div>

	{{!--
		Totfund. Der Zustand kommt als **Label** aus formatSightingForDisplay() —
		der Rohwert ist ein Enum-Code und stünde hier als „Zustand: 3". Die Größe
		ist eine Zahl in Zentimetern (Schema: „Körperlänge (cm)"), die Einheit
		gehört deshalb in die Vorlage.

		Die Zeile zum Meeresmuseum steht als einzige in **beiden** Fällen da: ein
		„ja" warnt vor der Doppelmeldung, ein „nein" heißt, dass ein Rückruf
		nötig sein kann. Ein weggelassener Nein-Fall wäre für den Empfänger von
		einer fehlenden Angabe nicht zu unterscheiden.

		Der Nein-Zweig sagt bewusst „nicht als telefonisch informiert gemeldet"
		und nicht „nicht informiert": Die Quelle ist ein Kontrollkästchen mit
		Vorgabe „aus" (Spalte totfund_telefon, Standard 0). Ein nicht gesetztes
		Häkchen bedeutet, dass die Meldung dazu nichts aussagt — ein Anruf am
		Telefon vorbei an diesem Formular ist damit nicht ausgeschlossen. Die
		Vorlage darf deshalb den Zustand der Meldung wiedergeben, nicht den der
		Welt.
	--}}
	{{#if sighting.isDead}}
	<div style="background: {{colors.errorSurface}}; border-left: 4px solid {{colors.errorStrong}}; padding: 20px; border-radius: 8px; margin: 20px 0;">
		<h3 style="margin: 0 0 12px 0; color: {{colors.errorStrong}};">💀 Totfund</h3>
		<p style="margin: 0;">Diese Meldung betrifft ein totes Tier.</p>
		{{#if sighting.deadCondition}}
		<p style="margin: 8px 0 0 0;"><strong>Zustand:</strong> {{sighting.deadCondition}}</p>
		{{/if}}
		{{#if sighting.deadSize}}
		<p style="margin: 8px 0 0 0;"><strong>Körperlänge:</strong> {{sighting.deadSize}} cm</p>
		{{/if}}
		<p style="margin: 8px 0 0 0;"><strong>Meeresmuseum:</strong> {{#if sighting.deadPhoneContact}}laut Melder bereits telefonisch informiert — vor einem Rückruf bitte den Stand abgleichen, sonst entsteht eine Doppelmeldung.{{else}}nicht als telefonisch informiert gemeldet — ein Rückruf beim Melder kann nötig sein.{{/if}}</p>
	</div>
	{{/if}}

	{{!--
		Foto-Ankündigung: Der neu gebaute iOS-Client (OstSeeTiere/8, Stand
		2026-07-30) setzt aufnahmeHochladen, kann aber selbst keine Datei
		hochladen — der Melder wird gebeten, das Foto per E-Mail nachzureichen.
		Ohne diesen Hinweis lässt sich die später eintreffende Foto-Mail keiner
		Sichtung zuordnen. Siehe $lib/utils/media/photoAnnouncement.ts.
	--}}
	{{#if sighting.mediaUpload}}
	<div class="alert-info">
		<p style="margin: 0; font-size: 14px;">
			<strong>📷 Foto angekündigt:</strong> Der Melder hat laut App ein Foto, kann es aber nicht direkt hochladen — es kommt separat per E-Mail nach. Beim Eintreffen bitte anhand der Referenz-ID <strong>{{referenceId}}</strong> zuordnen.
		</p>
	</div>
	{{/if}}

	<!-- Contact Information -->
	{{#if sighting.email}}
	<div style="background: {{colors.surface}}; padding: 20px; border-radius: 8px; margin: 20px 0;">
		<h3 style="margin: 0 0 16px 0; color: {{colors.brand}};">👤 Kontaktdaten</h3>
		{{#if sighting.firstName}}
		<p><strong>Name:</strong> {{sighting.firstName}} {{sighting.lastName}}</p>
		{{/if}}
		<p><strong>E-Mail:</strong> <a href="mailto:{{sighting.email}}" style="color: {{colors.brand}};">{{sighting.email}}</a></p>
		{{#if sighting.phone}}
		<p><strong>Telefon:</strong> <a href="tel:{{sighting.phone}}" style="color: {{colors.brand}};">{{sighting.phone}}</a></p>
		{{/if}}
	</div>
	{{/if}}

	<!-- Notes -->
	{{#if sighting.notes}}
	<div style="background: {{colors.warningSurface}}; border-left: 4px solid {{colors.warningStrong}}; padding: 20px; border-radius: 8px; margin: 20px 0;">
		<h3 style="margin: 0 0 12px 0; color: {{colors.warningStrong}};">💬 Bemerkungen</h3>
		<p style="margin: 0; white-space: pre-wrap;">{{sighting.notes}}</p>
	</div>
	{{/if}}

	<!-- Additional Spam Indicators -->
	{{#if spamCheck.indicators}}
	{{#unless spamCheck.isHighRisk}}
	{{#if spamCheck.score}}
	<div style="background: {{colors.warningSurface}}; padding: 16px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
		<p style="margin: 0 0 8px 0;"><strong>Hinweise zur Qualitätsprüfung (Score: {{spamCheck.score}}):</strong></p>
		<ul style="margin: 0; padding-left: 20px;">
			{{#each spamCheck.indicators}}
			<li style="margin: 2px 0;">{{this}}</li>
			{{/each}}
		</ul>
	</div>
	{{/if}}
	{{/unless}}
	{{/if}}
	
	<!-- Action Button -->
	<div style="text-align: center; margin: 32px 0;">
		<a href="{{adminUrl}}" style="display: inline-block; background: {{colors.brand}}; color: {{colors.brandContent}}; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
			🔍 Sichtung im Admin-Bereich prüfen
		</a>
	</div>

	<!-- Footer -->
	<div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid {{colors.border}}; color: {{colors.textMuted}}; font-size: 14px;">
		<p style="margin: 0;">Ostsee-Tiere · Sichtungsmeldungen für den Meeresschutz</p>
		<p style="margin: 8px 0 0 0;">Diese E-Mail wurde automatisch generiert am {{currentDate}} um {{currentTime}}</p>
	</div>
</body>
</html>`;
