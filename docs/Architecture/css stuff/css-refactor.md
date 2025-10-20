## CampusLearn CSS Refactor Plan

This document describes a pragmatic, low-risk path to make styling consistent, predictable, and maintainable across environments (local dev, local prod build, Render). The refactor is incremental and preserves visual design while eliminating global collisions and dev/prod mismatches.

### Current State (observed)
- Global stylesheet `src/App.css` (~9k lines) imported in `App.tsx` and also linked in `index.html` for dev. Many global selectors and variables; dark-mode tokens co-exist with page/component-specific rules.
- Multiple component/page CSS files imported directly in TSX files (e.g., `Messages.css`, `CreatePostModal.css`, etc.).
- No CSS Modules in use; classes are global across the app.
- Production build includes bundled CSS at `dist/assets/index-*.css`. Dev sometimes also injects `/src/App.css` via `index.html`, causing dev/prod divergence.
- Tailwind removed; no PostCSS in pipeline.

### Primary Problems
1. Dev vs prod CSS mismatch: `index.html` links `/src/App.css` which is not used in prod.
2. Global cascade collisions: page/component styles leak across routes.
3. Hard-to-evolve monolith: 9k-line `App.css` mixes tokens, layout, components, pages.
4. Lack of guardrails: nothing prevents new global leakage.

### Goals
- Identical rendering between dev and prod.
- Predictable scoping: global only for tokens/resets; everything else page/component scoped.
- Safer iteration: introduce guardrails (linting, directory structure, naming conventions).
- Minimal churn initially; iterative migration.

### Immediate Fix (no visual change)
1. Remove the dev-only stylesheet link in `frontend/index.html`:
   - Remove: `<link rel="stylesheet" href="/src/App.css" />`
   - Rationale: `App.css` is already imported in `App.tsx`. Double-loading causes dev/prod differences.
2. Keep favicon links correct; ensure only existing assets are linked.

### Incremental Refactor Strategy
1. Create layers
   - `src/styles/base.css`: resets, CSS variables, color tokens, dark-mode variables.
   - `src/styles/layout.css`: structural utilities shared across pages (containers, grids, spacing helpers).
   - Keep `App.css` temporarily for global patterns; progressively shrink it.
   - Import order (in `main.tsx`): `base.css` → `layout.css` → app/component styles.

2. Scope page styles
   - Ensure each route root has a wrapping class (e.g., `.forum-view`, `.messages-view`, `.settings-view`).
   - Move page-specific rules from `App.css` into `src/pages/<Page>.css` and prefix with the view class to avoid bleed: `.forum-view .topic-card { ... }`.

3. Use CSS Modules for components
   - Rename component CSS to `*.module.css` and import with `import s from './Card.module.css'`.
   - Replace global class names with `s.card`, `s.header`, etc. to fully isolate component styles.
   - Migrate high-churn components first: header, cards, buttons, chat list items.

4. Normalize global scope
   - Global files may contain only: `:root` tokens, resets, typography base, and very generic utilities.
   - Prohibit global tag selectors (e.g., `p {}`) outside `base.css`.

5. Guardrails
   - Add Stylelint with rules:
     - Disallow `!important`.
     - Limit selector specificity/depth.
     - Forbid global element selectors outside `base.css`.
   - Add CI step to run stylelint on PRs.

6. Ship-size hygiene
   - Introduce `vite-plugin-purgecss` to remove unused CSS in prod builds, configured to scan `src/**/*.{ts,tsx,html}`.
   - Periodically report CSS bundle size to keep regressions visible.

### Concrete Migration Steps
1. Dev/prod parity: remove `/src/App.css` link in `index.html`.
2. Create `src/styles/base.css` and move tokens (`:root`), resets, dark-mode variables from `App.css`.
3. Create `src/styles/layout.css` and move shared layout utilities.
4. Rename `App.css` to `App.legacy.css` and re-import only what’s still needed; progressively migrate chunks to page/component files.
5. For each page:
   - Add a unique root class to the page container.
   - Move page-specific rules from `App.legacy.css` to `src/pages/PageName.css` and scope under the root class.
6. For components with recurring conflicts (e.g., avatars, cards, buttons):
   - Convert to CSS Modules (`*.module.css`).
   - Replace classNames in TSX with module references.
7. Add stylelint configuration and fix violations gradually.
8. Add PurgeCSS plugin for production builds.

### Risk Mitigations
- Run local prod build (`npm run build && npm run preview`) to visually validate after each batch.
- Split changes into small PRs per page/component group.
- Maintain `App.legacy.css` until all references are migrated, then delete.

### Verification Checklist
- Dev and preview look identical for: Forum, Messages, Settings, MyStudents, FindTutors, Landing.
- No global regressions after page scoping and module conversion.
- CSS bundle size does not grow; ideally shrinks after PurgeCSS.
- Lint passes with stylelint rules.

### Future Enhancements (optional)
- Introduce a design tokens file in TS for dynamic theming if needed.
- Replace ad-hoc utilities with a small, consistent set (spacing, typography scale).

---

Outcome: consistent cross-environment rendering, isolated styles, and a maintainable structure that enables further UI improvements without regressions.


