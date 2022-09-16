export async function constructDialerKeypad(page) {
  const dialerKeypad = {};
  const keys = "123456789*0#";
  
  await page.waitForSelector(".key");
  const keysHandleArray = await page.$$(".key");

  for (let i = 0; i < keys.length; i++) {
    dialerKeypad[keys[i]] = keysHandleArray[i];
  }
  
  return dialerKeypad;
}