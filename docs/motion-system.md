# UpgradeYa Splash — Motion and Visual System

## Motion principle

Motion exists to create tension and depth, not to demand attention. The page should still look intentional in a screenshot; animation makes it feel alive when observed over time.

## Background layers

### 1. Base atmosphere

An immediate CSS-rendered radial and linear gradient establishes the visual frame before JavaScript runs. This prevents a blank flash and serves as the no-JavaScript fallback.

- Near-black navy base
- Very slow violet/blue light migration
- Subtle vignette to hold focus in the center
- Fine noise only if it can be generated cheaply and remains invisible at normal viewing distance

### 2. Signal mesh

A lightweight canvas layer draws a sparse, responsive network.

- Nodes drift on long, curved paths
- Lines appear only within a controlled proximity
- Line opacity is low and distance-weighted
- A few nodes carry soft halos; most remain understated
- The mesh favors asymmetric clusters, avoiding a uniform graph-paper look
- Geometry can extend beyond the viewport so edges never look clipped

### 3. Traveling signals

Rare pulses move along selected connections.

- One to three visible signals at a time on desktop
- Zero to one on small mobile screens
- Signals use smooth easing and fade before reaching an obvious endpoint
- Pulses should feel discovered, not scheduled

## Logo motion

The logo stays locked to the viewport center.

Allowed:

- Slow gradient movement through the logo mask
- Soft glow intensity changes of roughly 8–12%
- A nearly imperceptible contrast response when a nearby background signal brightens
- A one-time entrance from soft/low-contrast to crisp at initial load

Not allowed:

- Position drift
- Rotation
- Elastic scaling
- Glitch effects
- Letter-by-letter animation
- Constant pulsing

## Footer motion

The footer fades in once after the logo resolves. It then remains stable. Hovering or focusing the email may shift it from muted white toward electric blue and slightly increase opacity.

## Timing

### Initial load

- `0–150ms`: static atmosphere and content layout paint
- `150–650ms`: logo sharpens and reaches full opacity
- `450–900ms`: footer fades into place
- `300–1500ms`: mesh activity rises gently to ambient level

There is no blocking preloader and no fake percentage counter.

### Ambient cycles

- Field drift: approximately `18–34s` per dominant movement arc
- Hue migration: approximately `24–40s`
- Node halo breathing: approximately `5–9s`, offset per node
- Signal traversal: approximately `1.8–3.6s`, with irregular quiet gaps

The animation must not expose an obvious loop.

## Pointer response

Desktop pointer input may create a subtle local field disturbance:

- Small proximity attraction or repulsion radius
- No bright cursor comet
- No logo movement
- Effect decays immediately when the pointer stops

Touch devices do not need a synthetic pointer effect. Orientation and accelerometer permissions are not requested.

## Reduced motion and low-power behavior

When `prefers-reduced-motion: reduce` is active:

- Stop node drift and traveling signals
- Preserve a static, polished network composition
- Remove entrance transitions or reduce them to a short opacity fade
- Keep the logo gradient static

Additional adaptive behavior:

- Pause the canvas when the page is hidden
- Cap device pixel ratio used for canvas rendering
- Lower node count on narrow screens and low-end devices
- Avoid updating at full rate when there is no visible change

## Quality guardrails

- Background never reduces logo contrast below a readable threshold
- Footer remains legible without becoming a second focal point
- Bright nodes are kept away from direct overlap with the wordmark
- Movement remains smooth at 60fps on a normal phone; visual complexity is reduced before frame rate is sacrificed
- The visual does not depend on audio, scroll, permissions, or user interaction
