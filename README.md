# UpgradeYa Splash

A fast, minimal replacement for the current [UpgradeYa](https://upgradeya.com/) landing page.

## Status

Signal Field staging is live for review at `/splash/` on UYI v2's port. It is not yet the public `upgradeya.com` replacement. The repository root is the deployable static site; pushes to `main` auto-deploy to the staging route.

## Run locally

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8765/`. Run the regression suite with `npm test`.

## Approved intent to preserve

- Full-screen mystery and professionalism
- Existing UpgradeYa logo centered in the viewport
- `ITS NOT TOO LATE` at the bottom
- `admin@upgradeya.com` directly beneath the tagline
- A smooth animated background derived from the current blue/purple network aesthetic
- Extremely fast loading with no unnecessary framework or third-party dependency

## Current interpretation

Remove the white content tile, `Bitcoin Mining`, `Charleston, SC`, and the Steve/Marc contact addresses. Preserve the UpgradeYa logo itself. The logo remains spatially centered while its color and glow subtly evolve with the background.

## Documents

- [Static concept frame](docs/concept-frame.png) — a single key frame showing composition; animation is specified separately
- [Design brief](docs/design-brief.md)
- [Motion and visual system](docs/motion-system.md)
- [Technical and performance specification](docs/technical-spec.md)
- [Approval notes](docs/approval.md)

## Source references

The current public page, stylesheet, logo, and background are archived under `reference/current-site/` for design continuity. They are references, not the proposed implementation.
