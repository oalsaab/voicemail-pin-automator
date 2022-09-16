import puppeteer from 'puppeteer';
import { addExtra } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

async function launchBrowser() {
  const pptr = addExtra(puppeteer);
  pptr.use(StealthPlugin());

  return (await pptr.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--disable-notifications'],
  }));
}

async function setContext(browser) {
  const browserContext = browser.defaultBrowserContext();
  await browserContext.overridePermissions("https://www.textnow.com", ["microphone"]);
}

async function launchTextnow(browser) {
  const page = await browser.newPage();
  const response = await page.goto("https://www.textnow.com/login", { waitUntil: "networkidle0" });

  if (response.status() !== 200) {
    throw new Error(`FAILED TO CONNECT TO TEXTNOW - STATUS CODE: ${response.status()}`);
  }

  console.log("SUCCESSFUL CONNECTION TO TEXTNOW");
  return page; 
}

async function loginTextnow(page, credentials) {
  const {username, password} = credentials;

  await Promise.all([page.waitForSelector("#txt-username"), page.waitForSelector("#txt-password"), page.waitForSelector(".uikit-checkbox__label")])

  await page.type("#txt-username", username); 
  await page.type("#txt-password", password);
  await page.click(".uikit-checkbox__label", {delay: 2000});

  try {
    await Promise.all([page.click("#btn-login"), page.waitForNavigation({ waitUntil: "networkidle0" })]);
    console.log("LOGIN SUCCESSFUL");
  } catch(err) {
    if (err instanceof puppeteer.TimeoutError) {
      throw new Error("LOGIN FAILED: CHECK CREDENTIALS");
    } 
    
    throw new Error(err);
  }
}

export async function launch(credentials) {
  const browser = await launchBrowser();
  await setContext(browser);
  const page = await launchTextnow(browser);
  await loginTextnow(page, credentials);

  return {browser, page};
}