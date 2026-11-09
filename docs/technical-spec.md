# UpgradeYa Splash — Technical and Performance Specification

## Architecture

Build this as a tiny static site:

```text
index.html
assets/
  upgradeya-logo.png
css/
  main.css
js/
  signal-field.js
```

No build pipeline is required unless implementation proves that minification materially helps. The final page should remain understandable and maintainable without framework archaeology.

## Technology choice

### Recommended

- Semantic HTML
- Modern CSS for layout, atmosphere, masking, and reduced-motion behavior
- One small vanilla JavaScript module
- Canvas 2D for the network and traveling signals

### Explicitly avoid

- Bootstrap
- React/Vue/Svelte
- Three.js
- GSAP
- jQuery
- Google Fonts
- Analytics, trackers, cookies, tag managers, or third-party CDNs
- Video backgrounds

A shader could create impressive effects, but WebGL is unnecessary risk for this design. Canvas 2D can preserve the visual language, degrade cleanly, and remain very small.

## Performance budget

Targets to verify during implementation:

- Initial transferred page weight: **under 60 KB compressed**
- JavaScript: **under 12 KB compressed**
- CSS: **under 8 KB compressed**
- No render-blocking third-party requests
- No more than four first-party requests for the complete experience
- Largest Contentful Paint: **under 1.5s** on a representative mobile connection
- Cumulative Layout Shift: **0**
- Interaction to Next Paint: effectively immediate
- Smooth ambient animation at 60fps on a representative modern phone, with automatic complexity reduction when necessary

The current transparent logo is about 15 KB and is already suitable as an efficient base asset.

## Rendering strategy

1. HTML and CSS paint the background atmosphere, centered logo, and footer immediately.
2. JavaScript enhances the background with the canvas mesh after first paint.
3. The canvas uses `requestAnimationFrame`, pauses when hidden, and responds to resizing through a throttled observer.
4. Device pixel ratio is capped to prevent expensive over-rendering on high-density screens.
5. Node counts and connection distance scale by viewport area rather than using a fixed desktop load everywhere.
6. If JavaScript fails or is disabled, the page still appears finished.

## Logo implementation

Use the current transparent PNG as both a compatibility image and, where supported, a CSS mask. The mask allows a lightweight animated gradient without creating multiple logo exports.

Fallback order:

1. Masked animated gradient
2. Static existing purple logo
3. Text alternative available to assistive technology

The logo asset must not be stretched beyond its aspect ratio.

## Accessibility

- Decorative canvas marked `aria-hidden="true"`
- Logo has useful alternative text: `UpgradeYa`
- Email is a real `mailto:admin@upgradeya.com` link
- Visible keyboard focus state on the email
- Respect `prefers-reduced-motion`
- Adequate contrast for footer copy across every animation state
- Content remains usable at 200% zoom and in portrait orientation

## Privacy and security

- No telemetry or third-party calls
- No cookies, local storage, fingerprinting, or device-sensor access
- Strict Content Security Policy compatible with self-hosted static assets
- Standard security headers at the hosting layer
- No exposed source maps or unnecessary metadata

## SEO and sharing

Even a mystery page should not look broken to crawlers and link previews:

- Concise title: `UpgradeYa`
- Minimal description that does not over-explain
- Canonical URL for `https://upgradeya.com/`
- Favicon and touch icon derived from the logo mark
- Open Graph image built from the approved visual direction
- No indexing tricks or artificial keyword copy

## Verification plan after approval

- Test at common desktop and mobile viewport sizes
- Test touch and pointer behavior
- Verify reduced-motion mode
- Verify JavaScript-disabled fallback
- Run Lighthouse and inspect actual transferred bytes
- Check console for runtime errors
- Test Safari, Chrome, and Firefox behavior
- Confirm the email link exactly targets `admin@upgradeya.com`
- Verify the logo's visual center, not merely its CSS bounding-box center
- Confirm no third-party network requests

## Deployment boundary

The design phase does not change the live site. After the local implementation is approved and verified, deployment should use the established UpgradeYa hosting source of truth rather than editing production files blindly.
