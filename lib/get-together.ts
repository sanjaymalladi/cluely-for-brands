import Together from "together-ai";

export function getTogether(userAPIKey: string | null) {
  const options: ConstructorParameters<typeof Together>[0] = {};

  if (process.env.HELICONE_API_KEY) {
    options.baseURL = "https://together.helicone.ai/v1";
    options.defaultHeaders = {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-BYOK": userAPIKey ? "true" : "false",
      "Helicone-Property-appname": "EasyEdit",
      "Helicone-Property-environment":
        process.env.VERCEL_ENV === "production" ? "prod" : "dev",
    };
  }

  if (userAPIKey) {
    options.apiKey = userAPIKey;
  }

  const together = new Together(options);

  return together;
}
