const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

export interface PolicySectionContent {
  n: string;
  title: string;
  body: string;
}

// Placeholder policy text from the design; replaced before release.
export const POLICY_SECTIONS: readonly PolicySectionContent[] = [
  {n: '01', title: 'Lorem ipsum dolor', body: LOREM},
  {
    n: '02',
    title: 'Consectetur adipiscing',
    body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.',
  },
  {n: '03', title: 'Sed do eiusmod', body: LOREM},
  {
    n: '04',
    title: 'Tempor incididunt',
    body: 'Sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus, nulla gravida orci a odio.',
  },
  {n: '05', title: 'Ut labore et dolore', body: LOREM},
  {
    n: '06',
    title: 'Magna aliqua',
    body: 'Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.',
  },
];

export const privacyContent = {
  eyebrow: 'Privacy policy',
  headline: {
    gate: 'Before you start.',
    view: 'Your data, in plain words.',
  },
  lastUpdated: 'Last updated · September 2026',
  scrollKeys: '▲ ▼',
  scrollHint: 'Scroll',
  gatePrompt:
    'To run speed tests, we need your consent to process the data described here.',
  accept: 'Accept & continue',
  back: 'Back',
  withdraw: 'Withdraw consent',
  giveConsent: 'Give consent',
  status: {
    accepted: 'Consent given',
    withdrawn: 'Consent withdrawn · speed tests are off',
  },
} as const;
