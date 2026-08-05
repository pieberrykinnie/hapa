# Local Storage Contract

## Key

`hapa.onboarding.v1`

## Operations

- `loadLocalOnboarding()`: validates version and required shapes; returns a clean profile state on missing/corrupt data.
- `saveLocalOnboarding(state)`: writes the complete document and updated timestamp; throws a shopper-safe storage/quota error if persistence fails.
- `resetLocalOnboarding()`: deletes the document.
- `prepareLocalPhoto(file)`: validates JPG/PNG/WebP up to 10 MB, verifies signature, compresses to a bounded JPEG data URL, extracts visual features, and matches allow-listed shopping keywords from the normalized filename.
- `aggregateVisualProfile(photos)`: combines up to five per-image filename keywords and visual profiles without retaining raw pixel buffers.
- `suggestionsForVisualProfile(profile|null)`: ranks concept-specific catalogs and returns exactly five unique, explained cards; multiple concepts are selected round-robin for balanced coverage and `null` is the generic set.
- `/?onboarding=1`: clears local onboarding state once, removes the query parameter, and opens profile setup for development testing.

No image bytes are submitted to an onboarding API and no image model is downloaded. Unrecognized uploaded filenames use the deterministic jeans demo deck; no photo uses the generic deck.
