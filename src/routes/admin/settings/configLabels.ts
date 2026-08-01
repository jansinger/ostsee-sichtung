/**
 * Deutsche Bezeichnungen der Konfigurationsschlüssel und die Liste der
 * tatsächlich wirksamen Einstellungen.
 *
 * Warum diese Datei existiert (UX-Review 2026-07-30): Die Settings-Seite hat als
 * Überschrift jeder Einstellung den rohen Schlüssel gerendert
 * (`notification.email.senderName`), ergänzt nur um die optionale
 * `description` aus `configInitializer.ts`. Für Admins sah das nach fehlenden
 * Übersetzungen aus — es gab aber gar keine Label-Ebene.
 *
 * Bewusst hier und nicht in `configInitializer.ts`: Dessen `ConfigItem`-Objekte
 * werden in die Tabelle `app_config` geschrieben, die kein Label-Feld hat. Ein
 * Label dort einzuführen hieße, eine reine Anzeigezeichenkette in die Datenbank
 * zu migrieren.
 *
 * Vollständigkeit ist getestet: `configLabels.test.ts` vergleicht die Schlüssel
 * hier gegen `getAvailableConfigurationKeys()`. Eine neue Einstellung ohne Label
 * lässt den Test fehlschlagen — der rohe Schlüssel kann also nicht erneut in die
 * Oberfläche zurückkehren.
 */

/** Anzeigename pro Konfigurationsschlüssel. */
export const configLabels: Record<string, string> = {
	// Interne Benachrichtigung über neue Sichtungen
	//
	// Der Zusatz „intern“ ist nicht schmückend: `notification.email.*` steuert
	// ausschließlich die Mail an das Museum (`emailService.ts`, `to:
	// config.recipient`). Die meldende Person bekommt bis heute überhaupt keine
	// Mail — es gibt im ganzen Projekt nur zwei `sendMail`-Aufrufe, beide an
	// interne Adressen. Unter dem alten Label „E-Mail-Benachrichtigungen aktiv“
	// war das nicht zu erkennen; die naheliegende Lesart ist, dass hier der
	// Melder-Versand hängt. Wenn #621 kommt, bekommt der einen eigenen
	// Schlüssel — dieser hier ist dann nicht umzudeuten, sondern abzugrenzen.
	'notification.email.enabled': 'Interne Benachrichtigung bei neuer Sichtung',
	'notification.email.recipient': 'Empfänger-Adresse (Museum)',
	'notification.email.cc': 'Empfänger in Kopie (CC)',
	'notification.email.bcc': 'Empfänger in Blindkopie (BCC)',
	'notification.email.sender': 'Absender-Adresse',
	'notification.email.senderName': 'Absender-Name',
	'notification.email.template': 'HTML-Vorlage der internen Benachrichtigung',

	// SMTP-Zugang
	'email.smtp.host': 'SMTP-Server',
	'email.smtp.port': 'SMTP-Port',
	'email.smtp.secure': 'SMTP über SSL/TLS',
	'email.smtp.user': 'SMTP-Benutzername',
	'email.smtp.password': 'SMTP-Passwort',

	// Anzeige
	'display.maxSightingsPerPage': 'Sichtungen pro Seite in der Admin-Übersicht',
	'display.dateFormat': 'Datumsformat',
	'display.maintenanceMode': 'Wartungsmodus',
	'display.maintenanceMessage': 'Text der Wartungsmeldung',

	// Sicherheit und Uploads
	'security.maxFileSize': 'Maximale Dateigröße pro Upload (MB)',
	'security.maxVideoFileSize': 'Maximale Dateigröße für Videos (MB)',
	'security.maxTotalUploadSize': 'Maximale Gesamtgröße je Meldung (MB)',
	'security.allowedFileTypes': 'Erlaubte Dateitypen',
	'security.rateLimitPerIP': 'Maximale Meldungen pro IP-Adresse',
	'security.requireEmailVerification': 'E-Mail-Adresse bestätigen lassen',
	'security.autoApproveThreshold': 'Schwellwert für automatische Freigabe',

	// Datenverarbeitung
	'data.duplicateCheckRadius': 'Radius der Duplikatsprüfung (km)',
	'data.duplicateCheckTimeframe': 'Zeitfenster der Duplikatsprüfung (Stunden)',
	'data.exportFormats': 'Verfügbare Export-Formate',
	'data.archiveAfterDays': 'Archivierung nach Tagen (0 = keine)',

	// Integrationen
	'integration.weatherApiKey': 'API-Schlüssel Wetterdienst',
	'integration.geoApiKey': 'API-Schlüssel Geokodierung',
	'integration.webhookUrl': 'Webhook-Adresse',

	// Mobile App
	'mobile.minAppVersion': 'Mindestens erforderliche App-Version',
	'mobile.updateMessage': 'Hinweistext zum App-Update',
	'mobile.apiRateLimit': 'API-Limit der App (Anfragen pro Minute)'
};

/**
 * Liefert den Anzeigenamen, im Zweifel den Schlüssel selbst.
 *
 * Der Schlüssel als Rückfallwert ist Absicht: eine Einstellung ohne Label soll
 * bedienbar bleiben statt namenlos zu verschwinden. Dass dieser Fall nicht
 * eintritt, sichert `configLabels.test.ts` ab.
 */
export function getConfigLabel(key: string): string {
	return configLabels[key] ?? key;
}

/**
 * Einstellungen, die im Code tatsächlich gelesen werden.
 *
 * Alles andere existiert nur als Vorbelegung in der Datenbank und wird in der
 * Oberfläche als „Geplant" gekennzeichnet. Stand der Prüfung 2026-07-30 (jeweils
 * über die echten Aufrufstellen verifiziert, nicht über Namensähnlichkeit):
 *
 * | Einstellung                    | gelesen von                                              |
 * | ------------------------------ | -------------------------------------------------------- |
 * | `notification.email.*`         | `emailService.getEmailConfig()` / `initialize()`          |
 * | `email.smtp.*`                 | `emailService.initialize()`                               |
 * | `display.maintenanceMode`      | `ServerConfigService.isMaintenanceModeEnabled()`          |
 * | `display.maintenanceMessage`   | `maintenanceMode.ts`, `+layout.server.ts`, API-Route      |
 * | `display.maxSightingsPerPage`  | `getPaginationConfig()` → `admin/+page.server.ts`         |
 * | `security.maxFileSize`         | `getUploadConfig()` → `/api/config/upload`, `/api/files/upload` |
 * | `security.allowedFileTypes`    | `getUploadConfig()` (siehe oben)                          |
 *
 * Nicht gelesen und daher „Geplant": `display.dateFormat`, alle `data.*`, alle
 * `integration.*`, alle `mobile.*` sowie `security.rateLimitPerIP`,
 * `security.requireEmailVerification` und `security.autoApproveThreshold` —
 * deren einziger Leser `ServerConfigService.getSecurityConfig()` hat keine
 * Aufrufstelle.
 *
 * Karten-Defaults stehen hier bewusst nicht: Zentrum, Zoom und Tile-Quelle sind
 * in `src/lib/map/optimizedMapController.ts` fest verdrahtet.
 */
export const ACTIVE_CONFIG_KEYS: ReadonlySet<string> = new Set([
	'notification.email.enabled',
	'notification.email.recipient',
	'notification.email.cc',
	'notification.email.bcc',
	'notification.email.sender',
	'notification.email.senderName',
	'notification.email.template',

	'email.smtp.host',
	'email.smtp.port',
	'email.smtp.secure',
	'email.smtp.user',
	'email.smtp.password',

	'display.maintenanceMode',
	'display.maintenanceMessage',
	'display.maxSightingsPerPage',

	'security.maxFileSize',
	'security.maxVideoFileSize',
	'security.maxTotalUploadSize',
	'security.allowedFileTypes'
]);
