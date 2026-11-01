import { createClient } from "@sanity/client";
import { env } from "./env.js";

export const sanityClient = createClient({
  projectId: env.SANITY_PROJECT_ID,
  dataset: env.SANITY_DATASET,
  apiVersion: env.SANITY_API_VERSION,
  token: env.SANITY_READ_TOKEN,
  useCdn: !env.SANITY_READ_TOKEN
});

