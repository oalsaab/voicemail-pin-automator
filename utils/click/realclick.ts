import { spawn } from 'child_process';

export async function spawnClicker(x, y) {
  return new Promise((resolve, reject) => {
    const args = ['clicker.py', x, y];
    const clicker = spawn('py', args, {cwd: 'utils/click'});
    clicker.on('close', (code) => { 
      resolve(code);
    });
    clicker.on('error', (err) => {
      reject(err);
    });
  });
}