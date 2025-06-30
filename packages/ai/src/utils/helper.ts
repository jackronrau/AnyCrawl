import { modelsConfig } from './models-config.js';
import { loadAIConfig } from './config.js';
import { ConfigModelDetail } from './types.js';

const aiConfig = loadAIConfig();

/**
 * Check if the config is loaded from the config file
 * @returns The config is loaded from the config file
 */
const whereLoadFrom = () => {
    if (process.env.ANYCRAWL_AI_CONFIG_PATH) {
        return 'config';
    }
    return 'env';
}

/**
 * Get the available models
 * @returns The available models
 */
const getAvailableModels = () => {
    const modelOptions: {
        value: string;
        label: string;
    }[] = [];
    if (whereLoadFrom() === 'config') {
        Object.entries(aiConfig.modelMapping).forEach(([key, model]) => {
            const modelId: string = getEnabledModelIdByModelKey(key);
            modelOptions.push({
                value: modelId,
                label: (model as ConfigModelDetail).displayName,
            });
        });
    } else {
        const defaultModel = process.env.DEFAULT_LLM_MODEL;
        if (!defaultModel) {
            throw new Error('DEFAULT_LLM_MODEL is not set');
        }
        const detailConfig = modelsConfig[defaultModel as keyof typeof modelsConfig];
        if (!detailConfig) {
            throw new Error('DEFAULT_LLM_MODEL is not set');
        }
        modelOptions.push({
            value: defaultModel,
            label: (detailConfig as any)?.displayName ?? defaultModel,
        });
    }
    return modelOptions;
}

/**
 * Get the enabled provider models
 * @returns The enabled provider models
 */
const getEnabledProviderModels = () => {
    const enabledModels: {
        modelName: string;
        displayName: string;
        provider: string;
        modelId: string;
    }[] = [];

    if (whereLoadFrom() === 'config') {
        Object.entries(aiConfig.modelMapping).forEach(([modelName, model]) => {
            const modelDetail = model as ConfigModelDetail;
            for (const provider of modelDetail.providers) {
                if (aiConfig.providers[provider.provider]?.enabled) {
                    enabledModels.push({
                        modelName,
                        displayName: modelDetail.displayName,
                        provider: provider.provider,
                        modelId: provider.modelId
                    });
                }
            }
        });
    } else {
        const defaultModel = process.env.DEFAULT_LLM_MODEL;
        if (defaultModel) {
            const detailConfig = modelsConfig[defaultModel as keyof typeof modelsConfig];
            if (detailConfig) {
                enabledModels.push({
                    modelName: defaultModel,
                    displayName: (detailConfig as any)?.displayName ?? defaultModel,
                    provider: 'env',
                    modelId: defaultModel
                });
            }
        }
    }

    return enabledModels;
}

/**
 * Get the enabled model id by model key (such as gpt-4o)
 * @param modelKey - The model key to get the enabled model id for
 * @returns The enabled model id
 */
const getEnabledModelIdByModelKey = (modelKey: string): string => {
    if (whereLoadFrom() === 'config') {
        const model = aiConfig.modelMapping[modelKey];
        if (model) {
            for (const provider of (model as ConfigModelDetail).providers) {
                if (aiConfig.providers[provider.provider]?.enabled) {
                    return `${provider.provider}/${provider.modelId}`;
                }
            }
        }
    }
    throw new Error(`Model ${modelKey} is not found`);
}

/**
 * Get the default llm model id
 * @returns The default llm model id
 */
const getDefaultLLModelId = (): string => {
    if (whereLoadFrom() === 'config') {
        // check if defaults has config
        if (aiConfig.defaults?.DEFAULT_LLM_MODEL) {
            const res = getEnabledModelIdByModelKey(aiConfig.defaults.DEFAULT_LLM_MODEL);
            if (res) {
                return res;
            }
        }
        throw new Error('DEFAULT_LLM_MODEL is not set in config');
    }
    return process.env.DEFAULT_LLM_MODEL ?? 'openai/gpt-4o';
}

/**
 * Get the model id for extraction scene, if not set, use the default llm model
 * @returns The model id for extraction scene
 */
const getExtractModelId = () => {
    if (whereLoadFrom() === 'config') {
        if (aiConfig.defaults?.DEFAULT_EXTRACT_MODEL) {
            const res: string = getEnabledModelIdByModelKey(aiConfig.defaults.DEFAULT_EXTRACT_MODEL);
            if (res) {
                return res;
            }
            return getDefaultLLModelId();
        }
    } else {
        return getDefaultLLModelId();
    }
}

export { aiConfig, modelsConfig, getEnabledModelIdByModelKey, getAvailableModels, getDefaultLLModelId, getEnabledProviderModels, getExtractModelId };
