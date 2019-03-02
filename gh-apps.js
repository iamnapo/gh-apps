require('dotenv').load();
const path = require('path');
const writeFile = require('util').promisify(require('fs').writeFile);
const Octokit = require('@octokit/rest');
const got = require('got');
const ora = require('ora');
const makeDir = require('make-dir');
const delay = require('delay');

const FROM_PAGE = parseInt(process.env.FROM_PAGE, 10) || 1;
const TO_PAGE = parseInt(process.env.TO_PAGE, 10) || 10;

(async () => {
  const octokit = new Octokit({ auth: `token ${process.env.GITHUB_TOKEN}` });
  await makeDir(path.join(__dirname, 'data'));
  for (let i = FROM_PAGE; i < TO_PAGE + 1; i += 1) {
    const spinner = ora().start(`Checking page ${i}/${TO_PAGE}`);
    const { data: { resources: { core: { remaining, reset } } } } = await octokit.rateLimit.get({});
    if (remaining === 0) {
      spinner.warn(`Rate limit is reached 😔. Will wait until ${new Date(reset * 1000).toLocaleString()}.`);
      spinner.start('Waiting 🕒');
      await delay((reset + 1) * 1000 - Date.now());
      spinner.succeed();
      spinner.start(`Checking page ${i}/${TO_PAGE}`);
    }
    const { data: { items: repos } } = await octokit.search.repos({
      q: 'language:javascript sort:stars',
      per_page: 100,
      page: i,
    });
    repos.forEach(async (repo) => {
      try {
        const { data: { content } } = await octokit.repos.getContents({
          owner: repo.owner.login,
          repo: repo.name,
          path: 'package.json',
        });
        const packageJSON = JSON.parse(Buffer.from(content, 'base64'));
        if (packageJSON.private || !packageJSON.name) return;
        const { body } = await got(`https://www.npmjs.com/search/suggestions?q=${packageJSON.name}`, { json: true });
        const npmBestResult = body[0];
        if (npmBestResult && npmBestResult.links.repository && repo.html_url === npmBestResult.links.repository) return;
        await writeFile(path.join(__dirname, 'data', `${repo.name}.json`), JSON.stringify(packageJSON, null, 2));
      } catch { /**/ }
    });
    spinner.succeed();
  }
  ora().succeed('Done! 🎉');
})().then(() => process.exit(0));
