import { BaseEngine, EngineOptions } from "./Base.js";
import { Dictionary, PlaywrightCrawler, PlaywrightCrawlingContext, RequestQueue } from "crawlee";

export class PlaywrightEngine extends BaseEngine {
    protected options: EngineOptions = {};
    protected engine: PlaywrightCrawler | null = null;
    protected queue: RequestQueue | undefined = undefined;
    protected isInitialized: boolean = false;
    protected customRequestHandler?: (context: PlaywrightCrawlingContext<Dictionary>) => Promise<void>;
    protected customFailedRequestHandler?: (params: PlaywrightCrawlingContext<Dictionary>) => void;

    constructor(options: EngineOptions = {}) {
        super(options);
        this.customRequestHandler = options.requestHandler;
        this.customFailedRequestHandler = options.failedRequestHandler;
    }

}