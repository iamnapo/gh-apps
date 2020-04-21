# gh-apps

> Code to extract package.json from popular JavaScript|TypeScript repositories that are not on npm.

[![build](https://img.shields.io/github/workflow/status/iamnapo/gh-apps/Install%20%26%20test?style=for-the-badge&logo=github&label=)](https://github.com/iamnapo/gh-apps/actions) [![license](https://img.shields.io/github/license/iamnapo/gh-apps.svg?style=for-the-badge)](./LICENSE)

## Usage

- Create a `.env` file containing the variables:

  - `GITHUB_TOKEN`<sup>1</sup>: your github API token.
  - `PROGRAMMING_LANGUAGE`: `'0'` for JavaScript, `'1'` for TypeScript. Defaults to `'0'`.
  - `ONLY_TOP_LEVEL`: `'false'` to fully traverse the git tree for `package.json` files. Defaults to `'true'`.
  - `STAR_COUNT`<sup>2</sup>: `'1000'` limit used for `npm run count-repos`. Defaults to `'0'`.
    <br/>

  > <sup>1</sup> If the script reaches [GitHub's rate limit](https://developer.github.com/v3/#rate-limiting), it will pause and resume when the limit resets. You can also use `GITHUB_TOKENS` to provide an array of tokens and the script will circle through them if the limit is reached.

- Install dependencies & run the script

  ```bash
  npm i
  npm start
  ```

> <sup>2</sup> You can also run `npm run count-repos` to create a csv containing the number of repositories for each star count. To set this limit, configure `STAR_COUNT`

## Dataset

- [dataset_top_level_only.zip](./dataset_top_level_only.zip) contains **12341** JavaScript and **1543** TypeScript package.json files from repos with `stars > 70`.
- [dataset_tree_traversal.zip](./dataset_tree_traversal.zip) contains **37702** JavaScript and **5188** TypeScript package.json files from repos with `stars > 70`.

> Filename format is: `<stars>📎<owner>📎<repo>📎[<path>]package.json`, where reserved characters (e.g. `/`) are converted to `!`.

- [dataset_count_repos.zip](./dataset_count_repos.zip) contains frequency of repos with `stars ∈ [0, 1000]`.

## License

MIT © [Napoleon-Christos Oikonomou](https://iamnapo.me)
