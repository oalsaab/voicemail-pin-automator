import { Page, TimeoutError } from "puppeteer";
import { spawnClicker } from "./click/realclick";
import { retryCall } from "./process";
import { configs } from "../configs/app-configs"

type Method = "dtmf" | "micAccess" | "callEnd" | "off";

type ConsoleResult = {
  dtmf?: string[];
  state?: { condition: boolean };
};

export async function evaluateMicrophone(page: Page): Promise<void> {
  try {
    await page.waitForSelector(".calling-disabled", { timeout: 3000 });
  } catch (err: unknown) {
    if (err instanceof TimeoutError) {
      console.log("MICROPHONE DETECTED: PROCEEDING WITH AUTOMATION");
      return;
    }
    throw new Error(
      "COULD NOT DETECT MICROPHONE: CHECK IF MICROPHONE IS CONNECTED"
    );
  }
}

export async function evaluateCallButton(page: Page): Promise<void> {
  let {
    clickerCoordinates: { x, y },
    clickerCount,
  } = configs;

  if (!clickerCount) {
    throw new Error(
      "UNABLE TO MAKE CALL BUTTON CLICKABLE: TRY DIFFERENT COORDINATES"
    );
  }

  const stateObj = {
    condition: false,
  };

  await evaluateConsole(page, "micAccess", { state: stateObj });

  try {
    await page.waitForSelector("#newCall > span", { timeout: 3000 });
    console.log("CALL BUTTON NOT ENABLED: SPAWNING CLICKER");
  } catch (err: unknown) {
    if (err instanceof TimeoutError) {
      console.log("CALL BUTTON ENABLED");
      return;
    }

    throw new Error(String(err));
  }

  await spawnClicker(x, y);

  if (stateObj.condition === false) {
    //this only gets executed when clicker spawned but wrong coords
    console.log("CALL BUTTON STILL NOT ENABLED: SPAWNING CLICKER");
    Object.assign(configs, { clickerCount: clickerCount - 1 });
    await page.waitForTimeout(1500);
    await evaluateCallButton(page);
  }
}

export async function evaluateCallConnection(page: Page): Promise<void> {
  let { connectionCount } = configs;

  const callStatus: string = await page.evaluate(() => {
    return (document.querySelector(".incall-status") as HTMLElement).innerText;
  });

  console.log("CALL STUCK ON:", callStatus);
  console.log("FAILED TO CONNECT - ATTEMPT NO:", connectionCount);

  if (callStatus === "Dialing") {
    console.log("WAITING 1 MINUTE BEFORE NEXT ATTEMPT");
    await retryCall(page, 60000);
  } else if (callStatus === "Initializing...") {
    console.log("WAITING 3 MINUTES BEFORE NEXT ATTEMPT");
    await retryCall(page, 180000);
  } else {
    throw new Error("UNABLE TO CONNECT");
  }
}

export async function evaluateConsole(
  page: Page,
  method: Method,
  { dtmf = [], state = { condition: false } }: ConsoleResult
): Promise<void> {
  const service = {
    dtmf: "phoneService - sending DTMF",
    callEnd: "INFO - CallDetailsLog - CALL_DETAILS_CALL_ENDED: REMOTE_OTHER",
    micAccess: "permissionService - handleMicrophoneAccessGranted()",
  };

  switch (method) {
    case "dtmf":
      page.on("console", (message) => {
        if (message.text().includes(service[method])) {
          dtmf.push(message.text().slice(-1));
        }
      });
      break;

    case "micAccess":
      page.once("console", (message) => {
        if (message.text().includes(service[method])) {
          state.condition = true;
        }
      });
      break;

    case "callEnd":
      page.on("console", (message) => {
        if (message.text().includes(service[method])) {
          state.condition = true;
        }
      });
      break;

    case "off":
      page.off("console", () => {
        return;
      });
      break;
  }
}