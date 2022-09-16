import { appendFile } from 'fs/promises';

function logTime() {
  const date = new Date();
  const timeFormat = [date.getHours(), date.getMinutes(), date.getSeconds()].map((el) => String(el).padStart(2, '0'));
  return `[${timeFormat.join(':')}]`;
}

export async function logAttempt(pin, configs, result) {
  const timeFormat = logTime();
  const {pinsLog, pinsAttempted} = configs;

  await appendFile(pinsLog, `${timeFormat} ${result} PIN: ${pin}\n`, (err) => {
      if (err) throw err; 
  }); 

  await appendFile(pinsAttempted, `${pin}\n`, (err) => { 
      if (err) throw err;
  });
}