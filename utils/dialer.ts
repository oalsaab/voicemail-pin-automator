import { ElementHandle, Page } from "puppeteer";

type Dialer = {
  [key: string]: ElementHandle;
};

export async function constructDialerKeypad(page: Page): Promise<Dialer> {
  const dialerKeypad: Dialer = {};
  const keys = "123456789*0#";

  await page.waitForSelector(".key");
  const keysHandleArray: ElementHandle<Element>[] = await page.$$(".key");

  for (let i = 0; i < keys.length; i++) {
    dialerKeypad[keys[i]] = keysHandleArray[i];
  }

  return dialerKeypad;
}