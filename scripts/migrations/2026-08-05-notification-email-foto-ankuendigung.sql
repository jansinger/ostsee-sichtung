-- Zieht die geseedete Benachrichtigungs-Vorlage auf den Stand, in dem der
-- Foto-Hinweis über `photoAnnouncementPending` verzweigt statt über
-- `sighting.mediaUpload`.
--
-- Hintergrund: Das Web-Formular setzt `aufnahmeHochladen` genau dann, wenn eine
-- Datei hochgeladen wurde (`ModernReportForm.svelte`), und `saveSighting`
-- verknüpft sie in derselben Transaktion — vor dem Versand der Mail. Die alte
-- Vorlage verzweigte über dieses Flag und kündigte deshalb bei **jedem** über
-- das Formular hochgeladenen Foto ein noch per E-Mail nachkommendes an
-- („📷 Foto angekündigt … es kommt separat per E-Mail nach"). Aufgefallen an
-- zwei Testmeldungen in preprod, die ihr Bild angehängt hatten.
--
-- Der Kontextwert `photoAnnouncementPending` steht im Code (`emailService.ts`)
-- und zieht mit dem Deployment automatisch mit. Ohne diesen Lauf verzweigt die
-- gespeicherte Vorlage aber weiter über `sighting.mediaUpload` — der Hinweis
-- bliebe also falsch.
--
-- Das Gegenstück zu `npm run config:refresh-email-template`, für Hosts, auf denen
-- kein Checkout liegt (das Runtime-Image enthält `src/tools/` nicht).
--
-- Aufruf auf dem DMM-Host: Die Datenbank veröffentlicht dort keinen Port, sie
-- hängt nur im internen Docker-Netz `ostsee_internal`. Weder ein psql vom Host
-- noch ein SSH-Tunnel erreichen sie — der Weg führt durch den Container:
--
--   scp scripts/migrations/2026-08-05-notification-email-foto-ankuendigung.sql dmm:/tmp/
--   ssh dmm
--   cd /opt/ostsee-tiere
--   sudo -v   # Passwort vorab, damit die Eingabeumleitung unten nicht mit dem
--             # Prompt konkurriert
--   sudo docker compose exec -T db psql -U postgres -d ostsee \
--     < /tmp/2026-08-05-notification-email-foto-ankuendigung.sql
--
-- `psql -U postgres` im Container braucht kein Passwort (lokale Socket-
-- Verbindung, `trust` in der pg_hba des Images). Erwartete Ausgabe: `UPDATE 1`
-- und die OK-Meldung; bei `UPDATE 0` entscheidet die Schluss-Abfrage, ob der
-- Stand schon aktuell oder der Text angepasst ist.
--
-- Sicherheit: Die UPDATE-Bedingung prüft den SHA-256 des gespeicherten Werts gegen
-- die Liste der jemals ausgelieferten Stände. Ein im Admin-Bereich angepasster
-- Text trifft keinen Eintrag und bleibt unangetastet — der Lauf meldet dann
-- `UPDATE 0` und die Schluss-Abfrage sagt es im Klartext.
--
-- Idempotent: Ein zweiter Lauf ändert nichts (der aktuelle Stand steht bewusst
-- nicht in der Liste der erlaubten Ausgangswerte).
--
-- Diese Datei ist aus `NOTIFICATION_EMAIL_DEFAULT_TEMPLATE` erzeugt; die Nutzlast
-- ist byte-identisch mit der Konstante.

BEGIN;

-- 1. Ist-Zustand vor der Änderung
SELECT
	updated_by,
	updated_at,
	length(value #>> '{}') AS zeichen,
	encode(sha256(convert_to(value #>> '{}', 'UTF8')), 'hex') AS hash_vorher
FROM app_config
WHERE key = 'notification.email.template';

-- 2. Nachziehen — nur, wenn der gespeicherte Wert ein unveränderter Seed ist
UPDATE app_config
SET
	value = to_jsonb($tpl$<!DOCTYPE html>
<html lang="de">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Neue Meldung - {{referenceId}}</title>
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
		<h1 style="margin: 0; font-size: 24px;">🐋 Neue Meldung eingegangen</h1>
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
		<p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Hinweis:</strong> Bitte prüfen Sie diese Meldung besonders sorgfältig.</p>
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

		Nicht über sighting.mediaUpload verzweigen: Das Web-Formular setzt
		dasselbe Flag, sobald eine Datei hochgeladen wurde — die Mail behauptete
		dann bei jedem angehängten Foto, es käme noch eines per E-Mail nach.
		photoAnnouncementPending heißt „angekündigt und noch nichts da".
	--}}
	{{#if photoAnnouncementPending}}
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
			🔍 Meldung im Admin-Bereich prüfen
		</a>
	</div>

	<!-- Footer -->
	<div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid {{colors.border}}; color: {{colors.textMuted}}; font-size: 14px;">
		<p style="margin: 0;">Ostsee-Tiere · Meldungen für den Meeresschutz</p>
		<p style="margin: 8px 0 0 0;">Diese E-Mail wurde automatisch generiert am {{currentDate}} um {{currentTime}}</p>
	</div>
</body>
</html>$tpl$::text),
	updated_by = 'refresh-email-template-sql',
	updated_at = NOW()
WHERE key = 'notification.email.template'
	AND encode(sha256(convert_to(value #>> '{}', 'UTF8')), 'hex') = ANY (ARRAY[
		'2527b475241de0f1039f9cca27c920997f6e14bed4bc6ce087689dc6617ed392',
		'aed55e5b04055cc8b30a86bab9e91d3d64f982fbb63c3c202d732bcd87480763',
		'2444299392fe83096f5a2ebbcd4806c20f4fc1866dd0d13c105066ccfc0dd7f0',
		'e40a8d357f37192aa47c71cf1883514110b50ed773e98620bbd9110aa3e17390',
		'7f55d293b7799debff9908e074e8e22c2b87323c98bf7b76cc7ba86186e95a8e',
		'28cc78828fb2383bf92a3738dc75fc83f57ae041884d790ca877e6f46b9a1c72',
		'ba2a26024338b19b441c6b5aa2d6b8d66aea611fa474952952d859b0c40d46bc'
	]);

-- 3. Ergebnis im Klartext
SELECT CASE
	WHEN h = '72c4ef86b59a8477be01ab701541369a4a75055b645b79654ecb3d155c4ab46d'
		THEN 'OK — Vorlage ist auf dem aktuellen Stand (Foto-Hinweis nur bei fehlender Datei).'
	ELSE 'ACHTUNG — kein bekannter Seed, es wurde nichts geaendert. Angepasster Text, Hash: ' || h
END AS ergebnis
FROM (
	SELECT encode(sha256(convert_to(value #>> '{}', 'UTF8')), 'hex') AS h
	FROM app_config
	WHERE key = 'notification.email.template'
) t;

COMMIT;

-- Laufende Instanzen halten die alte Vorlage bis zu 5 Minuten im Config-Cache.
