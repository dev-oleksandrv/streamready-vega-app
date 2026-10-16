# StreamReady Privacy Policy

This is the same policy the app shows on its Privacy Policy screen. Its history is in this file's git log.

Last updated: 16 October 2026.

## 01. In short

StreamReady has no accounts, ads, analytics or tracking. To test your connection, the app talks to three outside services: M-Lab runs the speed test, and ipinfo.io and GeoJS look up your connection details. All three see your public IP address. M-Lab publishes it with your test results, permanently. Nothing leaves your TV until you accept.

## 02. Who I am

StreamReady is a free, open-source app (Apache-2.0) made by me, Oleksandr Voronkov. I decide what the app does with your data.

Email: help@voronkov.dev

Issues: github.com/dev-oleksandrv/streamready-vega-app/issues

Each outside service named here is responsible for how it handles the data it receives.

## 03. What a speed test sends to M-Lab

When you press Start, the app asks Measurement Lab (M-Lab) for a nearby test server, then measures download, upload and latency against it. M-Lab receives:

- your public IP address
- the date and time of the test
- the app name and version
- the test measurements: speed, latency, connection statistics, and the network route between your TV and the server

The test traffic is random data, not anything from your TV. It travels unencrypted.

## 04. M-Lab publishes test data

M-Lab is an open internet research project of Superbloom (New York, USA). It publishes every test, including your IP address and the test time, as public open data, and keeps it indefinitely. Anyone can download it. M-Lab stores data on Google Cloud, possibly in several countries, including the USA.

To have past results anonymized, email privacy@measurementlab.net. M-Lab asks for proof, such as a letter from your internet provider, that the IP address was yours at the time.

Full policy: measurementlab.net/privacy

## 05. Connection lookup

After you accept, each time the app starts, and when you return to it after a VPN was switched on or off, it asks ipinfo.io where your public IP address is located. If that fails, it asks GeoJS (geojs.io) instead. The service receives your IP address and standard request details. It returns your country, city and internet provider, which the app shows on screen. This location is approximate, at city level, not your address.

IPinfo Inc. (USA) and GeoJS handle requests under their own policies: ipinfo.io/privacy-policy and geojs.io/privacy

## 06. What stays on your TV

- Your consent choice, saved so you are not asked again.
- Device model, OS version and Wi‑Fi band, read to show on the Device screen. The app does not put them in its requests, but the Fire TV system may add basic device details to standard request headers. The app does not read your network name.
- Whether a VPN is connected, read from the Fire TV system to show a VPN badge and to measure latency on your TV instead. It is never sent anywhere.
- Test results and connection details, kept in memory only and cleared when you close the app. There is no test history.

I run no servers, so I never receive your data.

## 07. What I don't do

No accounts, ads, analytics, crash reports or cross-app tracking. I don't sell or share data. No automated decisions about you: the 4K verdict is calculated on your TV from your own results.

Amazon, as the Fire TV platform, may collect data such as app usage and crash reports under its own privacy notice.

## 08. Why, and on what basis

Purpose: measure your connection, tell you whether it can stream 4K, and show your connection details.

Legal basis: your consent (GDPR Art. 6(1)(a)). Without consent, the app can't run tests or lookups. Nothing else changes.

## 09. Your choices and rights

- Withdraw consent at any time: Home → Privacy Policy → Withdraw consent. The app stops sending data immediately. Data already sent stays with those services.
- Uninstalling the app deletes everything it stored on your TV.
- Depending on where you live (GDPR, UK GDPR, CCPA and others), you may have the right to access, correct, delete or restrict your data, or to object to its use. I hold no data about you, so send those requests to M-Lab, IPinfo or GeoJS directly.
- You can complain to your local data protection authority.

## 10. Children

StreamReady is not directed at children under 16, and I don't knowingly process children's data.

## 11. Changes

If what the app does with data changes, I will update this policy in the app. Every version is public in the source code.

Last updated: 16 October 2026.
