# Anime field RPG avatar suite — image analysis

## Suitability verdict

- Verdict: `character-conditional -> stylized`, accepted.
- Target: code-only, real-time browser avatar with an approximately 5–5.6 head-unit silhouette.
- Coverage: every sheet provides front, near-profile, rear, palette, and class-prop evidence.
- Fidelity route: procedural silhouette/material reconstruction. Reference-pixel projection is not used because the runtime needs reusable body/class variants and palette swaps.
- Limits: cloth folds, individual hair strands, hands, and shoe stitching are simplified into stable game-scale forms. The sheets are perspective illustrations rather than orthographic measurements.

## Layered observation

### 1. Identification and classification

- Six stylized humanoid character turnaround sheets: feminine/masculine presentations crossed with warrior, mage, and ranger classes.
- Primary domain: `character`; complexity: `complex` as a modular suite, `moderate` per preset.
- Confidence: 0.96 for visible silhouette and palette; 0.78 for depth because side views are near-profile illustrations.

### 2. Overall form and silhouette

- Bilaterally symmetric core body with deliberate asymmetric outfit/accessory modules.
- Head is oversized relative to an adult realistic body; target scaffold is 5.3 HU feminine and 5.5 HU masculine to satisfy the project requirement while retaining the reference read.
- Feminine scaffold: narrower shoulder span, wider hip transition, slightly shorter torso.
- Masculine scaffold: broader shoulder span, straighter waist, slightly longer forearm and lower leg.
- Boots enlarge the distal-leg silhouette for both presentations.

### 3. Macro → meso → micro decomposition

- Core macro modules: root/hips, torso, neck, continuous head volume, upper/lower limbs, hands, feet.
- Hair macro modules: scalp mass plus directional lock clusters; feminine warrior adds a high ponytail, feminine mage a shoulder-length rear mass and braid, ranger variants short layered locks, masculine ranger a small rear tie.
- Outfit macro modules: base tunic/robe, pants/leggings, boots, gloves, belt, class mantle/cape.
- Warrior meso modules: blue split-hem tunic, white trim, brown cross-body strap, left shoulder pauldron, belt pouch.
- Mage meso modules: indigo long robe, purple inset panels, cream/gold trim, hood mantle, crescent clasp, belt pouch.
- Ranger meso modules: olive split tunic, short hooded cape, cream trim, cross-body strap, belt pouch, back quiver.
- Micro groups: pauldron rivets, belt buckle, pouch flap/button, robe/cape edge trim, boot cuff/strap, class-color hair tie or gem.

### 4. Spatial relationships and attachments

- Stable runtime hierarchy: `root -> hips -> torso -> neck -> head`; limb pivots branch from torso/hips.
- Required sockets: `hand.R`, `hand.L`, `head`, and `back`; all equipment is attached through these exact named nodes.
- Warrior pauldron overlaps the left upper-arm/shoulder root and follows that pivot.
- Mage mantle overlaps the upper torso and surrounds the neck; long robe panels originate at the waist and remain separate from legs.
- Ranger quiver attaches to `back` on a diagonal and the strap crosses the torso as a separate shell.
- Hair roots embed into the scalp mass; ponytail and rear tie originate at named head-local pivots.

### 5. Materials and surface

- Skin: dielectric, matte-satin, warm light albedo, roughness about 0.62.
- Hair: dielectric, broad lock highlights, roughness about 0.50; no strand transparency.
- Cloth: dielectric matte, roughness 0.78–0.9 with no texture dependency.
- Leather: dark brown satin, roughness about 0.68.
- Steel pauldron/blades: metallic, roughness about 0.28–0.36.
- Gold/brass trim: metallic, roughness about 0.34–0.42.
- Gems: saturated dielectric with emissive accent rather than transmission.

### 6. Color and finish

- Warrior: vivid deep blue cloth, white trim, silver steel, dark brown leather, muted gold fittings.
- Mage: dark indigo cloth, violet inset panels, warm cream/gold trim, dark brown leather, violet/blue crystal.
- Ranger: muted olive and forest-green cloth, warm cream trim, dark brown leather, muted gold fittings.
- Hair palettes remain presentation/class specific but are centralized as serializable presets.

### 7. Identity-defining features

- Shared: large anime eyes, compact nose/mouth marks, large head, readable boots and gloves.
- Warrior: single left pauldron, diagonal chest strap, front split blue tunic, one-handed straight sword.
- Mage: broad hood mantle, long pointed robe panels, crescent clasp, forked wooden staff with crystal.
- Ranger: short hooded cape, split green tunic, diagonal quiver, recurved wooden bow.
- Feminine warrior: high long ponytail; feminine mage: wavy bob plus rear braid; ranger feminine: auburn short layered hair.
- Masculine ranger: dark green short locks with a small rear tie; masculine mage: navy short layered locks.

### 8. Uncertainty and controlled approximations

- Exact cloth thickness and hidden garment construction are undetermined; use thin offset shells and overlapping panels.
- Exact facial topology is not supplied; use one continuous ellipsoidal head volume with attached eye regions and small nose/mouth marks.
- Hands use mitten/palm forms without individual deforming fingers at gameplay camera distance.
- Hair lock count and rear overlap are inferred from the turnaround silhouettes and must be checked in orbit renders.
- The class prop drawings guide additional equipment factories, but the first milestone still uses the common sword combat path defined by the implementation plan.

## Planned feature review targets

- Critical: `five-head-silhouette`, `face-and-eye-readability`, `hair-class-presentation-silhouette`, `outfit-class-identity`, `socket-and-equipment-attachment`.
- Important: `class-palette`, `boot-and-glove-readability`, `rear-accessory-coverage`.

