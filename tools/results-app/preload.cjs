/** Narrow bridge between the app page and main.cjs — the page has no Node access. */
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const listener = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('results', {
  latest: () => ipcRenderer.invoke('results:latest'),
  history: () => ipcRenderer.invoke('results:history'),
  run: (id) => ipcRenderer.invoke('results:run', id),
  options: () => ipcRenderer.invoke('tests:options'),
  startRun: (opts) => ipcRenderer.invoke('tests:run', opts),
  stopRun: () => ipcRenderer.invoke('tests:stop'),
  runState: () => ipcRenderer.invoke('tests:state'),
  openPath: (p) => ipcRenderer.invoke('shell:open', p),
  showInFolder: (p) => ipcRenderer.invoke('shell:show', p),
  openHtmlReport: () => ipcRenderer.invoke('shell:report'),
  onUpdated: on('results:updated'),
  onRunState: on('run:state'),
  onRunOutput: on('run:output'),
});
