import { z } from "zod";
import { AVAILABLE_ENGINES } from "@repo/scrape/managers/EngineQueue";

export const baseSchema = z.object({
  /**
   * The URL to be processed
   */
  url: z.string().url(),

  /**
   * The engine to be used
   */
  engine: z.enum(AVAILABLE_ENGINES),
});

export type BaseSchema = z.infer<typeof baseSchema>;
