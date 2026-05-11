---
name: anthara-design-fundamentals
description: "This skill should be used when making UI/UX decisions, designing layouts, choosing colors and typography, writing UI specs, or reviewing visual components. Contains the two-path design flow (existing system vs greenfield discovery), accessibility rules, typography pairing, color palette guidance using Sanzo Wada's Dictionary of Color Combinations, spatial composition, anti-generic rules, visual quality checklist, and compliance display constraints for healthtech and fintech."
---

# Design Fundamentals

Reference principles for any Anthara agent producing, evaluating, or documenting UI work. These apply universally — the target project's design system provides specific values on top of these.

---

## Two-Path Design Flow

Before applying any design principle, determine which path you're on:

**Path A — Existing Design System:** The project has design tokens, Tailwind config, CSS custom properties, or a component library. **Follow what exists. Never override. Never suggest alternatives.** Extract, document, and ensure new work is consistent with the established system.

**Path B — Greenfield (No Design System):** No design system detected. Run a design discovery with the developer using AskUserQuestion before making any visual decisions. See the Design Discovery section below.

---

## Priority System

When design concerns conflict, resolve by priority:

| Priority | Category | Severity |
|----------|----------|----------|
| 1 | Accessibility | CRITICAL |
| 2 | Compliance Display | CRITICAL |
| 3 | Performance | HIGH |
| 4 | Layout & Responsive | HIGH |
| 5 | Typography & Color | MEDIUM |
| 6 | Animation & Transitions | MEDIUM |
| 7 | Style & Visual Polish | LOW |

Accessibility always wins. Compliance display constraints (PAN masking, PHI redaction, audit-safe error messages) are peers of accessibility — both are non-negotiable.

---

## Accessibility

Non-negotiable minimums:

- **Color contrast**: 4.5:1 ratio for normal text, 3:1 for large text (WCAG AA)
- **Touch targets**: 44x44px minimum for interactive elements
- **Focus visibility**: every interactive element must have a visible focus indicator — never remove outline without replacing it
- **ARIA landmarks**: use semantic HTML (`nav`, `main`, `aside`, `footer`) before reaching for ARIA roles
- **Alt text**: meaningful images get descriptive alt text, decorative images get `alt=""`
- **Keyboard navigation**: all interactive elements reachable and operable via keyboard
- **Color-blind safety**: never rely on color alone to convey meaning. Status indicators, form validation, charts, and badges must pair color with a secondary signal — icon, label, pattern, or shape.
- **Motion**: respect `prefers-reduced-motion` — disable or reduce animations when set

---

## Compliance Display Constraints (Healthtech / Fintech)

These apply whenever the UI displays or handles regulated data. They are non-negotiable and override visual preferences.

### PAN and Cardholder Data (PCI-DSS)
- **Mask PAN** to show only first 6 and last 4 digits. Apply masking in the serialization layer, not in templates.
- **Never display CVV/CVC** after authorization — not even masked.
- **Never display full PAN** in any UI state: forms, tables, modals, exports, print views, or error messages.

### PHI and Health Data (HIPAA)
- **Minimum necessary standard**: only display fields needed for the current operation. Never show full patient records when a subset suffices.
- **De-identify in non-production**: test data, seed data, screenshots, and error messages must use synthetic data, never real PHI.
- **Audit trail UI**: if displaying audit logs, never show PHI fields inline — show record IDs and operation types only.

### Financial Data
- **Mask account numbers**: show only last 4 digits.
- **Mask routing numbers** in display — full values only in secure, authenticated contexts.

### Error Messages
- **Never expose PHI, PAN, or internal identifiers** in user-facing error messages. Use generic error codes for customer-facing responses. Log details server-side with correlation IDs.

### Session Security
- **Auto-logout timers**: UI should respect session timeout policies. Show countdown or re-auth prompt before expiry.
- **Idle state**: clear sensitive data from view on idle timeout (blur or overlay).

---

## Design Discovery (Greenfield Only)

When no existing design system is found, discover the developer's intent before proposing anything. Use AskUserQuestion for each decision.

### 1. Mood / Tone

Ask: "What visual feel are you going for?"
Options should be contextual to the app, but examples: "Clean & Minimal" / "Bold & Vibrant" / "Warm & Approachable" / "Corporate & Trustworthy"

### 2. Color Palette

Search online for color combinations from **Sanzo Wada's Dictionary of Color Combinations** that match the mood and the app's domain.

- Search for combinations that fit the mood
- Present 3-4 palette options to the developer via AskUserQuestion, showing the hex values and a brief description of each palette's character
- The developer picks one, and you derive primary, secondary, accent, and neutral colors from it
- **Always verify contrast**: proposed text/background combinations must pass WCAG AA (4.5:1 for normal text)

### 3. Typography

Ask about font character, not specific font names. The tone informs the pairing:

- **Minimal/Clean**: geometric sans (heading) + humanist sans (body)
- **Editorial/Refined**: serif with character (heading) + clean sans (body)
- **Bold/Vibrant**: strong display font (heading) + readable sans (body)
- **Warm/Approachable**: rounded sans or soft serif (heading) + friendly body font
- **Corporate/Trustworthy**: stable serif or geometric sans (heading) + highly readable body font

Present 2-3 specific pairings via AskUserQuestion based on the chosen tone. Avoid generic defaults.

### 4. Component Style

Ask: "What shape language fits your product?"
Options: "Rounded & soft" / "Sharp & geometric" / "Mixed (rounded buttons, sharp cards)"

### 5. Execution Pattern

The chosen mood maps to concrete CSS patterns:

- **Clean & Minimal**: generous whitespace, subtle shadows, thin borders, muted backgrounds, no gradients, precision spacing
- **Bold & Vibrant**: saturated colors, layered shadows for depth, geometric patterns, strong borders, high-contrast type
- **Warm & Approachable**: soft shadows, rounded corners (8-16px), warm neutral backgrounds, generous padding
- **Corporate & Trustworthy**: structured layouts, conservative color palette, clear information hierarchy, data-dense but organized

---

## Typography

### Hierarchy

- **Size and weight create hierarchy.** A clear type scale (e.g., 12/14/16/20/24/32px) creates visual hierarchy without relying on color or decoration.
- **Line height**: 1.4-1.6 for body text, 1.1-1.3 for headings.
- **Measure (line length)**: 45-75 characters per line for body text.
- **Weight progression**: regular for body, semibold for subheadings, bold for headings.

### Pairing

- **Two fonts maximum.** One display/heading font, one body font.
- **The heading font carries personality.**
- **The body font carries readability.**

---

## Spatial Composition

### Spacing Scale

- **Consistent scale**: spacing follows a base unit (e.g., 4px: 4/8/12/16/24/32/48/64).
- **Spacing creates grouping**: elements that belong together have less space between them (Gestalt proximity).
- **Vertical rhythm**: consistent spacing between sections.

### Grid Systems

- **12-column grid** is the default for web layouts
- **CSS Grid or Flexbox** — use Grid for two-dimensional layouts, Flexbox for one-dimensional flow
- **Max-width container** — constrain content width to prevent lines from stretching on wide screens
- **Gutter consistency** — use the spacing scale for gutters

### Layout

- **Generous negative space** signals confidence and clarity.
- **Density matches context.** Data-heavy dashboards need density. Marketing pages need breathing room.

---

## Progressive Disclosure

- **Show the essential, hide the rest.** Settings pages, dashboards, and complex forms benefit from collapsible sections, tabs, or "show advanced" toggles.
- **Prioritize by frequency of use.** The most common actions should be visible. Rare actions go behind a menu.
- **Multi-step over mega-form.** A wizard/stepper with 3 focused steps beats a single page with 20 fields.
- **Progressive detail in data.** Tables and lists show summary rows; clicking reveals detail.
- **Don't hide critical actions.** Save, submit, delete, and primary CTAs should always be visible.

---

## Color & Theme

- **60-30-10 distribution**: 60% dominant color, 30% secondary, 10% accent.
- **Use CSS variables** for all color values. Never hardcode hex values in components.
- **Semantic colors**: define success, warning, error, info independently from brand palette.
- **Dark/light considerations**: if the app needs both themes, design the token system for it from the start.

---

## Motion & Interaction

- **Transitions**: 150-300ms for UI feedback.
- **Hover and focus states**: every interactive element should respond to hover and show clear focus.
- **Prefer CSS-only** for simple transitions.
- **Respect `prefers-reduced-motion`**: disable or simplify all animations when set.

---

## Anti-Generic Rules

Avoid these common AI defaults:

- **Fonts**: Do not default to Inter, Roboto, Arial, or system fonts for every project.
- **Colors**: Do not default to purple gradients on white backgrounds, or blue-to-purple hero sections.
- **Layouts**: Do not default to centered card grids unless the content specifically calls for them.
- **Components**: Do not default to the same rounded-corner cards with subtle shadows everywhere.
- **Variety**: No two projects should look the same.

---

## Responsive Breakpoints

| Breakpoint | Width | Target |
|-----------|-------|--------|
| Mobile | 375px | Phones (portrait) |
| Tablet | 768px | Tablets, large phones (landscape) |
| Desktop | 1024px | Small laptops |
| Wide | 1440px | Desktop monitors |

- **Mobile-first**: start with the smallest layout and add complexity at larger sizes.
- **Content-driven breakpoints**: if a layout breaks at 920px, add a breakpoint at 920px.

---

## Visual Quality Checklist

Quick checks before shipping UI work:

- [ ] Color contrast passes WCAG AA (4.5:1 normal, 3:1 large)
- [ ] Touch targets meet 44x44px minimum
- [ ] All interactive elements have visible focus states
- [ ] All interactive elements respond to hover
- [ ] Transitions are 150-300ms
- [ ] `cursor-pointer` on all clickable non-link elements
- [ ] Layout stable at all breakpoints (375/768/1024/1440px)
- [ ] No horizontal scroll at any breakpoint
- [ ] `prefers-reduced-motion` respected
- [ ] Colors use CSS variables, not hardcoded hex
- [ ] Color is never the only signal for status
- [ ] Content constrained by max-width container
- [ ] Complex forms/settings use progressive disclosure
- [ ] Font pairing is intentional and consistent
- [ ] PAN/CVV never displayed unmasked
- [ ] PHI fields limited to minimum necessary for the view
- [ ] Error messages contain no PHI, PAN, or internal identifiers
- [ ] Session timeout behavior implemented for regulated-data views
