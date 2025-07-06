"use server";

import { getTogether } from "@/lib/get-together";
import { getIPAddress, getRateLimiter } from "@/lib/rate-limiter";
import dedent from "dedent";
import invariant from "tiny-invariant";
import { z } from "zod";
// import { zodToJsonSchema } from "zod-to-json-schema";

const schema = z.array(z.string());
// const jsonSchema = zodToJsonSchema(schema, { target: "openAi" });

const ratelimit = getRateLimiter();

export async function getSuggestions(
  imageUrl: string,
  userAPIKey: string | null,
) {
  invariant(typeof imageUrl === "string");

  if (ratelimit && !userAPIKey) {
    const ipAddress = await getIPAddress();

    const { success } = await ratelimit.limit(`${ipAddress}-suggestions`);
    if (!success) {
      return [];
    }
  }

  const together = getTogether(userAPIKey);

  const response = await together.chat.completions.create({
    model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    messages: [
      {
        role: "system",
        content: dedent`
        # General Instructions
          You will be shown an image that a user wants to edit using AI-powered prompting. Analyze the image and suggest exactly 3 simple, practical edits that would improve or meaningfully change the image. Each suggestion should be:

- Specific and actionable (not vague)
- Achievable with standard image editing AI
- Varied in type (e.g., lighting, objects, style, composition)

Please keep the suggestions short and concise, about 5-8 words each.

Format your response as valid JSON with this structure:
          [
            "specific description of edit 1",
            "specific description of edit 2",
            "specific description of edit 3"
          ]

Provide only the JSON response, no additional text.

# Additional Context

Here's some additional information about the image model that will be used to edit the image based on the prompt:

With FLUX.1 Kontext you can modify an input image via simple text instructions, enabling flexible and instant image editing - no need for finetuning or complex editing workflows. The core capabilities of the the FLUX.1 Kontext suite are:

- Character consistency: Preserve unique elements of an image, such as a reference character or object in a picture, across multiple scenes and environments.
- Local editing: Make targeted modifications of specific elements in an image without affecting the rest.
- Style Reference: Generate novel scenes while preserving unique styles from a reference image, directed by text prompts.
- Interactive Speed: Minimal latency for both image generation and editing.
- Iterate: modify step by step

Flux.1 Kontext allows you to iteratively add more instructions and build on previous edits, refining your creation step-by-step with minimal latency, while preserving image quality and character consistency.

# Final instructions.

ONLY RESPOND IN JSON. NOTHING ELSE.
          `,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
    // response_format: { type: "json_schema", schema: jsonSchema },
  });

  if (!response?.choices?.[0]?.message?.content) return [];

  const json = JSON.parse(response?.choices?.[0]?.message?.content);
  const result = schema.safeParse(json);

  if (result.error) return [];

  return result.data;
}
