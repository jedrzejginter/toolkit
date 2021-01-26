const cases = require('jest-in-case');
const {ESLint} = require('eslint');

const eslint = new ESLint();
let eslintConfig

function wrapInName(arr) {
  return arr.map((el) => ({name: el}));
}

const cache = {};

async function getESLintMessages(code, filePath = 'index.js') {
  const cacheKey = `${filePath}: ${code}`;

  if (Object.hasOwnProperty.call(cache, cacheKey)) {
    return cache[cacheKey];
  }

  const results = await eslint.lintText(code, {filePath});

  const messages = results.reduce((acc, result) => {
    if (!Array.isArray(result.messages)) {
      return acc;
    }

    const newAcc = [...acc];
    newAcc.push(...result.messages);

    return newAcc;
  }, []);

  cache[cacheKey] = messages;

  return messages;
}

async function getErrors(code, filePath) {
  const messages = await getESLintMessages(code, filePath);
  return messages.map(({ruleId, message}) => `(${ruleId}) ${message}`);
}

async function getViolatedRules(code, filePath) {
  const messages = await getESLintMessages(code, filePath);
  return messages.map(({ruleId}) => ruleId);
}

function ensureRuleInConfig(ruleId) {
  expect(() => {
    if (!Object.prototype.hasOwnProperty.call(eslintConfig.rules, opts.name)) {
      throw new Error(`Rule '${opts.name}' is not configured, probably a typo in test case`);
    }
  }).not.toThrow(/is not configured/);
}

beforeAll(async () => {
  eslintConfig = await eslint.calculateConfigForFile('index.js');
});

cases(
  'rules: OFF',
  (opts) => {
    // make sure we don't make typo in rule name
    ensureRuleInConfig(opts.name)

    // check if rules is marked as error rule
    expect(String(eslintConfig.rules[opts.name][0])).toMatch(/^(0|off)$/);
  },
  wrapInName([
   'jsx-a11y/anchor-is-valid',
   'jsx-a11y/click-events-have-key-events',
  ]),
);

cases(
  'rules: WARNING',
  (opts) => {
    // make sure we don't make typo in rule name
    ensureRuleInConfig(opts.name)

    // check if rules is marked as error rule
    expect(String(eslintConfig.rules[opts.name][0])).toMatch(/^(1|warn)$/);
  },
  wrapInName([
    // we want to warn before using console but using it has some legit use cases
    // so it shouldn't force developers to remmove it
   'no-console',
  ]),
);

cases(
  'rules: ERROR',
  (opts) => {
    // make sure we don't make typo in rule name
    ensureRuleInConfig(opts.name);

    // check if rules is marked as error rule
    expect(String(eslintConfig.rules[opts.name][0])).toMatch(/^(2|error)$/);
  },
  wrapInName([
   'prettier/prettier',
   'jsx-a11y/label-has-associated-control',
   'no-useless-catch',
   'no-void',
   'no-with',
  ]),
);

function failPassCases({ruleId, cases}) {
  return cases.map((el) => ({...el, ruleId}));
}

function failingCases({error, cases}) {
  return Object.entries(cases).map(([name, code]) => ({
    name: `fails: ${name}`,
    code,
    error,
  }))
}

function passingCases({cases}) {
  return Object.entries(cases).map(([name, code]) => ({
    name: `passes: ${name}`,
    code,
  }))
}

async function ruleCasesExpect(opts) {
  if (opts.error) {
    expect(await getErrors(opts.code)).toContain(`(${opts.ruleId}) ${opts.error}`)
    return;
  }

  expect(await getViolatedRules(opts.code)).not.toContain(opts.ruleId);

}

cases(
  'jsx-a11y/label-has-associated-control',
  ruleCasesExpect,
  failPassCases({
    ruleId: 'jsx-a11y/label-has-associated-control',
    cases: [
      ...failingCases({
        error: 'A form label must be associated with a control.',
        cases: {
          'no htmlFor on <label />': `
            export function Foo(props) {
              return <label {...props} />;
            }
          `
        }
      }),
      ...passingCases({
        cases: {
          'input inside label': `
            <label>
              <input type="text" />
              Surname
            </label>
          `,
          'using htmlFor + id': `
            <>
              <label htmlFor="surname">Surname</label>
              <input id="surname" type="text" />
            </>;
          `,
        }
      }),
    ],
  }),
);

cases(
  'no-useless-catch',
  ruleCasesExpect,
  failPassCases({
    ruleId: 'no-useless-catch',
    cases: [
      ...failingCases({
        error: 'Unnecessary try/catch wrapper.',
        cases: {
          'error re-throw': `
            try {
              doIt();
            } catch (e) {
              throw e;
            }
          `
        },
      }),
      ...passingCases({
        cases: {
          'correct catch': `
            try {
              doIt();
            } catch (e) {
              sendToSentry(e);
            }
          `,
        }
      }),
    ],
  }),
);


cases(
  'no-void',
  ruleCasesExpect,
  failPassCases({
    ruleId: 'no-void',
    cases: [
      ...failingCases({
        error: `Expected 'undefined' and instead saw 'void'.`,
        cases: {
          'using void 0 instead of undefined': `
            const x = void 0;
          `
        },
      }),
    ],
  }),
);
