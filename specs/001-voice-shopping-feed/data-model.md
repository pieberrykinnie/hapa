# Data Model: Device-Local Onboarding

One versioned `hapa.onboarding.v1` JSON document contains:

| Field | Meaning |
|---|---|
| `version` | Storage schema version (`1`) |
| `stage` | `profile`, `this_you`, `billing`, or `complete` |
| `displayName` | Required trimmed name |
| `photos` | Up to five compressed local images with per-image visual features and allow-listed filename keywords |
| `visualProfile` | Aggregated filename-derived shopping concepts plus palette, temperature, saturation, brightness, contrast, texture, and diversity |
| `suggestions` | Exactly five curated generic or photo-informed proposals |
| `decisions` | Suggestion id to `accept`/`reject`; explicit choices only |
| `styleProfile` | Accepted categories/attributes and exclusion-precedence output |
| `preferredPaymentMethod` | Optional method id; preference only |
| `billingDeferred` | Whether setup was postponed |
| `updatedAt` | Last local write time |

The document contains no password, auth token, payment credential, card data, wallet credential, or provider reference. Adding/removing photos recomputes the visual profile and clears unconfirmed photo-informed suggestions. Reset removes the whole document.
