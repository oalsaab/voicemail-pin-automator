import * as dotenv from "dotenv";
dotenv.config();

import { readFileSync } from "fs";
import { configs } from "./configs/app-configs";
import { contextCall, attemptProcess } from "./utils/process";
import { launch } from "./utils/launch";

type Credentials = {
  username: string;
  password: string;
};

function readTxt(path: string): string[] {
  const txtArr: string[] = readFileSync(path, "utf-8").split(/\r?\n/);
  return txtArr.filter(
    (pin) => (/^\d+$/.test(pin) && pin.length === 4) || pin.length === 6
  );
}

async function main(): Promise<void> {
  const { pinsList, pinsAttempted } = configs;

  const username = process.env.TN_USER;
  const password = process.env.TN_PASS;

  if (username === undefined || password === undefined) {
    throw new Error("MUST PROVIDE USERNAME AND PASSWORD");
  }

  const credentials: Credentials = { username: username, password: password };

  const [pinsListArr, pinsAttemptedArr]: string[][] = [
    pinsList,
    pinsAttempted,
  ].map((path) => readTxt(path));
  const pins: string[] = pinsListArr.filter(
    (pin) => !pinsAttemptedArr.includes(pin)
  );

  if (!pins || !pins.length) {
    throw new Error("NO PINS LEFT TO TRY OR NO VALID PINS PROVIDED");
  }

  const { browser, page } = await launch(credentials);
  await contextCall(page);
  await attemptProcess(pins, browser, page);
}

main();
