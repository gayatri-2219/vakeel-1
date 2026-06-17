const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Add safe IPC channels here if needed
  isDesktop: true
});
