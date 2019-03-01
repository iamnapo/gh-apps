require('dotenv').load();
const path = require('path');
const writeFile = require('util').promisify(require('fs').writeFile);
const Octokit = require('@octokit/rest');
const got = require('got');
const ora = require('ora');
const makeDir = require('make-dir');

const PAGES_TO_TEST = 10;

(async () => {
  const octokit = new Octokit({ auth: `token ${process.env.GITHUB_TOKEN}` });
  await makeDir(path.join(__dirname, 'data'));
  for (let i = 0; i < PAGES_TO_TEST; i += 1) {
    const spinner = ora().start(`Checking page ${i + 1}/${PAGES_TO_TEST}`);
    const { data: { resources: { core: { remaining, reset } } } } = await octokit.rateLimit.get({});
    if (remaining === 0) {
      spinner.fail(`Rate limit is reached 😔. Try again at ${new Date(reset * 1000).toLocaleString()}.`);
      return;
    }
    const { data: { items: repos } } = await octokit.search.repos({
      q: 'language:javascript sort:stars',
      per_page: 100,
      page: i + 1,
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
})();
