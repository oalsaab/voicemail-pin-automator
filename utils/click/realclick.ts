import { spawn } from 'child_process';

export async function spawnClicker(x: number, y: number) {
  return new Promise((resolve, reject) => {
    const args: string[] = ['clicker.py', x.toString(), y.toString()];
    const clicker = spawn('py', args, {cwd: 'utils/click'});
    clicker.on('close', (code) => { 
      resolve(code);
    });
    clicker.on('error', (err) => {
      reject(err);
    });
  });
}