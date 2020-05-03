require("dotenv").config();
const { writeFile } = require("fs").promises;
const { graphql } = require("@octokit/graphql");
const ora = require("ora");
const delay = require("delay");

let tokens;
try { tokens = JSON.parse(process.env.GITHUB_TOKENS); } catch { tokens = [process.env.GITHUB_TOKEN]; }
const language = ["javascript", "typescript"][Number.parseInt(process.env.PROGRAMMING_LANGUAGE, 10) || 0];
const starLimit = Number.parseInt(process.env.STAR_COUNT, 10) || 1000;

function resultToCSV(data = null, delim = ", ", linedelim = "\n") {
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
		let gql = graphql.defaults({ headers: { authorization: `token ${tokens[currentTokenIndex]}` } });
		let currentStar = 0;
		const results = [];
		const spinner = ora().start(`Checking count for ${currentStar} stars.`);
		for (let _ = 0; _ < 3 * starLimit; _ += 1) {
			try {
				const { search: { repositoryCount: count } } = await gql(`query getRepoCount($queryString: String!) {
          search(query: $queryString, type: REPOSITORY, first: 1) {
            repositoryCount
          }
        }`, { queryString: `language:${language} stars:${currentStar}` });
				results.push({ stars: currentStar, repos: count });
				if (currentStar === starLimit) break;
				currentStar += 1;
				spinner.start(`Checking count for ${currentStar} stars.`);
			} catch (error) {
				if (error.status === 403) {
					const reset = Number.parseInt(error.headers["x-ratelimit-reset"], 10);
					currentTokenIndex += 1;
					currentTokenIndex %= tokens.length;
					if (currentTokenIndex === 0) {
						spinner.warn(`Rate limit is reached. 😔 Will wait until ${new Date(reset * 1000).toLocaleTimeString()}.`);
						spinner.start("Waiting 🕒");
						await delay((reset + 1) * 1000 - Date.now());
						spinner.succeed("Waited! ✅");
					} else {
						spinner.warn(`Rate limit is reached. Switching to token ${currentTokenIndex + 1} of ${tokens.length}.`);
						gql = graphql.defaults({ headers: { authorization: `token ${tokens[currentTokenIndex]}` } });
					}
					spinner.start(`Checking count for ${currentStar} stars.`);
					if (currentTokenIndex === 0) {
						await delay((reset + 1) * 1000 - Date.now());
					} else {
						gql = graphql.defaults({ headers: { authorization: `token ${tokens[currentTokenIndex]}` } });
					}
				}
			}
		}
		await writeFile(`${language}_repos_per_star.csv`, resultToCSV(results));
		spinner.succeed("Done!");
	} catch (error) { ora().fail(error.message); }
})().then(() => process.exit(0)); // eslint-disable-line unicorn/no-process-exit
