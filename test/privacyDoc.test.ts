import {POLICY_SECTIONS} from '~/modules/privacy/content';

// PRIVACY.md is the public copy of the in-app policy (store listing, GitHub).
// The app is the source of truth; this keeps the two from drifting apart.
// Node typings are not in tsconfig (the app runs on Vega, not Node); jest provides both.
declare const __dirname: string;
const {readFileSync} = require('fs') as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};

const doc = readFileSync(`${__dirname}/../PRIVACY.md`, 'utf8');
const docLines = new Set(doc.split('\n'));

describe('PRIVACY.md', () => {
  it.each(POLICY_SECTIONS.map((s) => [s.n, s]))(
    'mirrors policy section %s',
    (_n, {n, title, body}) => {
      expect(docLines).toContain(`## ${n}. ${title}`);
      body.split('\n').forEach((line) => {
        // In-app bullets are "• "; Markdown uses "- ".
        expect(docLines).toContain(line.replace(/^• /, '- '));
      });
    },
  );

  it('has no sections the app does not show', () => {
    const headings = doc.split('\n').filter((line) => line.startsWith('## '));
    expect(headings).toHaveLength(POLICY_SECTIONS.length);
  });
});
