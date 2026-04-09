---
paths:
  - 'src/lib/storage/**'
---

# Browser Storage (GDPR)

Regeln für DSGVO-konforme Browser-Speicherung.

---

## Storage Keys

```typescript
STORAGE_KEYS = {
	CURRENT_STEP: 'sichtungen_current_step', // sessionStorage
	FORM_DATA: 'sichtungen_form_data', // sessionStorage
	USER_CONTACT_DATA: 'sichtungen_user_contact_data' // localStorage ODER sessionStorage
};
```

---

## GDPR-Consent Pattern

```
persistentDataConsent = true  → localStorage (überlebt Browser-Neustart)
persistentDataConsent = false → sessionStorage (gelöscht bei Tab-Schließung)
```

---

## Schlüsselfunktionen (`src/lib/storage/localStorage.ts`)

| Funktion                               | Zweck                                      |
| -------------------------------------- | ------------------------------------------ |
| `loadFromStorage(key, default)`        | Type-safe JSON Deserialisierung            |
| `saveToStorage(key, value)`            | Automatische Storage-Typ-Wahl              |
| `loadUserContactData()`                | sessionStorage → localStorage Fallback     |
| `saveUserContactDataWithConsent(data)` | GDPR: Consent steuert Storage-Typ          |
| `clearFormDataOnly()`                  | Nur Formulardaten löschen                  |
| `clearAllStorage()`                    | Komplette GDPR-Löschung inkl. Kontaktdaten |

---

## Best Practices

- Formulardaten IMMER in sessionStorage (temporär)
- Kontaktdaten NUR mit explizitem Consent in localStorage
- `clearAllStorage()` für DSGVO-Löschanfragen verwenden
- Verwendet in `Step4Contact.svelte` für gespeicherte Kontaktdaten
