# Session-Store statt signiertem Cookie

**Datum:** 2026-07-31
**Issues:** [#635](https://github.com/jansinger/ostsee-tiere/issues/635) (Sicherheit), [#634](https://github.com/jansinger/ostsee-tiere/issues/634) (stiller Session-Ablauf)
**Status:** Entwurf, abgestimmt — noch kein Implementierungsplan

---

## 1. Problem

Die App stellt nach dem Auth0-Callback ihr **eigenes**, symmetrisch mit `SESSION_SECRET`
signiertes JWT aus und legt es als Cookie ab. Ab da ist Auth0 nicht mehr beteiligt: Jeder
Request wird gegen dasselbe Secret verifiziert, und `locals.isAdmin` entsteht aus dem
`roles`-Feld der Token-Payload.

Symmetrisch heißt: dasselbe Secret verifiziert **und** signiert. Wer `SESSION_SECRET` lesen
kann, stellt sich eine Admin-Session aus — ohne Auth0, ohne Passwort, ohne dass die Identität
in irgendeiner Benutzerverwaltung existieren muss.

Der Nachweis steht im Repo und läuft täglich in CI: `e2e/helpers/adminSession.ts` signiert ein
JWT mit `sub: 'e2e|design-tokens'` und `roles: ['admin']` und kommt damit an `/admin`. Diese
Identität existiert in keinem Auth0-Tenant und in keiner Datenbank.

### 1.1 Belegte Befunde

Alle Zeilenangaben gegen `main` bei Commit `11a4e87` geprüft.

| #   | Befund                                                                                                                                                                                                  | Beleg                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| B1  | Session-JWT wird mit `SESSION_SECRET` (HS256) signiert                                                                                                                                                  | `src/lib/server/auth/auth.ts:263–275`                              |
| B2  | Verifikation ohne `issuer`/`audience`/`algorithms`-Einschränkung                                                                                                                                        | `src/hooks.server.ts:77–78`, `src/lib/server/auth/auth.ts:229–230` |
| B3  | `locals.isAdmin` stammt allein aus der Token-Payload                                                                                                                                                    | `src/hooks.server.ts:85`                                           |
| B4  | Rollen stammen aus dem Auth0-Claim `${API_AUDIENCE}/roles`, einmalig beim Callback                                                                                                                      | `src/routes/api/auth/callback/+server.ts`                          |
| B5  | Es gibt keine Benutzertabelle. Schema: `sightings`, `sightingFiles`, `appConfig`, `auditLogs`                                                                                                           | `src/lib/server/db/schema.ts`                                      |
| B6  | `getAuthUser` hat **keinen** Aufrufer im Produktivcode — nur `auth.test.ts` importiert es                                                                                                               | Repo-weite Suche                                                   |
| B7  | Logout löscht nur das Cookie; das JWT bleibt gültig                                                                                                                                                     | `src/routes/api/auth/logout/+server.ts`                            |
| B8  | Startup-Guard prüft `SESSION_SECRET` nur auf _leer_, nicht auf Länge oder Platzhalter                                                                                                                   | `src/hooks.server.ts:26`                                           |
| B9  | Der Platzhalter `your-secret-key-here-min-32-chars` ist **33 Zeichen** lang — eine reine `>= 32`-Prüfung lässt ihn durch                                                                                | `.env.example:40`                                                  |
| B10 | `docs/ENVIRONMENT.md:96` zeigt als „Example" einen konkreten, echt aussehenden Wert (ebenfalls 33 Zeichen)                                                                                              | `docs/ENVIRONMENT.md:96`                                           |
| B11 | `scripts/docker-entrypoint.sh:60` prüft nur Präsenz                                                                                                                                                     | `scripts/docker-entrypoint.sh:60`                                  |
| B12 | `run-release.sh` startet den Container mit `--entrypoint ""` und umgeht das Entrypoint-Skript vollständig                                                                                               | `run-release.sh:275`                                               |
| B13 | CI erzeugt `.env` aus `.env.example` — CI hat nie ein echtes Secret, wohl aber ein funktionierendes                                                                                                     | `.github/workflows/ci.yml:109,261,376`                             |
| B14 | Staging und Production sind zwei Hosts mit je eigener Klartext-`.env`; der Abschnitt „Zwei Dinge, die getrennt sein müssen" (Zeile 169) nennt DB (171) und `uploads/` (175), **nicht** `SESSION_SECRET` | `docs/RELEASE_PIPELINE.md:101, 169–177`                            |
| B15 | Der Staging-Stack ist laut Setup-Checkliste noch nicht eingerichtet                                                                                                                                     | `docs/RELEASE_PIPELINE.md:207`                                     |
| B16 | Das Cookie ist nur signiert, nicht verschlüsselt: base64-Dekodieren liefert `sub`, E-Mail und Rollen im Klartext                                                                                        | folgt aus B1 (JWS statt JWE)                                       |

**Stand nach diesem Branch:** B8, B9 und B10 sind durch den in Abschnitt 4 beschriebenen
Startup-Guard (`secretGuard.ts`) behoben — sie beschreiben hier bewusst noch den Zustand
_vor_ dem Guard, als Begründung für dessen Notwendigkeit.

### 1.2 Offene Betriebsfrage

Woher `SESSION_SECRET` beim Start des Produktions-Containers kommt und wer diese Quelle lesen
kann, ist **nicht geklärt** (Stand 2026-07-31). Diese Spec arbeitet mit der ungünstigsten
Annahme: Klartext in `/opt/ostsee-tiere/.env`, lesbar für jeden mit Shell-Zugang auf dem Host
und in jedem Backup dieser Datei. Die Klärung ändert die Dringlichkeit von Paket A, nicht das
Ziel von Paket D.

---

## 2. Einordnung: kein Fehler, sondern ein Muster mit bekanntem Preis

Die Architektur im Repo ist das Mainstream-Muster für zustandslose Sessions. Auth0s eigenes
`nextjs-auth0` v4 nutzt per Default einen `StatelessSessionStore` — Session-Daten als JWE im
Cookie, verschlüsselt mit `AUTH0_SECRET`, mit rollierendem Ablauf. **Wer dort `AUTH0_SECRET`
hat, stellt genauso Sessions aus.** Die Alleinzuständigkeit eines symmetrischen Secrets ist
dem zustandslosen Ansatz inhärent.

Daraus folgt: Es gibt keinen Weg, der zustandslos bleibt _und_ Fälschung ausschließt. Wer die
Alleinzuständigkeit beseitigen will, muss den Zustand serverseitig halten.

SvelteKit bezieht in [seiner Auth-Dokumentation](https://svelte.dev/docs/kit/auth) bewusst
keine Position und beschreibt genau diesen Handel: Session-IDs liegen in der Datenbank, sind
„immediately revocable", kosten aber eine Query pro Request; JWTs werden „not checked against
a datastore, which means they cannot be immediately revoked", dafür weniger Latenz und Last.
Als Integrationspunkt nennt SvelteKit Server-Hooks und `locals` — das macht der Bestand
bereits richtig und bleibt unverändert.

Für **diese** Anwendungsform — server-gerenderte App mit eigenem Backend — empfiehlt Auth0 den
zustandsbehafteten Weg. Aus
[Best Practices for Application Session Management](https://auth0.com/blog/application-session-management-best-practices/):
Anwendungen sollen Sessions „with a server-side application session" führen, und das Cookie
soll nur „an anchor (an identifier stored in it)" tragen.

Einen offiziellen Auth0-SDK für SvelteKit gibt es weiterhin nicht. Die Alternative
[`@auth/sveltekit`](https://authjs.dev/reference/sveltekit) nutzt seinerseits standardmäßig
JWT-Cookies mit optionalem Datenbank-Adapter — derselbe Handel, plus Framework-Wechsel. Der
handgeschriebene PKCE-Flow im Repo bleibt angemessen und wird nicht angefasst.

---

## 3. Entscheidung

Zwei Pakete, getrennt ausgeliefert.

**Paket A — Startup-Guard.** Schließt den Fall „Deployment läuft mit einem öffentlich
bekannten Secret". Klein, sofort mergefähig — bis auf eine gewollte Ausnahme kein
Verhaltenswechsel: Ein Deployment mit ungültigem `ENCRYPTION_KEY` startete bisher und brach
erst beim ersten Login, jetzt verweigert es den Start.

**Paket D — Session-Store.** Das Cookie wird ein opakes Zufalls-Token, der Session-Zustand
liegt in einer Tabelle. Beseitigt die Fälschbarkeit vollständig und löst #634 im selben Zug.

A wird von D später wieder entfernt, weil `SESSION_SECRET` mit D verschwindet. Das ist kein
Argument gegen A, sondern gegen das Warten: A braucht Tage, D braucht Wochen, und dazwischen
liegt genau das Risiko, um das es geht.

### 3.1 Verworfene Alternativen

| Alternative                                                                    | Warum nicht                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ENV-Allowlist** (`ADMIN_SUBS`, `sub` gegen eine Liste prüfen)                | Verlagert Rollenverwaltung aus Auth0 heraus und schafft eine zweite Quelle für dieselbe Aussage. Dazu: die `sub`-Werte, auf die sie baut, stehen laut B16 im Klartext im Cookie.                                                                                                                                                                                    |
| **Auth0 Management API pro Request** (`GET /api/v2/users/{id}/roles`, gecacht) | Einziger Weg, bei dem Rollenentzug sofort greift — aber M2M-Client, zweites Secret in derselben `.env`, Auth0-Rate-Limits, und eine unangenehme Entscheidung zum Ausfallverhalten (fail-closed sperrt Admins aus, fail-open hebt den Schutz auf). Löst #634 nicht. Bleibt als **späterer Zusatz zu D** denkbar: Rollen in der Session-Zeile periodisch auffrischen. |
| **Auth0-Access-Token in der Session halten**, pro Request gegen JWKS prüfen    | Unfälschbar (RS256), aber Cookie-Größe und `offline_access`/Refresh-Flow nötig. Löst #634 nur teilweise.                                                                                                                                                                                                                                                            |
| **Asymmetrisch signieren (RS256/EdDSA)** — Maßnahme 5 aus #635                 | Bringt hier **nichts**. Signierer und Verifizierer sind derselbe Prozess mit derselben `.env`; der private Schlüssel läge exakt dort, wo heute das Secret liegt. Großer Aufwand, kein Gewinn.                                                                                                                                                                       |
| **Cookie verschlüsseln statt signieren (JWE)** — Auth0s SDK-Default            | Behebt B16 (Klartext-Claims), aber nicht das Kernproblem: dasselbe Secret ver- und entschlüsselt, Fälschung bleibt möglich.                                                                                                                                                                                                                                         |
| **Auf `@auth/sveltekit` wechseln**                                             | Derselbe Trade-off, plus Migration des gesamten Auth-Flows.                                                                                                                                                                                                                                                                                                         |

---

## 4. Paket A — Startup-Guard

### 4.1 Code

Die Prüflogik liegt in `src/lib/server/config/secretGuard.ts`, `hooks.server.ts` ruft sie nur
auf — in der Struktur des bestehenden `PLACEHOLDER_ENCRYPTION_KEY`-Guards (Zeilen 21, 36–45).

```ts
// Öffentlich bekannte Werte, die als Secret nie gelten dürfen:
// .env.example ist die Vorlage jeder Prod-.env, docs/ENVIRONMENT.md zeigt ein Beispiel.
const PUBLIC_SESSION_SECRETS = new Set([
	'your-secret-key-here-min-32-chars',
	'8K7h3L9mN2pQ4rS6tU8vW0xY2zA4bC6dE'
]);
const MIN_SESSION_SECRET_LENGTH = 32;
```

Der Guard bei Zeile 26 prüft dann drei Bedingungen statt einer: leer, kürzer als
`MIN_SESSION_SECRET_LENGTH`, oder Element von `PUBLIC_SESSION_SECRETS`.

**Warum die Menge und nicht nur die Länge:** B9 — der Platzhalter ist 33 Zeichen lang und
besteht jede reine Längenprüfung. Das ist die Falle, in die die naheliegende Umsetzung läuft.

**Warum `hooks.server.ts` und nicht `docker-entrypoint.sh`:** B11 und B12. Der Modul-Scope von
`hooks.server.ts` ist der einzige Punkt, den jeder Startweg durchläuft.

**Der `ENCRYPTION_KEY`-Guard kommt mit** (#635 verlangt ausdrücklich, ihn mitzuprüfen). Er ist
unvollständig: `src/lib/server/auth/crypto.ts:103` nutzt `aes-256-gcm`, das exakt 32 Byte
Schlüssel verlangt — also 64 Hex-Zeichen. Der bestehende Guard prüft nur _leer_ und
_Platzhalter_. Ein 32-stelliger Hex-Wert (16 Byte) kommt heute durch und lässt
`createCipheriv` erst beim ersten Login werfen, also auf dem Auth-Pfad. Die Prüfung wird um
Länge und Hex-Zeichensatz ergänzt.

**Beide Prüfungen ziehen in ein eigenes Modul** `src/lib/server/config/secretGuard.ts`.
Sein Import hat Seiteneffekte (DB-Modul, Middleware-Kette, Signal-Handler) und die Guards
laufen im Modul-Scope — ein Test müsste das Modul je Fall neu importieren; die Coverage erfasst
zudem nur `src/lib/**` (`vitest.config.ts`, `coverage.include`). Reine Funktionen
mit den Werten als Parameter sind testbar, `hooks.server.ts` ruft nur noch auf.

**Warum nur `production`:** Lokale Entwicklung und CI arbeiten bewusst mit dem Platzhalter
(B13). Der Guard darf sie nicht brechen.

### 4.2 Dokumentation

- `docs/ENVIRONMENT.md:96` — den konkreten Beispielwert durch
  `<Ausgabe von openssl rand -base64 32>` ersetzen. Ein Wert, der echt aussieht, wird kopiert.
- `docs/ENVIRONMENT.md` — neuer Abschnitt **Rotation**: wie man `SESSION_SECRET` wechselt und
  dass jeder Wechsel _alle_ Sessions gleichzeitig beendet. Das ist der Notausschalter aus #635,
  und er nützt nur, wenn dokumentiert ist, dass es ihn gibt.
- `docs/RELEASE_PIPELINE.md:169` — „Zwei Dinge, die getrennt sein müssen" wird zu drei:
  DB, `uploads/`, **`SESSION_SECRET`**. Wegen B15 steht die Regel damit da, bevor jemand die
  `.env` auf den Staging-Host kopiert.

### 4.3 Auswirkung

Kein laufendes Deployment mit einem echten Secret merkt etwas. Ein Deployment mit einem
öffentlich bekannten Wert startet nicht mehr — das ist der Zweck.

---

## 5. Paket D — Session-Store

### 5.1 Datenmodell

Neue Tabelle in `src/lib/server/db/schema.ts`, nach den dortigen Konventionen (`serial` als PK,
snake_case-Spaltennamen, `timestamp({ withTimezone: true })`, Indizes als
`idx_<tabelle>_<spalten>`).

| Spalte                | Typ                       | Zweck                                                                                                                                           |
| --------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | `serial` PK               | intern                                                                                                                                          |
| `token_hash`          | `varchar(64)` unique      | SHA-256 des Cookie-Werts, hex. **Der Klartext steht nie in der DB.** Ein Lesezugriff auf die Tabelle händigt damit keine lebenden Sessions aus. |
| `sub`                 | `varchar(255)`, indiziert | Auth0-Identität; ermöglicht „alle Sessions dieses Benutzers beenden"                                                                            |
| `roles`               | `text[]`                  | Snapshot des Auth0-Claims vom Login. Eigene Spalte statt in `user_claims` vergraben, damit abfragbar bleibt, welche Session privilegiert ist.   |
| `user_claims`         | `jsonb`                   | Rest der Identität (Name, E-Mail, Bild, `sid`) für `locals.user`                                                                                |
| `expires_at`          | `timestamptz`, indiziert  | **Gleitend.** Inaktivitätsfenster, wird bei jedem Request fortgeschrieben.                                                                      |
| `absolute_expires_at` | `timestamptz`             | **Nicht verlängerbar.** Beim Login aus Auth0s `exp` gesetzt.                                                                                    |
| `revoked_at`          | `timestamptz` nullable    | Logout und gezielter Widerruf                                                                                                                   |
| `created_at`          | `timestamptz`             | Nachvollziehbarkeit                                                                                                                             |
| `last_seen_at`        | `timestamptz`             | Nachvollziehbarkeit, Grundlage für „aktive Sessions"                                                                                            |

Indizes: unique auf `token_hash` (Lookup-Pfad), `idx_sessions_sub` (Widerruf pro Benutzer),
`idx_sessions_expires_at` (Aufräumen).

**Warum zwei Ablaufspalten.** Das ist die Antwort auf die offene Frage in #634 („Soll die
Session überhaupt an Auth0s `exp` hängen?"): **beides**. Die gleitende Grenze hält den
arbeitenden Admin drin, die absolute respektiert die Aussage des Identity Providers. Keine der
beiden allein leistet das. Auth0 kennt auf Tenant-Ebene ebenfalls mehrere Grenzen
(„Session Lifetime Limits", verlinkt aus [Sessions](https://auth0.com/docs/manage-users/sessions)).
Die konkreten Werte sind gegen die tatsächlichen Tenant-Einstellungen abzugleichen und nicht
frei zu wählen — siehe Abschnitt 9.

### 5.2 Cookie

32 Zufallsbytes (`crypto.randomBytes(32)`), base64url-kodiert. Kein JWT, keine Payload, nichts
zu fälschen — und nichts zu lesen (behebt B16).

Attribute bleiben wie in `setAuthCookie` heute: `httpOnly`, `sameSite: 'none'`, `secure: true`,
`path: '/'`. Die `SameSite=None`-Anforderung stammt aus der iframe-Einbettung auf
meeresmuseum.de und bleibt unberührt.

`maxAge` folgt dem Inaktivitätsfenster und wird bei jedem Fortschreiben von `expires_at`
mitgesetzt. Cookie-Lebensdauer und Zeilen-Lebensdauer dürfen nicht auseinanderlaufen — genau
diese Diskrepanz ist der Mechanismus hinter #634, nur in der anderen Richtung.

**Warum SHA-256 und kein Passwort-KDF.** Der Token ist 256 Bit Zufall, kein geratener Wert:
Es gibt kein Wörterbuch, gegen das ein Angreifer den Hash prüfen könnte, und damit nichts, was
ein absichtlich langsames Verfahren erschweren würde. bcrypt oder Argon2 wären hier pro Request
messbare Kosten ohne Gegenwert. Ungesalzenes SHA-256 ist die richtige Wahl und keine
Nachlässigkeit.

Der Cookie-**Name** bleibt (`COOKIE_NAME`, Default `auth-cookie`). Alte JWT-Werte finden nach
dem Deploy schlicht keine Zeile, werden verworfen und gelöscht. Das ist die Migration:
einmalig neu einloggen.

### 5.3 Lebenszyklus

```
Login (Callback)   → createSession()  : Zeile anlegen, expires_at = now + idle,
                                        absolute_expires_at = Auth0 exp, Cookie setzen
Jeder Request      → getSession()     : token_hash nachschlagen; gültig, wenn
                                        revoked_at IS NULL
                                        AND expires_at > now
                                        AND absolute_expires_at > now
                     touchSession()   : last_seen_at = now,
                                        expires_at = min(now + idle, absolute_expires_at)
Logout             → destroySession() : revoked_at = now, Cookie löschen
Absoluter Ablauf   → Redirect nach /api/auth/login (bestehender Weg)
```

**Erneuerung ohne Refresh-Tokens.** Auth0 nennt zwei Wege, eine abgelaufene App-Session zu
erneuern: Refresh-Token oder „a redirect to Auth0's `/authorize` endpoint (which will issue new
tokens if the Auth0 session remains valid)". Der Redirect ist still, solange die Auth0-Sitzung
lebt, und die App tut ihn **heute schon**. Damit braucht diese Spec weder den
`offline_access`-Scope noch eine verschlüsselte Refresh-Token-Spalte.

**`touchSession` darf nicht bei jedem Request schreiben.** Heute kostet die gleitende
Verlängerung einen Cookie-Header; ein `UPDATE` pro Request wäre etwas anderes — `handle` läuft
für jeden Request, auch für Assets. Deshalb: `touchSession` schreibt nur, wenn `last_seen_at`
älter als ein Schwellwert ist (Vorschlag: 60 Sekunden). Dazwischen wird die Zeile nur gelesen.
Der Effekt auf die Sitzungsdauer ist vernachlässigbar (bis zu einer Minute Unschärfe im
Inaktivitätsfenster), der Effekt auf die Schreiblast erheblich.

**Aufräumen ohne Cron.** Beim Anlegen einer Session werden abgelaufene **und widerrufene**
Zeilen desselben `sub` in derselben Anweisung gelöscht. Ein Timer wäre eine zusätzliche
bewegliche Komponente für ein Problem, das ein `DELETE` löst.

**Aufbewahrung (DSGVO).** `user_claims` enthält Name und E-Mail, also personenbezogene Daten.
Sie werden nicht archiviert: Eine widerrufene oder abgelaufene Zeile wird beim nächsten Login
desselben `sub` gelöscht, nicht nur markiert. `revoked_at` ist ein Übergangszustand für die
Dauer zwischen Logout und nächster Anmeldung, kein Aufbewahrungsmechanismus. Für den Fall, dass
ein Benutzer sich nie wieder anmeldet, deckt das nichts ab — dafür genügt ein `DELETE` auf
abgelaufene Zeilen im bestehenden Wartungsendpunkt `/api/admin/cleanup-orphans`.

### 5.4 Betroffene Dateien

| Datei                                                                                                                                                                                                              | Änderung                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/server/db/schema.ts`                                                                                                                                                                                      | Tabelle `sessions` + `SessionSelect`/`SessionInsert`-Typen                                                                                                         |
| `drizzle/`                                                                                                                                                                                                         | Migration via `npm run db:generate`, committen (Projektpflicht)                                                                                                    |
| `src/lib/server/auth/sessionRepository.ts`                                                                                                                                                                         | **neu** — `createSession`, `getSession`, `touchSession`, `destroySession`, `revokeAllForSub` sowie `resolveSessionUser(cookies)`; einziger Ort mit SQL             |
| `src/lib/server/auth/sessionToken.ts`                                                                                                                                                                              | **neu** — Token erzeugen und hashen; klein und rein, damit „Klartext landet nie in der DB" testbar ist                                                             |
| `src/lib/server/auth/auth.ts`                                                                                                                                                                                      | `setAuthCookie` → `createSession`; `clearAuthCookie` → `destroySession`; `getAuthUser` **entfällt** (B6); JWKS-Teil (`verifyToken`, PKCE, CSRF) bleibt unverändert |
| `src/hooks.server.ts`                                                                                                                                                                                              | Verifikationsblock (74–90) wird Session-Lookup; `SESSION_SECRET`-Guard und -Konstante entfallen                                                                    |
| `src/routes/api/auth/logout/+server.ts`                                                                                                                                                                            | `destroySession` statt `clearAuthCookie` — damit wirkt Logout (behebt B7)                                                                                          |
| `src/routes/api/auth/callback/+server.ts`                                                                                                                                                                          | `createSession` statt `setAuthCookie`. **Rollenlogik unverändert.**                                                                                                |
| `src/lib/types/User.ts`                                                                                                                                                                                            | `iss`, `aud`, `iat`, `exp` werden optional — sie stammten aus unserem eigenen Token und kommen jetzt nicht mehr mit                                                |
| `src/routes/+layout.server.ts`                                                                                                                                                                                     | liefert die Restlaufzeit (`expires_at`) in `data` aus, als Grundlage für #634                                                                                      |
| `e2e/helpers/adminSession.ts`                                                                                                                                                                                      | schreibt eine `sessions`-Zeile statt ein JWT zu signieren                                                                                                          |
| `e2e/design-tokens.spec.ts:482`                                                                                                                                                                                    | Fehlermeldung anpassen (nennt heute `SESSION_SECRET`)                                                                                                              |
| `.env.example`, `docker-compose.production.yml`, `run-release.sh`, `scripts/docker-entrypoint.sh`, `.github/workflows/ci.yml`, `docs/ENVIRONMENT.md`, `docs/DOCKER_DEPLOYMENT.md`, `docs/PRODUCTION_DEPLOYMENT.md` | `SESSION_SECRET` entfernen                                                                                                                                         |

**Zusätzlich betroffen, beim ersten Entwurf übersehen:**

- `src/lib/server/audit/auditService.ts` — neue Events `auth.logout` und `auth.session_revoked`.
  `.claude/rules/security.md` führt eine verbindliche Tabelle der Audit-Events; sie ist
  mitzupflegen. `auth.login_success` existiert bereits und bleibt.
- `static/openapi.yml:1248` — `/api/auth/logout` ist dokumentiert und ändert sein Verhalten
  (wirkt jetzt wirklich). Ebenso zu prüfen: `securitySchemes` ab Zeile 2058, falls dort das
  Session-Cookie als JWT beschrieben ist. CLAUDE.md verlangt die Aktualisierung der OpenAPI-Spec
  nach API-Änderungen.
- `e2e/helpers/adminSession.ts` braucht einen **eigenen** `postgres`-Client (`postgres@^3.4.9`,
  bereits Abhängigkeit). Ein Import aus `$lib/server/...` funktioniert dort nicht: Playwright
  läuft als gewöhnliches Node-Programm ohne SvelteKit-Bundler, also ohne `$lib`-Alias und ohne
  `$env/dynamic/private`. Präzedenz für genau diesen Weg steht in
  `.github/workflows/ci.yml` — der PostGIS-Check nutzt bewusst das `postgres`-Paket statt `psql`.
  Die Verbindungsdaten kommen aus `DATABASE_POSTGRES_URL` in `.env`, das die Fixture über
  `dotenv` bereits lädt.

**Unverändert bleiben** `requireUserRole`, `isUserInRole`, `isAdminUser`, `isSuperAdminUser`
und `src/lib/server/config/accessControl.ts`. Sie lesen `locals.user.roles`, und dort steht
weiterhin, was Auth0 beim Login gesagt hat. **Rollenverwaltung bleibt vollständig in Auth0.**

`getAuthUser` wird gelöscht statt umgebaut, weil es genau das anbietet, was hier gefährlich
ist: einen zweiten Weg von Cookie zu Benutzer. Ein künftiger Aufruf wäre eine stille Lücke.
Die vier zugehörigen Tests in `auth.test.ts` entfallen mit.

### 5.5 Fehlerverhalten

| Fall                             | Verhalten                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cookie vorhanden, keine Zeile    | Cookie löschen, kein `locals.user`, `security.auth_error` loggen. Deckt sowohl Alt-JWTs nach dem Deploy als auch Fälschungsversuche ab.                                 |
| Zeile abgelaufen oder widerrufen | wie oben, plus Löschen der Zeile                                                                                                                                        |
| DB nicht erreichbar              | Kein neues Ausfallszenario: `databaseCheck` läuft als **erstes** in der `sequence()` und liefert bereits 503, wenn die DB fehlt. Ohne DB ist die App schon heute unten. |
| Schreibfehler bei `touchSession` | Geloggt, nicht geworfen. Ein fehlgeschlagenes Fortschreiben darf keinen Request abbrechen; die Session läuft dann eben früher ab.                                       |
| `createSession` schlägt fehl     | Der Login schlägt fehl (500). Kein stiller Fallback auf eine Session ohne Zeile.                                                                                        |

### 5.6 Sicherheitsgewinn — was sich tatsächlich ändert

- **Fälschung ist ausgeschlossen**, nicht erschwert: Ein gefälschtes Cookie hat keine Zeile.
  `SESSION_SECRET` verschwindet als Vertrauensgrundlage — die Ursache wird gelöscht, nicht
  abgemildert.
- **Logout wirkt** (behebt B7).
- **Widerruf existiert:** „alle Sessions beenden" wird eine `UPDATE`-Anweisung statt eines
  Secret-Wechsels mit Kollateralschaden.
- **Das Cookie trägt keine Identitätsdaten mehr** (behebt B16).
- **Nicht gelöst:** Wer Schreibzugriff auf die Datenbank hat, kann sich eine Session-Zeile
  anlegen. Das ist die bewusste Grenze — wer die DB schreiben kann, braucht keine Admin-Session
  mehr, um Schaden anzurichten.
- **Sitzungen werden nicht kürzer.** Die effektive Lebensdauer ist schon heute Auth0s `exp` —
  genau das ist der Mechanismus hinter #634. `absolute_expires_at` übernimmt dieselbe Grenze,
  nur sichtbar und mit Vorwarnung statt still. D verschärft nichts, es macht das Bestehende
  erklärbar.
- **CSRF-neutral.** `SameSite=None` bleibt (iframe-Einbettung meeresmuseum.de), der Schutz ruht
  weiter auf SvelteKits Origin-Prüfung. Der CSRF-Bypass für `/rest_sichtungen` in
  `hooks.server.ts:53–60` bleibt unberührt — die Legacy-Endpunkte nutzen kein Session-Cookie.
- **Nicht gelöst:** Eine Abmeldung bei Auth0 beendet unsere Session nicht; sie läuft bis zum
  Ablauf weiter. Das ist heute genauso, wird durch die Tabelle aber erstmals adressierbar — der
  `sid`-Claim liegt in `user_claims` und wäre der Anknüpfungspunkt für Auth0s Back-Channel-Logout.
  Bewusst nicht in dieser Spec.
- **Nicht gelöst:** Rollenentzug in Auth0 wirkt erst bei der nächsten Anmeldung. Die
  Session-Zeile trägt einen Snapshot. Gegenmittel im Bedarfsfall: gezielter Widerruf, oder
  später die verworfene Management-API-Auffrischung.

---

### 5.7 Abgleich mit dem OWASP Session Management Cheat Sheet

Auth0 und SvelteKit begründen die _Wahl_ des Ansatzes. Der Maßstab für seine _Ausführung_ ist
OWASP. Die sechs Kernanforderungen und wo diese Spec sie erfüllt:

| OWASP-Anforderung                                           | Umsetzung                                                                                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Session-ID mit mindestens 128 Bit Länge und 64 Bit Entropie | 256 Bit aus `crypto.randomBytes` (§5.2)                                                                           |
| Session-ID ohne Bedeutung, kein Träger von Daten            | opakes Token, alle Daten in der Zeile (§5.2)                                                                      |
| Serverseitig nicht im Klartext gespeichert                  | SHA-256 in `token_hash` (§5.1, §5.2)                                                                              |
| Neuvergabe bei Anmeldung (Session Fixation)                 | jeder Login legt eine neue Zeile mit neuem Token an; ein vom Client mitgebrachter Wert wird nie übernommen (§5.3) |
| Idle- **und** Absolut-Timeout                               | `expires_at` und `absolute_expires_at` (§5.1)                                                                     |
| Invalidierung bei Logout, serverseitig                      | `destroySession` setzt `revoked_at` (§5.3, behebt B7)                                                             |

Cookie-Attribute (`httpOnly`, `Secure`, `Path`) entsprechen der Empfehlung; `SameSite=None` ist
eine begründete Abweichung aus der iframe-Einbettung und war schon vorher so.

## 6. Verhältnis zu #634

Diese Spec deckt den **Server-Teil** von #634 ab:

- Echtes, eigenes Ablaufdatum statt geerbtem Auth0-`exp` → `expires_at`
- Gleitende Verlängerung, die auch den Ablauf mitzieht → `touchSession`
- Ablesbare Restlaufzeit → `+layout.server.ts` liefert `expires_at` in `data`

**Nicht Teil dieser Spec:** die UI-Ankündigung vor dem Ablauf und der Umgang mit ungespeicherten
Eingaben. #634 hängt sie an `StatusBlock`/`SubmitStatus` aus PRs #625/#626, die noch nicht in
`main` sind. Diese Spec bereitet sie vor, indem die Restlaufzeit überhaupt verfügbar wird; die
Umsetzung bleibt in #634.

---

## 7. Testplan

Test-First ist Projektpflicht (`.claude/rules/testing.md`). Reihenfolge: RED → GREEN →
REFACTOR, jeder Baustein zuerst als fehlschlagender Test.

### 7.1 Unit (`src/**/*.test.ts`, Node-Umgebung)

`sessionToken.test.ts`

- Zwei Aufrufe erzeugen verschiedene Token
- Token ist base64url und mindestens 32 Byte Entropie
- Derselbe Token-Wert ergibt denselben Hash; der Hash ist nicht der Token

`sessionRepository.test.ts` (Drizzle gemockt nach dem Muster aus `testing-patterns.md`)

- `createSession` legt an, speichert **nie** den Klartext-Token
- `getSession` findet über den Hash
- `getSession` liefert `null` bei `revoked_at != null`
- `getSession` liefert `null` bei `expires_at < now`
- `getSession` liefert `null` bei `absolute_expires_at < now`, auch wenn `expires_at` noch läuft
- `touchSession` schreibt `expires_at` fort, aber **nie über** `absolute_expires_at` hinaus
- `destroySession` setzt `revoked_at`
- `createSession` löscht abgelaufene Zeilen desselben `sub`

### 7.2 Regression zu #635 — der eigentliche Beweis

Damit das ohne den Modul-Scope von `hooks.server.ts` (Startup-Guards, `sequence()`) testbar
ist, wandert die Ableitung Cookie → Benutzer in eine eigene, aufrufbare Funktion
`resolveSessionUser(cookies)` in `sessionRepository.ts`. `hooks.server.ts` ruft nur noch sie
auf. Die Tests laufen gegen diese Funktion (`sessionRepository.test.ts`):

- **Ein selbst signiertes HS256-JWT im Cookie ergibt keinen Benutzer und kein `locals.isAdmin`.**
  Dieser Test ist die Umkehrung von `e2e/helpers/adminSession.ts` in seiner heutigen Form und
  muss vor der Umstellung **fehlschlagen**, danach bestehen.
- Ein zufälliges, unbekanntes Cookie ergibt keinen Benutzer und wird gelöscht
- Ein gültiges Cookie ergibt `locals.user` mit den Rollen aus der Zeile
- `locals.isAdmin` folgt weiterhin `roles.includes('admin')`

### 7.3 Regression zu #634

- Eine Session mit abgelaufenem `expires_at`, aber gültigem `absolute_expires_at` gilt als
  abgelaufen (kein „Cookie lebt, Token tot" mehr)
- `touchSession` verlängert nicht über `absolute_expires_at` hinaus

### 7.3a Schreiblast und Cookie-Kopplung

- `touchSession` schreibt **nicht**, wenn `last_seen_at` jünger als der Schwellwert ist
- `touchSession` schreibt, sobald der Schwellwert überschritten ist
- Ein `createSession` setzt `maxAge` passend zum Inaktivitätsfenster; ein Fortschreiben von
  `expires_at` setzt das Cookie mit

### 7.4 Regression zu B7

- Nach `destroySession` ist dasselbe Cookie ungültig — auch wenn der Client es behält

### 7.5 E2E

- `e2e/design-tokens.spec.ts` läuft unverändert grün mit der umgebauten Fixture. Der E2E-Job
  hat einen PostGIS-Service und führt Migrationen aus (`.github/workflows/ci.yml`), das
  Schreiben einer Session-Zeile ist dort also möglich.
- Der Fixture-Kopfkommentar wird neu geschrieben: Sie schreibt jetzt in die Datenbank statt ein
  Token zu signieren — und kann damit in Produktion nichts mehr ausrichten. Genau diese
  Eigenschaft war der Anlass für #635.

### 7.6 Vor jedem Commit

`npm run test:quick` (lint + type-check + svelte-check + unit).

---

## 8. Auslieferung

**PR 1 — Paket A.** Guard + Doku. Keine Migration, kein Verhaltenswechsel. Sofort mergefähig.

**PR 2 — Paket D.** Schema + Migration + Repository + Hooks + Callback + Logout + Fixture +
Entfernen von `SESSION_SECRET`. Ein PR, weil Schema und Auth-Pfad nicht sinnvoll trennbar sind.

Betriebliche Schritte bei PR 2:

1. Migration läuft beim Container-Start automatisch (`docker-migrate.ts`)
2. Alle bestehenden Sessions werden ungültig — alle Angemeldeten müssen sich einmal neu
   anmelden. Bei der Größenordnung dieser Anwendung unkritisch, aber ankündigen.
3. `SESSION_SECRET` kann nach dem Deploy aus den `.env`-Dateien beider Hosts entfernt werden.
4. Rollback: Der Weg zurück ist ein Code-Rollback plus die Erkenntnis, dass die
   `sessions`-Tabelle stehen bleibt (additive Migration, nicht destruktiv).

---

## 9. Offene Punkte

| Punkt                                                          | Wer entscheidet                                 | Wann                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Herkunft und Leserechte von `SESSION_SECRET` auf dem Prod-Host | Jan, am Host                                    | vor PR 1 — bestimmt, ob PR 1 dringend oder nur richtig ist                   |
| Konkrete Werte für Inaktivitätsfenster und absolute Laufzeit   | abzugleichen mit den Auth0-Tenant-Einstellungen | vor PR 2                                                                     |
| Ob Rollenentzug in Auth0 sofort wirken muss                    | Jan                                             | nach PR 2 — entscheidet, ob die Management-API-Auffrischung nachgezogen wird |

---

## 10. Quellen

- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [SvelteKit — Auth](https://svelte.dev/docs/kit/auth)
- [Auth0 — Best Practices for Application Session Management](https://auth0.com/blog/application-session-management-best-practices/)
- [Auth0 — Sessions](https://auth0.com/docs/manage-users/sessions)
- [auth0/nextjs-auth0](https://github.com/auth0/nextjs-auth0) — Stateless-Default, JWE, BYODB
- [Auth0 Community — kein offizieller SvelteKit-SDK](https://community.auth0.com/t/provide-example-sdk-for-server-side-authentication-with-auth0-for-sveltekit/105041)
- [`@auth/sveltekit`](https://authjs.dev/reference/sveltekit)
