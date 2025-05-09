import { z } from "zod";
import { SearchLocale } from "@repo/search/engines/types";
import { AVAILABLE_SEARCH_ENGINES } from "@repo/search/SearchService";

const searchSchema = z.object({
  engine: z.enum(AVAILABLE_SEARCH_ENGINES),
  query: z.string(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  pages: z.number().optional(),
  lang: z.custom<SearchLocale>().optional(),
  country: z.custom<SearchLocale>().optional(),
});

export type SearchSchema = z.infer<typeof searchSchema>;
export { searchSchema };
