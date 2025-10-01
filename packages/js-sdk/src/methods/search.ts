import type { AxiosInstance, AxiosResponse } from 'axios';
import type { ApiResponse, SearchRequest, SearchResult, SearchResponse } from '../types.js';
import { omitUndefined, buildSearchScrapeOptions } from '../utils/index.js';

export async function search(client: AxiosInstance, input: SearchRequest): Promise<SearchResponse> {
    const body: any = { query: input.query };
    if (input.engine != null) body.engine = input.engine;
    if (input.limit != null) body.limit = input.limit;
    if (input.offset != null) body.offset = input.offset;
    if (input.pages != null) body.pages = input.pages;
    if (input.lang != null) body.lang = input.lang;
    if (input.country != null) body.country = input.country;
    const scrapeOptions = buildSearchScrapeOptions(input.scrape_options);
    if (scrapeOptions && Object.keys(scrapeOptions).length > 0) body.scrape_options = scrapeOptions;
    if (input.safeSearch != null) body.safeSearch = input.safeSearch;
    const response: AxiosResponse<ApiResponse<SearchResult[]>> = await client.post('/v1/search', body);
    if (!response.data.success) throw new Error(response.data.error || 'Search failed');
    return {
        results: response.data.data,
        totalResults: response.data.totalResults,
    };
}
