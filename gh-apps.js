require('dotenv').load();
const path = require('path');
const writeFile = require('util').promisify(require('fs').writeFile);
const Octokit = require('@octokit/rest');
const got = require('got');
const ora = require('ora');
const makeDir = require('make-dir');
const delay = require('delay');

const language = ['javascript', 'typescript'][0];

const stars = [
  { from: 100, to: 104 },
  { from: 105, to: 109 },
  { from: 110, to: 114 },
  { from: 115, to: 119 },
  { from: 120, to: 124 },
  { from: 125, to: 129 },
  { from: 130, to: 134 },
  { from: 135, to: 139 },
  { from: 140, to: 144 },
  { from: 145, to: 149 },
  { from: 150, to: 159 },
  { from: 160, to: 169 },
  { from: 170, to: 179 },
  { from: 180, to: 189 },
  { from: 190, to: 199 },
  { from: 200, to: 209 },
  { from: 210, to: 219 },
  { from: 220, to: 239 },
  { from: 240, to: 259 },
  { from: 260, to: 279 },
  { from: 280, to: 299 },
  { from: 300, to: 319 },
  { from: 320, to: 339 },
  { from: 340, to: 359 },
  { from: 360, to: 379 },
  { from: 380, to: 399 },
  { from: 400, to: 419 },
  { from: 420, to: 439 },
  { from: 440, to: 459 },
  { from: 460, to: 479 },
  { from: 480, to: 499 },
  { from: 500, to: 519 },
  { from: 520, to: 539 },
  { from: 540, to: 559 },
  { from: 560, to: 579 },
  { from: 580, to: 599 },
  { from: 600, to: 699 },
  { from: 700, to: 799 },
  { from: 800, to: 899 },
  { from: 900, to: 999 },
  { from: 1000, to: 1249 },
  { from: 1250, to: 1499 },
  { from: 1500, to: 1999 },
  { from: 2000, to: 2999 },
  { from: 3000, to: 3999 },
  { from: 4000, to: 4999 },
  { from: 5000, to: 500000 },
];

(async () => {
  try {
    const octokit = new Octokit({ auth: `token ${process.env.GITHUB_TOKEN}` });
    await makeDir(path.join(__dirname, `data_${language}`));
    for (const range of stars) {
      ora().info(`stars ∈ [${range.from},${range.to}]`);
      let reposFound = 0;
      for (let i = 1; i < 11; i += 1) {
        const spinner = ora().start(`Checking page ${i}|${10}`);
        const { data: { resources: { core: { remaining, reset } } } } = await octokit.rateLimit.get({});
        if (remaining === 0) {
          spinner.warn(`Rate limit is reached. 😔 Will wait until ${new Date(reset * 1000).toLocaleTimeString()}.`);
          spinner.start('Waiting 🕒');
          await delay((reset + 1) * 1000 - Date.now());
          spinner.succeed();
          spinner.start(`Checking page ${i}/${10}`);
        }
        const { data: { items: repos } } = await octokit.search.repos({
          q: `language:${language} stars:${range.from}..${range.to} sort:stars`,
          per_page: 100,
          page: i,
        });
        if (repos.length === 0) {
          spinner.stop();
          break;
        }
        repos.forEach(async (repo) => {
          try {
            const { data: { content } } = await octokit.repos.getContents({
              owner: repo.owner.login,
              repo: repo.name,
              path: 'package.json',
            });
            const packageJSON = JSON.parse(Buffer.from(content, 'base64'));
            if (!packageJSON.name) return;
            if (packageJSON.private || packageJSON.name.includes('-cli')) {
              reposFound += 1;
              await writeFile(path.join(__dirname, `data_${language}`, `${repo.name}.json`), JSON.stringify(packageJSON, null, 2));
              return;
            }
            const { body } = await got(`https://www.npmjs.com/search/suggestions?q=${packageJSON.name}`, { json: true });
            const npmBestResult = body[0];
            if (npmBestResult && npmBestResult.links && npmBestResult.links.repository
              && npmBestResult.links.repository.toLowerCase() === repo.html_url.toLowerCase()) return;
            reposFound += 1;
            await writeFile(path.join(__dirname, `data_${language}`, `${repo.name}.json`), JSON.stringify(packageJSON, null, 2));
          } catch { /**/ }
        });
        spinner.stop();
      }
      ora().succeed(`Found ${reposFound} repos! 🎉`);
    }
    ora().succeed('Done! ✅');
  } catch (error) { ora().fail(error.message); }
})().then(() => process.exit(0));
