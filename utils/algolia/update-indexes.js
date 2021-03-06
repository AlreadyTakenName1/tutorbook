const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const client = require('algoliasearch')(
  process.env.ALGOLIA_SEARCH_ID,
  process.env.ALGOLIA_SEARCH_KEY
);
const to = require('await-to-js').default;
const parse = require('csv-parse/lib/sync');
const fs = require('fs');

const subjects = async (id) => {
  const index = client.initIndex(id);
  index.setSettings({
    attributesForFaceting: ['filterOnly(grades)', 'filterOnly(name)'],
  });
  const subjects = parse(fs.readFileSync(`./${id}.csv`), {
    columns: true,
    skip_empty_lines: true,
  })
    .map((subject) => {
      subject.grades = (subject.grades || '').split(', ');
      return subject;
    })
    .filter((subject) => !!subject.name);
  const [err, res] = await to(
    index.saveObjects(subjects, {
      autoGenerateObjectIDIfNotExist: true,
    })
  );
  if (err) {
    console.error(`[ERROR] While saving ${id}:`, err);
    debugger;
  }
};

const langs = async () => {
  const index = client.initIndex('langs');
  const langs = parse(fs.readFileSync(`./langs.csv`), {
    columns: true,
    skip_empty_lines: true,
  })
    .filter((lang) => !!lang.code)
    .map((lang) => {
      const res = { objectID: lang.code };
      delete lang.code;
      for (const [key, val] of Object.entries(lang)) {
        const name = val.split(', ')[0];
        const synonyms = val.split(', ').filter((n) => n !== name);
        res[key] = { name, synonyms };
      }
      return res;
    });
  const [err, res] = await to(index.saveObjects(langs));
  if (err) {
    console.error('[ERROR] While saving langs:', err);
    debugger;
  }
};

subjects('mentoring');
subjects('tutoring');
