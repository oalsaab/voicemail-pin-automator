import * as dotenv from 'dotenv';
dotenv.config();

import { readFileSync } from 'fs';

import { configs } from "./configs/configs.js";
import { attemptProcess }  from "./utils/process.js";
import { launch } from "./utils/launch.js";

function readTxt(txt) {
  const txtArr = readFileSync(txt, 'utf-8').split(/\r?\n/);
  return txtArr.filter(pin => (/^\d+$/.test(pin)) && (pin.length === 4) || (pin.length === 6));
}

async function main() {
  const {pinsList, pinsAttempted} = configs;
  const credentials = {username: process.env.TN_USER, password: process.env.TN_PASS};
  
  const [pinsListArr, pinsAttemptedArr] = [pinsList, pinsAttempted].map(txt => readTxt(txt));
  const pins = pinsListArr.filter(pin => !pinsAttemptedArr.includes(pin));
  
  const {browser, page} = await launch(credentials);
  await attemptProcess(configs, pins, browser, page);
}

main();