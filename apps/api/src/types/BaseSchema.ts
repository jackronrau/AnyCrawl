import { z } from 'zod';
import { EngineType } from '@repo/scrape/src/managers/EngineQueue.js';

export const baseSchema = z.object({
    /**
     * The URL to be processed
     */
    url: z.string().url(),

    /**
     * The engine to be used
     */
    engine: z.custom<EngineType>(),
});

export type BaseSchema = z.infer<typeof baseSchema>; 