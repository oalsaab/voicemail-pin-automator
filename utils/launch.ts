import puppeteer, {
  Browser,
  BrowserContext,
  HTTPResponse,
  Page,
  TimeoutError,
} from "puppeteer";
import { addExtra } from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

type Credentials = {
  username: string;
  password: string;
};

async function launchBrowser(): Promise<Browser> {
  const pptr = addExtra(puppeteer);
  pptr.use(StealthPlugin());

  return await pptr.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized", "--disable-notifications"],
  });
}

async function setContext(browser: Browser): Promise<void> {
  const browserContext: BrowserContext = browser.defaultBrowserContext();
  await browserContext.overridePermissions("https://www.textnow.com", [
    "microphone",
  ]);
}

async function launchTextnow(browser: Browser): Promise<Page> {
  const page: Page = await browser.newPage();
  const response: HTTPResponse | null = await page.goto(
    "https://www.textnow.com/login",
    { waitUntil: "networkidle0" }
  );

  if (response === null) {
    throw new Error("FAILED TO CONNECT TO TEXTNOW");
  } else if (response.status() !== 200) {
    throw new Error(
      `FAILED TO CONNECT TO TEXTNOW - STATUS CODE: ${response.status()}`
    );
  }

  console.log("SUCCESSFUL CONNECTION TO TEXTNOW");
  return page;
}

async function loginTextnow(
  page: Page,
  credentials: Credentials
): Promise<void> {
  const { username, password } = credentials;

  await Promise.all([
    page.waitForSelector("#txt-username"),
    page.waitForSelector("#txt-password"),
    page.waitForSelector(".uikit-checkbox__label"),
  ]);

  await page.type("#txt-username", username);
  await page.type("#txt-password", password);
  await page.click(".uikit-checkbox__label", { delay: 2000 });

  try {
    await Promise.all([
      page.click("#btn-login"),
      page.waitForNavigation({ waitUntil: "networkidle0" }),
    ]);
    console.log("LOGIN SUCCESSFUL");
  } catch (err: unknown) {
    if (err instanceof TimeoutError) {
      throw new Error("LOGIN FAILED: CHECK CREDENTIALS");
    }

    throw new Error(String(err));
  }
}

export async function launch(
  credentials: Credentials
): Promise<{ browser: Browser; page: Page }> {
  const browser = await launchBrowser();
  await setContext(browser);
  const page = await launchTextnow(browser);
  await loginTextnow(page, credentials);

  return { browser, page };
}
