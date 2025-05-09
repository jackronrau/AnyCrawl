import { log } from "crawlee";

class ConsoleStream {
  write(line: string) {
    log.info(`\x1b[33mAPI: ${line}\x1b[0m`);
  }

  error(line: string) {
    log.error(`\x1b[31mAPI: ${line}\x1b[0m`);
  }
}
export { log, ConsoleStream };
