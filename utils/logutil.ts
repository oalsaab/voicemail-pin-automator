import { createWriteStream } from "fs";

function logTime(): string {
  const date = new Date();
  const timeFormat: string[] = [
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((el) => String(el).padStart(2, "0"));
  return `[${timeFormat.join(":")}]`;
}

export async function logResult(
  pin: string,
  path: string,
  result: string
): Promise<void> {
  const timeFormat = logTime();
  const log = `${timeFormat} ${result} PIN: ${pin}`;
  const logger = createWriteStream(path, { flags: "a" });
  logger.write(`\n${log}`);
}

export async function logPin(pin: string, path: string): Promise<void> {
  const logger = createWriteStream(path, { flags: "a" });
  logger.write(`\n${pin}`);
}
