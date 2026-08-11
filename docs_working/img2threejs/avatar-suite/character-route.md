# Character route decision

- Read contracts: `character/reconstruction.md`, `character/likeness_maximization.md`, `character/structure_decomposition.md`, `character/head_construction.md`, `character/stylized_hair_threejs.md`, and `readiness/standard_character_pipeline.md`.
- Selected route: code-only procedural stylized character suite.
- Rejected route: projection-first maximum likeness.
- Reason: the deliverable is a reusable six-preset game avatar with class/presentation palette and modular equipment changes. Baking reference pixels onto one fitted body would couple the surface to a single illustration, reduce outfit modularity, and copy baked lighting into a runtime asset unless a full per-preset projection pipeline were maintained.
- Character geometry remains approximate at the individual-illustration level but preserves the observed head-unit scale, hair silhouette families, class outfit modules, palettes, and named runtime attachments.
- Hair route: solid scalp mass plus deterministic tapered lock clusters. Strand grooming and transparent billboard hair are excluded.
- Rig route: named rigid pivot hierarchy for the prototype (`root`, torso/limb pivots, `head`, `hand.R`, `hand.L`, `back`). A skinned continuous mesh is explicitly deferred; socket compatibility is retained for a later adapter.
- Coordinate contract: right-handed, Y-up, character forward `+Z`; equipment factories document their own grip-local axes.
