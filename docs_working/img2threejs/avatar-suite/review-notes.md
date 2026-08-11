# Browser Review Notes

## Blockout / first material render

- Evidence: `renders/feminine-warrior-gallery.png`, `renders/feminine-warrior-isolated.png`,
  `renders/comparison-feminine-warrior.png`.
- Browser result: page loaded without console warnings or errors; all 6 avatar selectors and
  character/equipment/field category controls were present.
- Global visual estimate: **0.65**. Layer estimates: silhouette 0.66, proportion 0.62,
  palette/material zoning 0.74, class identity 0.78, face treatment 0.45.
- Critical feature estimates: blue split tunic 0.78, single pauldron 0.86, high/rear ponytail
  0.70, sword profile 0.73, anime face 0.45.
- Decision: `refine-code`. The deterministic pixel gate reported IoU 0.299 because it compared
  an isolated concept crop to a full dark UI screenshot with different framing; that score is not
  treated as a visual acceptance result.

## Corrections applied

- Replaced protruding spherical eyes with thin layered eye discs following the face surface.
- Reduced the nose and mouth projection to avoid a toy-like face profile.
- Added the warrior diagonal leather strap and retained the belt/pouch cluster.
- Changed warrior thighs to skin, lower legs to tall leather boot masses, and hands to glove
  materials so the class color blocking follows the reference more closely.
- Final lint, 9 unit tests, and production build pass. A final browser recapture remains useful
  before treating this as a high-fidelity art lock; the current deliverable is a runtime-ready
  stylized procedural asset foundation.
