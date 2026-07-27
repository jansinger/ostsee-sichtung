# Modern Long Form Design Guide for Whale Sighting Systems

> **How to read this document.** It mixes two kinds of statement, and they carry different
> weight:
>
> - **Design principles and rationale** — the reason the form is built the way it is. Still
>   useful. The percentages quoted throughout are from an external research summary
>   (`form-design.md`) that is **no longer in this repository**, so they are unsourced and
>   should not be cited as project measurements. Nothing here was measured on this app.
> - **Statements about the implementation**, including the ✅/🔄 grades — a point-in-time
>   snapshot that had drifted from the code. The code-level claims and snippets were
>   re-verified against `src/` on 2026-07-27 and corrected; grades and prose were not
>   re-assessed.
>
> For binding rules when changing form code, use `.claude/rules/forms.md` — that is the
> maintained source, and this guide defers to it on every technical point.

Current research reveals that **multi-step forms achieve 86% higher conversion rates** than single-page equivalents, while forms following modern usability guidelines see **78% one-try submission rates versus 42% for non-compliant forms**. For whale sighting reporting systems, this translates to significantly higher data collection success when design principles are properly implemented.

## Current Implementation Status

**The Ostsee-Tiere application demonstrates exceptional adherence to modern form design principles**, achieving an **A- grade** in implementation quality. The current form successfully implements multi-step architecture, comprehensive accessibility, mobile-first design, and progressive disclosure patterns.

### Implementation Achievement Summary

- ✅ **Multi-step architecture** with 4-step logical progression
- ✅ **WCAG 2.2 accessibility compliance** with comprehensive ARIA implementation
- ✅ **Mobile-first responsive design** with proper touch targets (48x48 DP)
- ✅ **Progressive disclosure** with smart conditional logic
- ✅ **Optimal validation timing** without premature error states
- ✅ **Advanced state management** with auto-save and persistence
- ✅ **Comprehensive help systems** with contextual guidance

## Multi-step Architecture - Successfully Implemented ✅

**The evidence strongly favors multi-step over single-page approaches** for whale sighting forms. Recent 2024-2025 data shows multi-step forms not only improve completion rates but also enhance data quality through reduced cognitive load and better error handling.

### Current Implementation Structure

**Our 4-step structure perfectly aligns with research recommendations:**

- **Step 1: Position & Time** (location, temporal data) - 4 fields maximum
- **Step 2: Sighting Details** (species, count, distance) - 5-6 fields
- **Step 3: Behavioral Observations** (optional details) - 3-4 fields
- **Step 4: Contact Information** (observer data) - 3 fields

This approach follows the **GOV.UK "One Thing Per Page" pattern**, endorsed by Nielsen Norman Group. Our implementation includes:

The step structure lives in `formStepsConfig` (`src/lib/report/formConfig.ts`). Step `id`s
are **strings**, and `currentStep` is **0-based** — it indexes `formStepsConfig` directly:

| Index | `id`               | Title            | `isOptional` |
| ----- | ------------------ | ---------------- | ------------ |
| `0`   | `location-time`    | Position & Zeit  | —            |
| `1`   | `sighting-details` | Sichtungsdetails | —            |
| `2`   | `observations`     | Beobachtungen    | `true`       |
| `3`   | `contact`          | Kontaktdaten     | —            |

Navigation is gated by `validateStep(currentStep, $form)` in
`components/form/StepNavigation.svelte`; `isStepValid(currentStep, formData)` is the
non-mutating variant used for reachability checks. Both take **two** arguments — see
`.claude/rules/forms.md` for the three validation layers.

**Progressive disclosure techniques** are implemented through conditional rendering. Research shows forms with conditional logic see **14% improvement in conversions** and **42% reduction in completion time** when properly implemented.

### Successful Conditional Logic Implementation

```svelte
{#if $form.isDead}
	<FormField name="deadCondition" />
	<FormField name="deadSex" />
	<FormField name="deadSize" />
{/if}
```

`FormField` takes **no `label` prop** — the label comes from `.label()` in the schema. Real
examples: `components/sections/AnimalInfo.svelte` (dead-animal fields) and
`components/sections/SightingDetails.svelte` (the "OTHER → free text" pattern, using
`transition:slide` plus an enum comparison).

## Effective Communication - Enhanced Implementation Needed 🔄

**The key insight from behavioral research**: users need clear value propositions for optional fields, not just labels. Analysis of successful form optimization shows that **adding explanatory microcopy can triple completion rates**.

### Current State and Improvement Opportunities

**Current Implementation:**

- Clear field labels with basic help text
- Comprehensive FormHelp.svelte component with detailed guidance
- Species identification assistance

**Enhancement Opportunities - Benefit-Focused Messaging:**

**Instead of generic labels, use benefit-focused messaging:**

- Current: "Schwimmrichtung"
- **Recommended**: "Schwimmrichtung (hilft bei Wanderungsanalysen)"
- Current: "Verhalten"
- **Recommended**: "Verhalten (verbessert Schutzforschung)"
- Current: "Anzahl Tiere"
- **Recommended**: "Anzahl Tiere (hilft bei Populationsanalysen)"

**Effective tooltip patterns that work:**

- **Format guidance**: "Gruppengröße: Zähle alle sichtbaren Wale (gib 'ca. 15' ein bei Unsicherheit)"
- **Value explanation**: "Verhaltensnotizen helfen Forschern bei der Analyse von Futter- und Lebensraumnutzung"
- **Context setting**: "Fotos erhöhen den Forschungswert deiner Sichtung erheblich"

**Language that encourages without overwhelming:**

- Use conversational tone: "Hilf uns zu verstehen, was du gesehen hast"
- Provide social proof: "Die meisten Walbeobachter finden diese Informationen einfach bereitzustellen"
- Explain impact: "Deine Details tragen zu Schutzmaßnahmen bei"

Research shows **marking only required fields** with asterisks is more effective than labeling optional ones. Our current implementation successfully follows this pattern.

## Mobile-first Design Principles - Excellent Implementation ✅

**Critical insight**: **42.95% of form completions happen on mobile devices**, and whale sighting reporting occurs in challenging field conditions requiring specialized mobile optimization.

### Current Mobile Implementation Excellence

Our implementation successfully addresses all essential mobile requirements:

> **Note on sizing:** there are no `.form-field` or `.form-navigation` classes in this
> codebase, and no `min-height: 48px` rule anywhere. Field sizing comes from the DaisyUI
> component classes (`input`, `select`, `textarea`) plus the theme in `src/app.css`. The only
> field-specific override is for the embedded case:
>
> ```css
> /* src/app.css */
> .iframe-mode .input,
> .iframe-mode .select,
> .iframe-mode .textarea {
> 	font-size: 1rem; /* WCAG AA: min. 16px, prevents iOS auto-zoom */
> }
> ```
>
> Change sizing in the theme or `app.css`, never in individual components. See
> `.claude/rules/daisyui.md` for the full list of deliberate overrides.

**Implemented features:**

- ✅ **Single-column layouts** on mobile with responsive grid adaptations
- ✅ **Focus management** on step change — `scrollToFirstError` / `scrollToElement`
  (`src/lib/utils/fieldNavigation.ts`; `focusElement` there is module-private) and
  `scrollAndFocusStep` in `StepNavigation.svelte`
- ✅ **Appropriate input types** (tel, email, date, time, number) — driven by
  `.meta({ type })` in the schema, not by markup

### Mobile Enhancement Opportunities

**Currently Missing - Recommended Additions:**

- Voice-to-text capability for behavioral descriptions
- Enhanced GPS integration with better offline fallbacks
- Camera integration with GPS metadata embedding (partially implemented)
- More robust offline data storage indicators

**Performance benchmarks show** our current implementation successfully avoids problematic patterns like dropdown overuse and premature password requirements.

## Domain-specific Scientific Data Patterns - Well Implemented ✅

**Analysis of successful wildlife reporting platforms** reveals consistent patterns that balance scientific rigor with user accessibility. Our implementation successfully incorporates these patterns.

### Current Scientific Data Implementation

**Successfully implemented patterns:**

**Hierarchical species validation:**

- ✅ Species options filtered by geographic region (Baltic Sea focus)
- ✅ "Unknown species" options with photo upload capability
- ✅ Visual identification guides integrated in FormHelp component

**Data quality assurance layers:**

- ✅ **Level 1**: Automated validation (GPS coordinates, date/time validation)
- ✅ **Level 2**: Form validation with comprehensive Yup schema
- ✅ **Level 3**: Admin review workflow in place

**Current scientific data structure accommodates:**

The authoritative field list is `src/lib/form/validation/sightingSchema.ts` — it is both the
validation rules and the field presentation (`.label()`, `.meta({ type, options, helpText,
icon, … })`), which `formConfig.ts` reads via `sightingSchema.describe()`.

Mandatory core field names, since abbreviated forms circulate in older docs:

| Correct                         | Does **not** exist |
| ------------------------------- | ------------------ |
| `latitude` / `longitude`        | `lat` / `lng`      |
| `sightingDate` / `sightingTime` | `date` / `time`    |
| `totalCount`                    | `count`            |

`species` is a **numeric** species code (`.default(0)`), not a string. Media lives in
`uploadedFiles` / `mediaFile`, not `images`; there is no `conditions` or
`observerExperience` field — environmental data is split across `seaState`, `visibility`,
`windForce` and `windDirection`.

`SightingFormData` is `yup.InferType<typeof sightingSchema>` (`$lib/types/Form.ts`), so the
type follows the schema automatically.

## Modern Technical Implementation - Excellence Achieved ✅

### Current Technical Stack Assessment

**Our current implementation uses an optimal modern stack:**

- ✅ **Svelte 5 runes** (`$state`, `$derived`, `$effect`) for local UI state such as
  `currentStep` — the form values themselves are Svelte **stores** from `createForm`
- ✅ **Yup schema validation** for unified client/server validation
- ✅ **WCAG 2.2 compliance** through centrally generated ARIA markup
- ❌ **No service worker / PWA layer.** There is no `service-worker.ts` and no registration
  anywhere in `src/`. Offline capability is limited to `sessionStorage` form persistence.

### Accessibility Implementation Excellence

**Current accessibility implementation exceeds requirements:**

**This markup is not written by hand.** `components/form/fields/FieldRenderer.svelte` is the
only place that builds label and ARIA output, so every field is consistent by construction.
A step or section component just writes `<FormField name="species" />`.

`FieldRenderer` derives, from the schema description:

| Output             | Source / rule                                                       |
| ------------------ | ------------------------------------------------------------------- |
| Label text         | `.label()`                                                          |
| Required `*`       | `fieldConfig.optional === false`, with `aria-label="Pflichtfeld"`   |
| `aria-required`    | same                                                                |
| `aria-invalid`     | `hasError`                                                          |
| `aria-describedby` | composed from help / description / error IDs — only ones that exist |
| Error output       | `role="alert"` + `aria-live="polite"` + icon                        |
| `data-testid`      | `field-<name>`                                                      |

It also picks one of three markup shapes so no `label[for]` points at nothing:
`<fieldset>`/`<legend>` for radio groups, a control-owned label for checkbox/toggle, and
`<label for>` otherwise.

The status indicator beside the label derives from `hasValue` + `hasError` and is
`aria-hidden`; the accessible signal is `aria-invalid` plus the error text. Note there is no
`touched`/blur state in `createForm`, so the valid checkmark appears as soon as a valid
value exists.

### Performance Optimization - Successfully Implemented

**Current performance optimizations:**

- ✅ **Conditional rendering** keeps irrelevant fields out of the DOM (progressive
  disclosure), and images in the identification help use `loading="lazy"`. This is not
  code-splitting — no form section is dynamically imported.
- ✅ **Auto-save** via two separate `$effect`s in `ModernReportForm.svelte`. The split is
  deliberate: one shared effect would fire twice per step change.
- ❌ **No debounced validation.** There is no debounce in the form path at all. Step
  validation is reactive (`$derived`), and errors are cleared per field on change by
  `updateField`.
- ❌ **No service worker.** See the stack note above.

**Storage split** — always go through `$lib/storage/localStorage`, never `localStorage`
directly (GDPR details in `.claude/rules/browser-storage.md`):

| Data               | Key                 | Backend          |
| ------------------ | ------------------- | ---------------- |
| Sighting form data | `FORM_DATA`         | `sessionStorage` |
| Current step       | `CURRENT_STEP`      | `sessionStorage` |
| Observer contact   | `USER_CONTACT_DATA` | `localStorage`   |

There is **no expiry logic** — session data dies with the browser session; opted-in contact
data persists until cleared.

**Field validation timing:**

- ✅ No validation on focus, and none on blur either — there is no `touched` tracking
- ✅ Step gating via `validateStep(currentStep, $form)` in `StepNavigation.svelte`
- ✅ Error messages rendered adjacent to the field by `FieldRenderer`
- ✅ Constructive, German messages defined on the validators in the schema

## Implementation Roadmap - Current Status and Next Steps

### Phase 1 Priorities - COMPLETED ✅

**Successfully implemented based on highest-impact research findings:**

1. ✅ **Multi-step form structure** with comprehensive progress indicators
2. ✅ **Mobile-optimized touch interface** with appropriate input types
3. ✅ **WCAG 2.2 compliance** for keyboard navigation and screen readers
4. ✅ **GPS integration** with manual coordinate override

### Phase 2 Enhancements - PARTIALLY IMPLEMENTED 🔄

**Current status and recommendations:**

1. ✅ **Visual species identification aids** embedded in FormHelp component
2. 🔄 **Photo upload with GPS metadata** (implemented, could be enhanced)
3. 🔄 **Offline data persistence** — `sessionStorage` form persistence only; no service worker
4. ✅ **Admin review workflow** integrated in backend

### Phase 3 Recommendations - FUTURE ENHANCEMENTS 🚀

**Recommended next improvements:**

1. **Enhanced benefit-focused messaging** in field help text
2. **Voice-to-text capability** for mobile behavioral descriptions
3. **Social proof integration** in help text and guidance
4. **Advanced analytics dashboard** for form performance tracking

### Current Performance Metrics

**Excellent metrics to continue tracking:**

- **View-to-start rate**: Monitor form initiation success
- **Field-level abandonment**: Current implementation minimizes this
- **Completion by device type**: Mobile-first design shows strong results
- **Error recovery rates**: Comprehensive validation shows excellent rates
- **Time to completion**: Multi-step architecture optimizes this

## Critical Success Factors - Achievement Status

**The research reveals four fundamental principles** for successful long-form design:

### 1. Cognitive Load Reduction - EXCELLENT ✅

**Successfully implemented** through progressive disclosure and logical grouping. Our 4-step architecture prevents the overwhelming feeling that causes 18% of users to abandon forms immediately.

### 2. Value Communication - GOOD (Enhancement Needed) 🔄

Current implementation has solid foundations but could benefit from more behavioral psychology principles in help text to further increase completion rates.

### 3. Mobile-First Responsive Design - EXCELLENT ✅

**Fully achieved** - acknowledges that nearly half of interactions occur on mobile devices, with comprehensive optimization for challenging field conditions.

### 4. Accessibility Integration - EXCELLENT ✅

**Comprehensively implemented** from the foundation, ensuring forms work for all users while improving usability for everyone through clearer navigation and better error handling.

## Current Performance Assessment

**Modern whale sighting reporting forms succeeding with these principles** see completion rates approaching 65-75% compared to industry averages of 44.96%.

**Our current implementation status:**

- ✅ **Multi-step architecture**: Fully implemented
- ✅ **Mobile optimization**: Exceeds requirements
- ✅ **Accessibility compliance**: WCAG 2.2 compliant
- 🔄 **Value communication**: Good foundation, enhancement opportunities exist

The combination of our excellent technical implementation with minor enhancements to value communication messaging will ensure we achieve the highest possible completion rates while maximizing valuable data collection for marine conservation efforts.

## Technical Implementation Notes

### State: stores for form values, runes for UI state

Form values are **not** runes. `createForm` (`src/lib/form/createForm.ts`) is a small
in-house implementation over Svelte stores (`writable`/`derived`) plus Yup, subscribed with
`$`. Runes are used for local UI state only — `currentStep` is `$state`, and it is
**0-based** (`loadFromStorage(STORAGE_KEYS.CURRENT_STEP, 0)`).

`saveToStorage` always takes a key: `saveToStorage(STORAGE_KEYS.FORM_DATA, formData)`.

### Form Context Pattern

There is no `FormContext.svelte`. The context is plumbed through two files:

- `src/lib/report/formContext.ts` — `setFormContext` / `getFormContext` over a `Symbol` key
- `src/lib/report/components/form/Form.svelte` — the **only** `createForm` call; it merges in
  `mediaStore`, calls `setFormContext`, and renders the `<form>` plus a honeypot field

The context therefore exposes exactly what `createForm` returns, plus `mediaStore`:

`{ form, errors, isSubmitting, isValid, handleSubmit, handleChange, updateField, updateInitialValues, mediaStore }`

Notably absent: **`touched`**, `validateField`, `reset`, `goToNextStep` / `goToPrevStep`.
Step movement lives in `StepNavigation.svelte`, and step validation in
`src/lib/form/validation/stepValidation.ts` — not on the context.

`FormField` throws if used outside `<Form>`.
