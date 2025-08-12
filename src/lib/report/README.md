# Modern Whale Sighting Report Form

This is an alternative implementation of the whale sighting reporting form following modern UX best practices from `form-design.md`.

## Key Features

### 🎯 Research-Based Design
- **Multi-step architecture**: 86% higher conversion rates than single-page forms
- **Progressive disclosure**: Reduces cognitive load and completion time by 42%
- **Mobile-first design**: Optimized for 48×48 DP touch targets and field conditions
- **GOV.UK "One Thing Per Page" pattern**: Maximum 4 primary fields per step

### 📱 Mobile-Optimized Experience
- Single-column layouts with proper spacing
- Auto-focus and appropriate input types
- Offline data persistence with auto-save
- Touch-friendly interface elements
- Performance optimized for marine conditions

### 🔧 Combined Select/Text Inputs
When "OTHER" (Sonstiges) is selected in dropdowns, the form reveals intelligent text inputs with:
- **Datalist suggestions**: Common alternatives pre-populated
- **Smooth animations**: 200ms slide-in transitions
- **Smart validation**: Required only when "OTHER" selected
- **Accessibility**: Proper ARIA labeling and focus management

### ✅ Advanced Validation
- **Real-time validation**: Debounced (500-1000ms) to avoid premature errors
- **Step-by-step validation**: Users can't proceed with invalid data
- **Constructive error messages**: Clear guidance on how to fix issues
- **Conditional field logic**: Dynamic requirements based on user input

## Architecture

### Components Structure
```
src/lib/report/
├── components/
│   ├── FormField.svelte          # Universal form field component
│   ├── CombinedField.svelte      # Select + text for "OTHER" options
│   ├── StepProgress.svelte       # Progress indicator with navigation
│   ├── StepNavigation.svelte     # Previous/Next buttons
│   ├── ModernReportForm.svelte   # Main form container
│   └── steps/
│       ├── Step1Essential.svelte      # Location, time, species, count
│       ├── Step2Observations.svelte   # Behavior, environment, media
│       └── Step3Contact.svelte        # Personal info, boat details
├── types.ts              # TypeScript interfaces
├── formConfig.ts         # Field configurations and form structure
├── formStore.ts          # Svelte 5 runes-based state management
└── README.md            # This file
```

### Form Steps
1. **Essential Data** (4 fields max): Location, time, species, basic count
2. **Observations** (optional): Behavior, environmental conditions, media
3. **Contact Info**: Personal details, boat information, additional notes

### State Management
- **Svelte 5 runes** (`$state`, `$derived`, `$effect`) for reactive state
- **Auto-save**: Persists to localStorage with 24-hour expiration
- **Validation caching**: Step-level validation with error tracking
- **Progress tracking**: Completed steps and navigation state

## Usage

### Basic Implementation
```svelte
<script>
  import ModernReportForm from '$lib/report/components/ModernReportForm.svelte';
  
  async function handleSubmit(formData) {
    // Transform and submit data
    const response = await fetch('/api/sightings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      throw new Error('Submission failed');
    }
  }
</script>

<ModernReportForm onSubmit={handleSubmit} />
```

### Customization

#### Adding New Fields
1. Add field to `SightingFormData` interface in `types.ts`
2. Create field configuration in `formConfig.ts`
3. Add validation logic to `formStore.ts`
4. Include field in appropriate step component

#### Creating Combined Fields
```typescript
// In formConfig.ts
export const combinedFields: Record<string, CombinedFieldConfig> = {
  myField: {
    selectField: {
      name: 'myField',
      type: 'select',
      label: 'My Field',
      options: myOptions
    },
    textField: {
      name: 'myFieldText',
      type: 'text',
      label: 'Specify',
      required: true
    },
    otherValue: 'other'
  }
};
```

#### Extending Validation
```typescript
// In formStore.ts, validateStep method
if (stepIndex === 1) { // Observations step
  if (this.data.myField === 'other' && !this.data.myFieldText?.trim()) {
    errors.myFieldText = 'Description required when "Other" selected';
  }
}
```

## Integration with Existing Schema

The form uses the existing Yup schema from `src/lib/form/validation/sightingSchema.ts`:

### Field Mappings
- `hasPosition` → Controls GPS vs. waterway input
- `isDead` → Reveals dead animal fields conditionally
- Combined fields → Use `fieldName` + `fieldNameText` pattern
- All validation rules → Maintain compatibility with existing schema

### Required Updates for Full Integration
1. **Constants Integration**: Update field configurations to use actual constants:
   ```typescript
   import { getAnimalBehaviorOptions } from '$lib/constants/animalBehavior';
   import { getBoatDriveOptions } from '$lib/constants/boatDrive';
   // etc.
   ```

2. **API Compatibility**: Ensure form data structure matches API expectations:
   ```typescript
   // Transform form data before submission
   const apiData = {
     ...formData,
     species: Number(formData.species),
     // Handle conditional fields properly
   };
   ```

3. **Validation Sync**: Keep form store validation in sync with Yup schema changes.

## Performance & Accessibility

### Performance Features
- **Lazy loading**: Heavy form sections loaded on demand
- **Style caching**: Computed styles cached for reuse
- **Debounced validation**: Prevents excessive validation calls
- **Auto-save optimization**: Batched localStorage updates

### Accessibility (WCAG 2.2)
- **Proper labeling**: All form elements have associated labels
- **ARIA support**: Screen reader compatible with live regions
- **Keyboard navigation**: Full keyboard accessibility with arrow key support
- **Focus management**: Logical focus flow with visible indicators
- **Error announcements**: Errors announced via `aria-live="polite"`

### Browser Support
- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile support**: iOS Safari 14+, Chrome Mobile 90+
- **Progressive enhancement**: Graceful degradation for older browsers

## Research & Metrics

This implementation follows research findings from `form-design.md`:

- **Multi-step forms**: 86% higher conversion rates
- **Mobile optimization**: 42.95% of completions happen on mobile
- **Optional field completion**: 3x increase with value-focused messaging
- **Error recovery**: 78% one-try submission rate with proper validation
- **Touch targets**: 48×48 DP minimum for mobile usability

### Recommended Metrics to Track
- **View-to-start rate**: Users who begin vs just view forms
- **Field-level abandonment**: Identify problematic fields
- **Completion by device**: Monitor mobile vs desktop performance
- **Error recovery rates**: Measure validation effectiveness
- **Time to completion**: Track efficiency improvements

## Future Enhancements

1. **Offline Support**: Service worker for field conditions
2. **Photo Integration**: Direct camera capture with GPS metadata
3. **Voice Input**: Speech-to-text for behavioral descriptions
4. **Expert Review**: Workflow integration for data validation
5. **Real-time Feedback**: Live species identification suggestions