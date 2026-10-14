# Fritzbox Bridge

A TypeScript FRITZ!Box integration for Homey Apps SDK v3.
The App Store description is in [README.txt](README.txt).

## Supported devices

- CometDECT and FRITZ!DECT 300/301
- FRITZ!DECT 200/210 and FRITZ!Powerline 546E
- HAN-FUN alarm sensors
- FRITZ!Box routers
- RolloTron DECT
- FRITZ!DECT 500
- FRITZ!DECT 400/440

See the [supported devices and sensors](https://github.com/puschie286/fritzbox-bridge/wiki/Supported-devices-&-sensors)
documentation for available sensors and values.

## Connection setup

Configure the FRITZ!Box address and user credentials in the app settings before adding devices.
The user account needs **Smart Home** permission for connected Smart Home devices.
Router status and network features also need **FRITZ!Box settings** permission.
See the [FRITZ!Box user account instructions](https://en.avm.de/service/knowledge-base/dok/FRITZ-Box-7369-int/1522_Accessing-FRITZ-Box-from-the-home-network-with-user-accounts/)
for more information.

## Known limitations

- CometDECT readings and commands can take up to 15 minutes to update or take effect.
- CometDECT's internal temperature measurement has a higher resolution than the reported value.
- FRITZ!DECT 400/440 button events are detected by polling. Their delay depends on the polling interval in the app settings.

## Credits

Icons by [Freepik on Flaticon](https://www.flaticon.com/authors/freepik).

Product photo references by FRITZ!/AVM, Telekom Deutschland and DELTA DORE RADEMACHER.
See [driver artwork sources and editing notes](assets/artwork.md) for individual credits and processing details.

## Development

Use **Node.js 24+** and npm. The app targets **Homey 12.9+** with Node.js 22.

```sh
npm ci
npm test
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
