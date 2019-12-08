require("dotenv").config();
const path = require("path");
const writeFileAsync = require("util").promisify(require("fs").writeFile);
const { graphql } = require("@octokit/graphql");
const got = require("got");
const ora = require("ora");
const makeDir = require("make-dir");
const delay = require("delay");
const filenamify = require("filenamify");

let tokens;
try { tokens = JSON.parse(process.env.GITHUB_TOKENS); } catch { tokens = [process.env.GITHUB_TOKEN]; }
const language = ["javascript", "typescript"][parseInt(process.env.PROGRAMMING_LANGUAGE, 10) || 0];
const ONLY_TOP_LEVEL = process.env.ONLY_TOP_LEVEL !== "false";

const stars = [
	{ from: 70, to: 71 },
	{ from: 72, to: 74 },
	{ from: 75, to: 77 },
	{ from: 78, to: 79 },
	{ from: 80, to: 82 },
	{ from: 83, to: 84 },
	{ from: 85, to: 87 },
	{ from: 88, to: 89 },
	{ from: 90, to: 92 },
	{ from: 93, to: 94 },
	{ from: 95, to: 97 },
	{ from: 98, to: 99 },
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
		const writeFile = ({ stargazers, owner, name }, filePath, packageJSON) => writeFileAsync(
			path.join(__dirname, `${language}_packages`,
				`${filenamify(stargazers.totalCount.toString())}📎${filenamify(owner.login)}📎${filenamify(name)}📎${filenamify(filePath)}`),
			JSON.stringify(packageJSON, null, 2),
		);
		const dontCareForTheseEntries = (filePath) => ["node_modules", "vendor", "example", "test", "doc", "sample", "demo"]
			.some((el) => filePath.toLowerCase().includes(el));
		let currentTokenIndex = 0;
		let gql = graphql.defaults({ headers: { authorization: `token ${tokens[currentTokenIndex]}` } });
		await makeDir(path.join(__dirname, `${language}_packages`));
		for (const range of stars) {
			ora().info(`stars ∈ [${range.from},${range.to}]`);
			let filesFound = 0;
			let endCursor;
			let canCheckNext = true;
			for (let i = 1; i < 11; i += 1) {
				const spinner = ora().start(`Checking page ${i}|${10}`);
				if (!canCheckNext) {
					spinner.stop();
					break;
				}
				const { search: { edges: repos, pageInfo: { endCursor: lastCursor, hasNextPage } } } = await gql(`
					query getRepos($queryString: String!, $after: String) {
						search(query: $queryString, type: REPOSITORY, first: 100, after: $after) {
							edges {
								node {
									... on Repository {
										owner {
											login
										}
										name
										defaultBranchRef {
											name
										}
										url
										stargazers {
											totalCount
										}
									}
								}
							}
							pageInfo {
								endCursor
								hasNextPage
							}
						}
					}`, { queryString: `language:${language} stars:${range.from}..${range.to} sort:stars`, after: endCursor || null });
				endCursor = lastCursor;
				canCheckNext = hasNextPage;
				const reposPromise = repos.map(async ({ node: repo }) => {
					const initialI = i;
					try {
						const listOfContents = [];
						if (!ONLY_TOP_LEVEL) {
							const { repository: { object: { entries } }, rateLimit: { remaining, resetAt } } = await gql(`
							query getTree($owner: String!, $name: String!, $expression: String!) {
								repository(owner: $owner, name: $name) {
									object(expression: $expression) {
										... on Tree {
											... treeFields
										}
									}
								}
								rateLimit {
									remaining
									resetAt
								}
							}
							fragment treeFields on Tree {
								entries {
									name
									object {
										... on Blob {
											text
										}
										...on Tree {
											entries {
												name
												object {
													... on Blob {
														text
													}
													... on Tree {
														entries {
															name
															object {
																... on Blob {
																	text
																}
																... on Tree {
																	entries {
																		name
																		object {
																			... on Blob {
																				text
																			}
																		}
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}`, { owner: repo.owner.login, name: repo.name, expression: `${repo.defaultBranchRef.name}:` });
							entries.forEach((top) => {
								if (!top.object.entries) {
									const filePath = top.name.toLowerCase();
									if (filePath.endsWith("package.json")) listOfContents.push({ path: filePath, content: top.object.text });
								} else {
									if (dontCareForTheseEntries(top.name)) return;
									top.object.entries.forEach((deep1) => {
										if (!deep1.object.entries) {
											const filePath = path.join(top.name, deep1.name).toLowerCase();
											if (filePath.endsWith("package.json")) {
												listOfContents.push({ path: filePath, content: deep1.object.text });
											}
										} else {
											if (dontCareForTheseEntries(deep1.name)) return;
											deep1.object.entries.forEach((deep2) => {
												if (!deep2.object.entries) {
													const filePath = path.join(top.name, deep1.name, deep2.name).toLowerCase();
													if (filePath.endsWith("package.json")) {
														listOfContents.push({ path: filePath, content: deep2.object.text });
													}
												} else {
													if (dontCareForTheseEntries(deep2.name)) return;
													deep2.object.entries.forEach((deep3) => {
														if (deep3.object.text) {
															const filePath = path.join(top.name, deep1.name, deep2.name, deep3.name).toLowerCase();
															if (filePath.endsWith("package.json")) {
																listOfContents.push({ path: filePath, content: deep3.object.text });
															}
														}
													});
												}
											});
										}
									});
								}
							});
							if (remaining === 0) throw Object({ status: 403, headers: { "x-ratelimit-reset": resetAt } });
						} else {
							const { repository: { object: { text: content } }, rateLimit: { remaining, resetAt } } = await gql(`
							query getContents($owner: String!, $name: String!, $expression: String!) {
								repository(owner: $owner, name: $name) {
									object(expression: $expression) {
										... on Blob {
											text
										}
									}
								}
								rateLimit {
									remaining
									resetAt
								}
							}`, { owner: repo.owner.login, name: repo.name, expression: `${repo.defaultBranchRef.name}:package.json` });
							listOfContents.push({ path: "package.json", content });
							if (remaining === 0) throw Object({ status: 403, headers: { "x-ratelimit-reset": resetAt } });
						}
						for (const file of listOfContents) {
							const { path: filePath, content } = file;
							try {
								const packageJSON = JSON.parse(content);
								if (!packageJSON.name && !packageJSON.private) continue;
								if (packageJSON.private || packageJSON.name.toLowerCase().includes("-cli")) {
									filesFound += 1;
									await writeFile(repo, filePath, packageJSON);
									continue;
								}
								const body = await got(`https://api.npms.io/v2/search/suggestions?q=${packageJSON.name}`).json();
								if (body.some(({ package: npmPkg }) => npmPkg.links.repository
									&& npmPkg.links.repository.toLowerCase() === repo.url.toLowerCase())) continue;
								filesFound += 1;
								await writeFile(repo, filePath, packageJSON);
							} catch { /** empty */ }
						}
					} catch (error) {
						if (error.status === 403 && initialI === i) {
							i -= 1;
							const reset = parseInt(error.headers["x-ratelimit-reset"], 10);
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
							spinner.start(`Checking page ${i + 1}|${10}`);
						}
					}
				});
				await Promise.all(reposPromise);
				spinner.stop();
			}
			ora().succeed(`Found ${filesFound} package.json files! 🎉`);
		}
		ora().succeed("Done! ✅");
	} catch (error) { ora().fail(error.message); }
})().then(() => process.exit(0));
