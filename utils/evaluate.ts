import { TimeoutError } from "puppeteer";
import { spawnClicker } from "./click/realclick.js";
import { retryCall } from "./process.js";

export async function evaluateMicrophone(page) {
  try {
    await page.waitForSelector(".calling-disabled", {timeout: 3000});
    throw new Error("COULD NOT DETECT MICROPHONE: CHECK IF MICROPHONE IS CONNECTED");
  } catch(err) {
    if (err instanceof TimeoutError) {
      console.log("MICROPHONE DETECTED: PROCEEDING WITH AUTOMATION");
      return;
    }
    
    throw new Error(err);
  }
}

export async function evaluateCallButton(page, configs) {
  let {clickerCoordinates: {x, y}, clickerCount} = configs;

  if (!clickerCount) {
    throw new Error("UNABLE TO MAKE CALL BUTTON CLICKABLE: TRY DIFFERENT COORDINATES");
  }

  let stateObj = {
    condition: false,
  };
  
  await evaluateConsole(page, "micAccess", {state: stateObj});
  

  try {
    await page.waitForSelector("#newCall > span", {timeout: 3000});
    console.log("CALL BUTTON NOT ENABLED: SPAWNING CLICKER");
    await spawnClicker(x, y);
    
    if (stateObj.condition === false) { //this only gets executed when clicker spawned but wrong coords
      console.log("CALL BUTTON STILL NOT ENABLED: SPAWNING CLICKER");
      Object.assign(configs, {clickerCount: clickerCount - 1});
      await page.waitForTimeout(1500);
      await evaluateCallButton(page, configs);
    }
  } catch(err) { 
    if (err instanceof TimeoutError) {
      console.log("CALL BUTTON ENABLED");
      return;
    }
    
    throw new Error(err);
  }
}

export async function evaluateCallConnection(page, configs) {
  let {connectionCount} = configs;

  const callStatus = await page.evaluate(() => {
    return document.querySelector(".incall-status").innerText;
  });

  console.log(`CALL STUCK ON: ${callStatus}`);
  console.log(`FAILED TO CONNECT: ATTEMPT NO. ${connectionCount}`);

  if (callStatus === "Dialing") {
    console.log("WAITING 1 MINUTE BEFORE NEXT ATTEMPT");
    await retryCall(page, 60000, configs);
  } else if (callStatus === "Initializing...") {
    console.log("WAITING 3 MINUTES BEFORE NEXT ATTEMPT");
    await retryCall(page, 180000, configs);
  } else {
    throw new Error("UNABLE TO CONNECT");
  }
}

export async function evaluateConsole(page, method, {dtmf = [], state = {}}) {
  const service = {
    "dtmf": "phoneService - sending DTMF",
    "callEnd": "INFO - CallDetailsLog - CALL_DETAILS_CALL_ENDED: REMOTE_OTHER",
    "micAccess": "permissionService - handleMicrophoneAccessGranted()",
  }

  
  switch(method) {
    case "dtmf":
      page.on('console', (message) => {
        if (message.text().includes(service[method])) {
          dtmf.push(message.text().slice(-1));
        }
      })
      break;
    
    case "micAccess":
      page.once('console', (message) => { 
        if (message.text().includes(service[method])) {
          state.condition = true;
        }
      })
      break;
    
    case "callEnd":
      page.on('console', (message) => {
        if (message.text().includes(service[method])) {
          state.condition = true;
        }
      })
      break;
    
    case "off":
      page.off('console');
      break;
  }
}