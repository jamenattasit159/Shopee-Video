---
name: shopee_gpt Studio
description: A quiet Thai production workspace for real footage and editable stories.
colors:
  primary: "oklch(62% 0.21 275)"
  primary-light: "oklch(49% 0.23 275)"
  primary-content: "oklch(98% 0.01 275)"
  base-100: "oklch(20% 0.012 265)"
  base-200: "oklch(17% 0.012 265)"
  base-300: "oklch(28% 0.014 265)"
  base-content: "oklch(92% 0.008 265)"
  light-base-100: "oklch(100% 0 0)"
  light-base-200: "oklch(98% 0 0)"
  light-base-300: "oklch(95% 0 0)"
  light-base-content: "oklch(21% 0.006 285.885)"
  neutral: "oklch(14% 0.005 285.823)"
  neutral-content: "oklch(92% 0.004 286.32)"
  info: "oklch(74% 0.16 232.661)"
  success: "oklch(76% 0.177 163.223)"
  warning: "oklch(82% 0.189 84.429)"
  error: "oklch(71% 0.194 13.428)"
typography:
  headline:
    fontFamily: '"Noto Sans Thai", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.375
  title:
    fontFamily: '"Noto Sans Thai", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  dialog-title:
    fontFamily: '"Noto Sans Thai", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontFamily: '"Noto Sans Thai", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: '"Noto Sans Thai", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  helper:
    fontFamily: '"Noto Sans Thai", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.625
rounded:
  field: "0.75rem"
  selector: "0.75rem"
  box: "1rem"
spacing:
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-content}"
    rounded: "{rounded.field}"
    padding: "0 1rem"
    height: "2.5rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.base-content}"
    rounded: "{rounded.field}"
    padding: "0 1rem"
    height: "2.5rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.base-content}"
    rounded: "{rounded.field}"
    padding: "0 0.75rem"
    height: "2rem"
  input:
    backgroundColor: "{colors.base-100}"
    textColor: "{colors.base-content}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 0.75rem"
    height: "2.5rem"
  workflow-nav:
    textColor: "{colors.base-content}"
    typography: "{typography.helper}"
  status-chip:
    typography: "{typography.helper}"
  scene:
    backgroundColor: "{colors.base-100}"
    textColor: "{colors.base-content}"
    rounded: "{rounded.box}"
    padding: "{spacing.4}"
  voice-source:
    rounded: "{rounded.field}"
    height: "3rem"
  error-entry:
    textColor: "{colors.base-content}"
    rounded: "{rounded.field}"
    padding: "{spacing.4}"
---

# Design System: shopee_gpt Studio

## Overview

**Creative North Star: "Script and shot matching"**

A quiet, personal production workspace for Thai creators. Charcoal surfaces, indigo actions and readable Thai type support dense editing without turning the project into a performance dashboard. Light mode retains the same visual roles and hierarchy.

The selected concept B informs the studio's pairing of spoken lines and supporting footage. That composition belongs to the studio surface contract; the durable system is semantic color, restrained grouping, clear form hierarchy and honest data states. The concept board was approved as a direction, not an exact pixel specification.

This refresh merges the earlier studio direction with the shipped implementation. Sources are `src/app/globals.css`, `src/app/layout.tsx`, `src/components/{studio,ui,voice-controls,error-center,inline-errors}.tsx`, the installed daisyUI theme/component definitions and review captures. The studio surface strategy remains in `.impeccable/surfaces/studio.md`; exact concept reproduction remains unverified in `.impeccable/build/concept-review.json`.

**Key Characteristics:**

- Dark-first semantic themes with one indigo action accent.
- Noto Sans Thai at regular, medium and semibold weights.
- Twelve-pixel fields and sixteen-pixel grouped surfaces.
- Flat working areas, with borders and tonal changes for hierarchy.
- Real media, explicit save state and recoverable errors.

## Colors

A restrained indigo accent sits on cool charcoal in dark mode and neutral white surfaces in light mode. The frontmatter preserves the source's OKLCH values; use runtime semantic variables in application code.

### Primary

- **Studio Indigo** (`primary`, `primary-light`): principal actions, selected workflow step, selected scene border, voice-engine selection and focus/caret/selection treatment. `primary-content` supplies foreground contrast in both themes.
- The library selection is a translucent primary wash; scene selection uses a primary border. Do not convert every selected item into a filled button.

### Neutral

- **Charcoal Surface** (`base-100`): header, library rail, scenes, media groups and inputs.
- **Working Charcoal** (`base-200`): page background.
- **Quiet Divider** (`base-300`): borders and secondary tonal fills, commonly reduced to half or six-tenths opacity.
- **Reading White** (`base-content`): main text; secondary copy commonly uses 65–75% opacity.
- **Light Surface / Working Paper / Light Divider / Reading Ink** (`light-base-*`): the same roles in light mode, inherited from daisyUI's light theme.
- **Media Neutral** (`neutral`, `neutral-content`): media-player wells and thumbnail duration labels. Player backgrounds remain dark in light mode.

### Semantic states

- **Info**: explanatory soft alerts.
- **Success**: verified/readiness checks and connection indicators.
- **Warning**: missing footage, trim warnings, unresolved issue borders and the error-center count.
- **Error**: failed actions, offline indicators and an active recording stop control.

**The Semantic State Rule.** Indigo identifies actions and selection. Success, warning, error and info colors communicate their named states; they are not extra decorative accents.

The built-in secondary and accent palette is not used as a studio color language. Do not introduce it merely because the library exposes it.

## Typography

**Display and Body Font:** Noto Sans Thai with UI sans-serif and system fallbacks. Local font assets load regular (400), medium (500) and semibold (600).

The type remains workmanlike and readable in Thai. Hierarchy comes from size, weight, spacing and quieter metadata, rather than a second display family or uppercase decoration.

### Hierarchy

- **Headline:** project names and connection-page headings use the headline token; the project name uses a snug line height.
- **Title:** working-section headings use the title token.
- **Dialog title:** modal headings use the dialog-title token.
- **Body:** form copy and narration use the body token. Narration may use loose line height (2) for reading and editing.
- **Label:** field legends and smaller subsection labels use medium weight.
- **Helper:** supporting descriptions use the helper token, usually at 65–75% foreground opacity.
- The empty-project introduction is an existing surface-specific exception: a semibold heading grows from 30px to 36px at the small breakpoint. It is not the default app-page headline.
- Times and durations use tabular numerals. Some tertiary metadata is 10–11px in the shipped UI; this is not a general-purpose text tier.

**The Thai Reading Rule.** Keep narration and helper copy in the Thai-capable sans family, with relaxed or loose line height where text spans multiple lines.

## Layout

The app shell is centered at a maximum width of 1440px. Main padding progresses from 16px on narrow screens to 24px at the small breakpoint and 32px at the large breakpoint. Repeated gaps and section rhythms use the spacing scale in frontmatter.

At the large breakpoint (1024px), a 240px project rail becomes persistent. Below it, a header menu opens the project list as a full-width overlay. At the extra-large breakpoint (1280px), the working column and a 280px reference/preview rail sit side by side with a 24px gap; the reference rail is sticky. Below it, preview and reference content follow the form vertically.

Workflow navigation scrolls horizontally when necessary. At the small breakpoint (640px), paired fields form two columns and a scene can place its media controls in a 160px column; narrow layouts stack them. Action rows wrap. Long filenames truncate; issue details wrap and scroll within their own region.

## Elevation & Depth

Tonal layering and light borders establish depth. Most working surfaces have no explicit shadow. Dropdowns, notices and the offline banner use a small utility shadow. daisyUI buttons retain the library's shallow inset and ambient shadow; this is not permission to add heavy elevation to panels. Modal backdrops separate a focused task from the workspace.

**The Quiet Surface Rule.** Group a scene, source preview or audio excerpt when it is a real unit. Leave reference information and workflow sections on the working background.

State transitions are short and local: daisyUI buttons use 200ms ease-out changes, and scene/library selection uses color transitions. Spinners indicate processing. The global reduced-motion rule suppresses animation and transition duration for users who request it.

## Shapes

Fields and selector primitives use the field and selector radii; main scene, media and dialog surfaces use the box radius. Borders are thin and semantic. Compact numeric markers and duration overlays have smaller corners, while numbered workflow markers are circles. These local exceptions do not replace the main field/surface language.

Use cards only for a genuine content group. Some shipped grouped containers use semantic article/div markup with utilities rather than daisyUI's card class; retain their visual hierarchy without repeating custom CSS.

## Components

### Buttons

Confident primary actions with quiet supporting controls. Full-size buttons are 40px high; compact buttons are 32px and micro controls are 24px. Primary uses indigo and its content foreground. Outline controls have transparent fill and a foreground border; ghost controls omit the border at rest.

Hover and active states come from daisyUI. Keyboard focus uses the global primary outline (2px with 3px offset); native control/library focus treatments also remain. Busy actions replace their icon with a small spinner and keep explanatory text. Disabled controls use the library's muted styling.

### Chips

Small daisyUI ghost badges carry status, duration, provenance and issue codes. They are compact annotations rather than action pills. Semantic status color is reserved for a meaningful state.

### Cards / Containers

Scenes and source previews use the surface color, box radius and a quiet divider border. The selected scene strengthens the border with indigo. Internal padding is usually 16px; selected excerpts and readiness groups also use 20px. Reference facts and connection information remain open sections separated by spacing or a divider.

The scene pattern has an expanded editable state and a compact summary state. Both retain a numbered title, media relationship and duration. The ordered thumbnail strip repeats selection with an indigo ring.

### Inputs / Fields

daisyUI inputs, selects, textareas, ranges, toggles, checkboxes and file inputs supply control styling. Visible legends group controls with nearby helper text. Inputs use the field radius, surface background and library stroke; narration uses a generous multiline field.

Validation appears near the task through a soft error alert, explanatory text or a warning. Global error messages carry a dismiss control. Do not rely on border color alone to explain a failure.

### Navigation

The project rail uses thumbnail rows, a translucent selected background and concise status metadata. Workflow tabs have a bottom indicator, indigo selected text and a numbered circular marker. Mobile navigation retains horizontal scrolling; the project menu has explicit open and close controls.

### Voice controls

The voice source is a joined three-way control: the selected source is primary and other options are outlined. A standard or existing cloned voice selector, voice ID, style preset, intensity, additional direction, speed and polish control follow the ordinary field hierarchy. Short preview is an outline action; full narration generation is primary. Audio excerpts use quiet surface groups and native audio controls.

The cloning task uses a standard modal, with source and consent recording/upload sections, an explicit confirmation checkbox and a single submit action. Advanced pronunciation and clone management use disclosure sections instead of permanent panels.

### Error center and notices

The header issue control is ghost when there are no unresolved items and soft warning when there are. A rounded modal presents a scrollable list of issues, with code, timestamp, message, recovery hint and optional technical disclosure. Unresolved items have a quiet warning border; acknowledged entries recede through reduced opacity.

Modal-local failures use the same soft error alert pattern. Connectivity/storage failures use a fixed bottom alert with a retry action. Routine confirmations use a bottom-centered, dismissible notice with a live status role. These patterns document presentation, not proof that every external service succeeds.

## Do's and Don'ts

### Do:

- **Do** use daisyUI controls and semantic theme variables; use Tailwind for layout and spacing.
- **Do** retain the same roles in dark and light themes.
- **Do** keep labels visible and give icon-only buttons accessible names.
- **Do** show loading, empty, processing, disabled and actionable error states.
- **Do** preserve the distinction between original media, generated suggestions and provider results.

### Don't:

- **Don't** add unrelated accent colors, heavy gradients or glass effects.
- **Don't** enclose every section in a card or add heavy shadows.
- **Don't** use emoji as the primary interface icon system; use Lucide.
- **Don't** fabricate media, project metrics, connection success or completed edits.
- **Don't** treat the concept board or review screenshots as a measured pixel specification.

