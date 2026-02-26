'use strict';
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { Worker } = require('worker_threads');
const path = require('path');
const os   = require('os');
const fs   = require('fs');

let mainWindow = null;
let workers    = [];
let totalAttempts = 0;
let startTime     = null;
let foundOne      = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 860,
    height: 740,
    minWidth: 680,
    minHeight: 580,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function stopAllWorkers() {
  workers.forEach(w => {
    try { w.postMessage('stop'); } catch {}
    try { w.terminate();        } catch {}
  });
  workers = [];
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopAllWorkers();
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('get-cpu-count', () => os.cpus().length);

ipcMain.handle('start-search', (event, { prefix, suffix, caseSensitive, threadCount }) => {
  stopAllWorkers();
  totalAttempts = 0;
  startTime     = Date.now();
  foundOne      = false;

  const workerPath = path.join(__dirname, 'worker.js');

  for (let i = 0; i < threadCount; i++) {
    const w = new Worker(workerPath, { workerData: { prefix, suffix, caseSensitive } });

    w.on('message', msg => {
      if (msg.type === 'progress') {
        totalAttempts += msg.batch;
        const elapsed = (Date.now() - startTime) / 1000;
        const rate    = elapsed > 0.1 ? Math.round(totalAttempts / elapsed) : 0;
        mainWindow?.webContents.send('search-progress', { attempts: totalAttempts, rate });

      } else if (msg.type === 'found' && !foundOne) {
        foundOne = true;
        stopAllWorkers();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        mainWindow?.webContents.send('search-found', {
          address:   msg.address,
          secretKey: msg.secretKey,
          attempts:  totalAttempts,
          elapsed
        });
      }
    });

    w.on('error', err => console.error('Worker error:', err));
    workers.push(w);
  }
});

ipcMain.handle('stop-search', () => stopAllWorkers());

ipcMain.handle('save-keypair', async (event, { address, secretKey }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title:       'Save Keypair',
    defaultPath: `keypair-${address.slice(0, 8)}.json`,
    filters:     [{ name: 'JSON Files', extensions: ['json'] }]
  });
  if (!filePath) return { saved: false };
  fs.writeFileSync(filePath, JSON.stringify(secretKey));
  return { saved: true };
});
