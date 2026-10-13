# Fritzbox Bridge

A TypeScript FRITZ!Box integration for Homey Apps SDK v3.
The App Store description is in [README.txt](README.txt).

## Development

Use **Node.js 24+** and npm. The app targets **Homey 12.9+** with Node.js 22.

```sh
npm ci
npm run typecheck
npm run lint
npm run validate
npm run build:app
```

Edit `.homeycompose/` and drivers' `*.compose.json` files; root `app.json`
is generated. Build output goes to `.homeybuild/` and should not be committed.

## Run on Homey

Install Docker for the Homey CLI's development environment, then:

```sh
npx --no-install homey login
npx --no-install homey select
npm run run
```

Configure the FRITZ!Box URL and credentials in the app settings after installation.
Publish with `npm run publish` (requires developer access).
