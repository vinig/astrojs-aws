import { AstroIntegration } from "astro"

import { Options } from "./exports"

export default function createIntegration(args?: Options): AstroIntegration {
  return {
    name: "@seikada/astrojs-aws-adapter",
    hooks: {
      "astro:config:done": ({ config, setAdapter }) => {
        if (config.output != "server") {
          throw new Error(
            '[@seikada/astrojs-aws-adapter] `output: "server"` is required to use this adapter',
          )
        }

        setAdapter({
          name: "@seikada/astrojs-aws-adapter",
          serverEntrypoint: "@seikada/astrojs-aws-adapter/exports",
          exports: ["handler"],
          // Options
          supportedAstroFeatures: {
            serverOutput: 'stable',
          },
          args,
        })
      },
    },
  }
}
