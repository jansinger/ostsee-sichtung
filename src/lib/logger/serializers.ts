import pino from 'pino';

/**
 * Pino-Serializer für Fehlerobjekte.
 *
 * Ohne sie geht die Fehlermeldung verloren: Pino serialisiert ein übergebenes
 * Objekt über seine **aufzählbaren** Eigenschaften, und `message` und `stack`
 * gehören auf einem `Error` nicht dazu. Im Log landete deshalb nur, was der
 * Werfende zusätzlich angehängt hatte — bei nodemailer etwa
 * `{"code":"ESOCKET","command":"CONN"}`, während die eigentliche Ursache
 * (`unable to get local issuer certificate`) unsichtbar blieb. Der Fehler sah
 * dadurch nach einem Netzwerkproblem aus.
 *
 * Beide Schlüssel sind belegt: Pinos Standard-Serializer greift nur bei `err`,
 * der Codebestand loggt aber durchgängig `{ error }`.
 */
export const LOG_SERIALIZERS = {
	error: pino.stdSerializers.err,
	err: pino.stdSerializers.err
};
