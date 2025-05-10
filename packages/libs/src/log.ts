import { log } from "crawlee";

class ConsoleStream {
    write(line: string) {
        log.info(`\x1b[33mAPI:\x1b[0m ${line}`);
    }

    error(line: string) {
        log.error(`\x1b[31mAPI:\x1b[0m ${line}`);
    }
}
export { log, ConsoleStream };
