export interface PolicySectionContent {
  n: string;
  title: string;
  body: string;
}

// Mirrors what the code does: M-Lab locate + ndt7 (speedtest), ipinfo.io and
// GeoJS (insights), the system VPN state (insights, on-device only), MMKV
// consent (privacy). Update it with any change to those.
export const POLICY_SECTIONS: readonly PolicySectionContent[] = [
  {
    n: '01',
    title: 'In short',
    body: 'StreamReady has no accounts, ads, analytics or tracking. To test your connection, the app talks to three outside services: M-Lab runs the speed test, and ipinfo.io and GeoJS look up your connection details. All three see your public IP address. M-Lab publishes it with your test results, permanently. Nothing leaves your TV until you accept.',
  },
  {
    n: '02',
    title: 'Who I am',
    body: 'StreamReady is a free, open-source app (Apache-2.0) made by me, Oleksandr Voronkov. I decide what the app does with your data.\nEmail: help@voronkov.dev\nIssues: github.com/dev-oleksandrv/streamready-vega-app/issues\nEach outside service named here is responsible for how it handles the data it receives.',
  },
  {
    n: '03',
    title: 'What a speed test sends to M-Lab',
    body: 'When you press Start, the app asks Measurement Lab (M-Lab) for a nearby test server, then measures download, upload and latency against it. M-Lab receives:\n• your public IP address\n• the date and time of the test\n• the app name and version\n• the test measurements: speed, latency, connection statistics, and the network route between your TV and the server\nThe test traffic is random data, not anything from your TV. It travels unencrypted.',
  },
  {
    n: '04',
    title: 'M-Lab publishes test data',
    body: 'M-Lab is an open internet research project of Superbloom (New York, USA). It publishes every test, including your IP address and the test time, as public open data, and keeps it indefinitely. Anyone can download it. M-Lab stores data on Google Cloud, possibly in several countries, including the USA.\nTo have past results anonymized, email privacy@measurementlab.net. M-Lab asks for proof, such as a letter from your internet provider, that the IP address was yours at the time.\nFull policy: measurementlab.net/privacy',
  },
  {
    n: '05',
    title: 'Connection lookup',
    body: 'After you accept, and each time the app starts, it asks ipinfo.io where your public IP address is located. If that fails, it asks GeoJS (geojs.io) instead. The service receives your IP address and standard request details. It returns your country, city and internet provider, which the app shows on screen. This location is approximate, at city level, not your address.\nIPinfo Inc. (USA) and GeoJS handle requests under their own policies: ipinfo.io/privacy-policy and geojs.io/privacy',
  },
  {
    n: '06',
    title: 'What stays on your TV',
    body: '• Your consent choice, saved so you are not asked again.\n• Device model, OS version and Wi‑Fi band, read to show on the Device screen. The app does not put them in its requests, but the Fire TV system may add basic device details to standard request headers. The app does not read your network name.\n• Whether a VPN is connected, read from the Fire TV system to show a VPN badge and to measure latency on your TV instead. It is never sent anywhere.\n• Test results and connection details, kept in memory only and cleared when you close the app. There is no test history.\nI run no servers, so I never receive your data.',
  },
  {
    n: '07',
    title: "What I don't do",
    body: "No accounts, ads, analytics, crash reports or cross-app tracking. I don't sell or share data. No automated decisions about you: the 4K verdict is calculated on your TV from your own results.\nAmazon, as the Fire TV platform, may collect data such as app usage and crash reports under its own privacy notice.",
  },
  {
    n: '08',
    title: 'Why, and on what basis',
    body: "Purpose: measure your connection, tell you whether it can stream 4K, and show your connection details.\nLegal basis: your consent (GDPR Art. 6(1)(a)). Without consent, the app can't run tests or lookups. Nothing else changes.",
  },
  {
    n: '09',
    title: 'Your choices and rights',
    body: '• Withdraw consent at any time: Home → Privacy Policy → Withdraw consent. The app stops sending data immediately. Data already sent stays with those services.\n• Uninstalling the app deletes everything it stored on your TV.\n• Depending on where you live (GDPR, UK GDPR, CCPA and others), you may have the right to access, correct, delete or restrict your data, or to object to its use. I hold no data about you, so send those requests to M-Lab, IPinfo or GeoJS directly.\n• You can complain to your local data protection authority.',
  },
  {
    n: '10',
    title: 'Children',
    body: "StreamReady is not directed at children under 16, and I don't knowingly process children's data.",
  },
  {
    n: '11',
    title: 'Changes',
    body: 'If what the app does with data changes, I will update this policy in the app. Every version is public in the source code.\nLast updated: 16 October 2026.',
  },
];

export const privacyContent = {
  eyebrow: 'Privacy Policy',
  headline: {
    gate: 'Before you start.',
    view: 'Your data, in plain words.',
  },
  scrollKeys: '▲ ▼',
  scrollHint: 'Scroll',
  gatePrompt:
    'To run speed tests, I need your consent to send the data described here.',
  accept: 'Accept & continue',
  back: 'Back',
  withdraw: 'Withdraw consent',
  giveConsent: 'Give consent',
  status: {
    accepted: 'Consent given',
    withdrawn: 'Consent withdrawn · speed tests are off',
  },
} as const;
