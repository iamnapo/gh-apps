require('dotenv').config();
const writeFileAsync = require('util').promisify(require('fs').writeFile);
const Octokit = require('@octokit/rest');
const ora = require('ora');
const delay = require('delay');

let tokens;
try { tokens = JSON.parse(process.env.GITHUB_TOKENS); } catch { tokens = [process.env.GITHUB_TOKEN]; }
const language = ['javascript', 'typescript'][parseInt(process.env.PROGRAMMING_LANGUAGE, 10) || 0];
const starLimit = parseInt(process.env.STAR_COUNT, 10) || 1000;

function resultToCSV(data = null, delim = ', ', linedelim = '\n') {
  const keys = Object.keys(data[0]);
  let result = keys.join(delim) + linedelim;

  data.forEach((item) => {
    let ctr = 0;
    keys.forEach((key) => {
      if (ctr > 0) result += delim;
      result += item[key];
      ctr += 1;
    });
    result += linedelim;
  });
  return result;
}

(async () => {
  try {
    let currentTokenIndex = 0;
    let octokit = new Octokit({ auth: `token ${tokens[currentTokenIndex]}` });
    let currentStar = 0;
    const results = [];
    const spinner = ora().start(`Checking count for ${currentStar} stars.`);
    for (const _ of new Array(3 * starLimit).keys()) { // eslint-disable-line no-unused-vars
      try {
        const { data: { total_count: count } } = await octokit.search.repos({
          q: `language:${language} stars:${currentStar}`,
          per_page: 1,
        });
        results.push({ stars: currentStar, repos: count });
        if (currentStar === starLimit) break;
        currentStar += 1;
        spinner.start(`Checking count for ${currentStar} stars.`);
      } catch (error) {
        if (error.status === 403) {
          const reset = parseInt(error.headers['x-ratelimit-reset'], 10);
          currentTokenIndex += 1;
          currentTokenIndex %= tokens.length;
          if (currentTokenIndex === 0) {
            spinner.warn(`Rate limit is reached. 😔 Will wait until ${new Date(reset * 1000).toLocaleTimeString()}.`);
            spinner.start('Waiting 🕒');
            await delay((reset + 1) * 1000 - Date.now());
            spinner.succeed('Waited! ✅');
          } else {
            spinner.warn(`Rate limit is reached. Switching to token ${currentTokenIndex + 1} of ${tokens.length}.`);
            octokit = new Octokit({ auth: `token ${tokens[currentTokenIndex]}` });
          }
          spinner.start(`Checking count for ${currentStar} stars.`);
          if (currentTokenIndex === 0) {
            await delay((reset + 1) * 1000 - Date.now());
          } else {
            octokit = new Octokit({ auth: `token ${tokens[currentTokenIndex]}` });
          }
        }
      }
    }
    await writeFileAsync(`${language}_repos_per_star.csv`, resultToCSV(results));
    spinner.succeed('Done!');
  } catch (error) { ora().fail(error.message); }
})().then(() => process.exit(0));