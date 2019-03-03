# gh-apps

> Code to extract package.json from popular JavaScript|TypeScript repositories that are not on npm

[![travis](https://img.shields.io/travis/com/iamnapo/gh-apps.svg?style=flat-square&logo=travis&label=)](https://travis-ci.com/iamnapo/gh-apps) [![license](https://img.shields.io/github/license/iamnapo/gh-apps.svg?style=flat-square)](https://github.com/iamnapo/gh-apps/blob/master/LICENSE)

## Usage

* Create a `.env` file containing the variables:

  * `GITHUB_TOKEN`: your github API token.
  * `LANGUAGE`: `'0'` for JavaScript, `'1'` for TypeScript. Defaults to `'0'`.
  * `ONLY_TOP_LEVEL`: `'false'` to fully traverse the git tree for `package.json` files. Defaults to `'true'`.

* Install dependencies & run the script

  ```bash
  npm i
  npm start
  ```

  > Note: If the script reaches [GitHub's rate limit](https://developer.github.com/v3/#rate-limiting), it will pause and resume when the limit resets.

## Dataset

* [dataset_top_level_only.zip](./dataset_top_level_only.zip) contains __3961__ JavaScript and __846__ TypeScript package.json files from repos with `stars > 70`.
* [dataset_tree_traversal.zip](./dataset_tree_traversal.zip) contains __2499__ TypeScript package.json files from repos with `stars > 70`.

## License

MIT © [Napoleon-Christos Oikonomou](https://iamnapo.me)
