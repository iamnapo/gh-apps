import eslintConfigIamnapo from "eslint-config-iamnapo"; // eslint-disable-line import/no-extraneous-dependencies

const config = [
	...eslintConfigIamnapo.configs.default.map((cfg) => ({
		...cfg,
		files: [eslintConfigIamnapo.filePatterns.default],
	})),
	{
		rules: {
			"no-loop-func": "off",
			"import/no-unresolved": [
				"error",
				{
					ignore: ["@octokit/graphql", "got"],
				},
			],
		},
	},
	{ ignores: ["*_packages"] },
];

export default config;
