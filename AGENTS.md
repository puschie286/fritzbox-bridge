# Project instructions

This is a TypeScript FRITZ!Box integration for Homey Apps SDK v3. See README.md for full development setup.

- Use Node.js 24+ locally and install dependencies with `npm ci`. Keep app code compatible with Homey's Node.js 22 runtime.
- Keep changes focused and follow the surrounding code style.
- Put driver-specific code in `drivers/`, reusable device features in `features/`, shared logic in `lib/`, and API types in `types/`.
- Edit `.homeycompose/` and drivers' `*.compose.json` files for manifests, capabilities, and Flow cards. Regenerate root `app.json` through the Homey CLI; do not edit it directly. Do not commit `.homeybuild/` output.
- Preserve existing device, capability, Flow card, and settings identifiers to keep installed devices and flows working.
- Reuse the existing FRITZ!Box API and polling classes. Consult `device_examples/` when changing response parsing or device support.
- Keep English and German user-facing strings aligned in `locales/` and Compose definitions.
- When changing dependencies, update both `package.json` and `package-lock.json`.

## Verification

- For code changes, run `npm run typecheck` and `npm run lint`.
- For Compose changes, run `npm run validate`; for packaging changes, also run `npm run build:app`.
- There is no automated test script. Report checks performed and any device behavior that still needs verification on a Homey and FRITZ!Box.
