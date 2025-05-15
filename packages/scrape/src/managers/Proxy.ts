import { ProxyConfiguration, Dictionary } from "crawlee";
import { Request } from "crawlee";
import { log } from "@anycrawl/libs/log";

const proxyConfiguration = new ProxyConfiguration({
    newUrlFunction: (sessionId: string | number, options?: { request?: Request }) => {
        const requestInputProxy = options?.request?.userData?.options?.proxy ? options?.request?.userData?.options?.proxy : process.env.ANYCRAWL_PROXY_URL;
        if (!requestInputProxy) {
            return null;
        }
        log.info(`Using proxy ${requestInputProxy} for ${options?.request?.url}, provided by ${options?.request?.userData?.options?.proxy ? "user" : "system"}`)
        return requestInputProxy;
    }
});

export default proxyConfiguration;