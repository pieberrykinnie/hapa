# Research: Device-Local Onboarding

## Persistence

**Decision**: Store one versioned JSON document in `localStorage` and validate/default it on read.

**Tradeoff**: Zero infrastructure and instant reload recovery, but no authentication, ownership, cross-device sync, recovery after storage clearing, or production privacy boundary.

## Photo

**Decision**: Validate type/size/signature, render up to five selected photos to bounded canvases, save compressed JPEG data URLs, and extract a compact visual feature profile. For the prototype, normalize the local filename and match an allow-list of shopping keywords such as jeans, sneakers, bags, furniture, and outerwear. “Jean” or “denim” selects a curated five-card jeans deck.

**Tradeoff**: Photo bytes never leave the device and there is no model download, inference delay, or model failure. Matching is intentionally simulated; unrecognized uploaded names default to denim for the current jeans demo, while no photo uses generic suggestions.

## Suggestions

**Decision**: Score a catalog of distinct aesthetics against the aggregated visual profile, select the five highest unique categories, and include a visible explanation grounded in extracted features. Use a generic five-card mix when no image exists. Explicit decisions remain separate from generated proposals.

## Billing

**Decision**: Save only a preferred method id or defer flag. Every method remains `setup_required`; the UI never simulates connection or availability.
