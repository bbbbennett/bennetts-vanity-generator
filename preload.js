'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getCpuCount:  ()       => ipcRenderer.invoke('get-cpu-count'),
  startSearch:  (params) => ipcRenderer.invoke('start-search', params),
  stopSearch:   ()       => ipcRenderer.invoke('stop-search'),
  saveKeypair:  (data)   => ipcRenderer.invoke('save-keypair', data),
  onProgress: (cb) => ipcRenderer.on('search-progress', (_, d) => cb(d)),
  onFound:    (cb) => ipcRenderer.on('search-found',    (_, d) => cb(d)),
  removeListeners: () => {
    ipcRenderer.removeAllListeners('search-progress');
    ipcRenderer.removeAllListeners('search-found');
  }
});
