const { contextBridge, ipcRenderer } = require("electron");

// 使用 contextBridge 暴露 API 到渲染进程
contextBridge.exposeInMainWorld("electron", {
  // 从渲染进程发送加载文件请求到主进程
  loadFile: (filePath) => {
    ipcRenderer.send("load-file", filePath);
  },

  // 监听主进程发送的文件加载完成事件
  onFileLoaded: (callback) => {
    ipcRenderer.on("file-loaded", (event, result) => {
      callback(result);
    });
  },

  processExcel: (params) => ipcRenderer.invoke("process-excel", params),

  onAlertMessage: (callback) => ipcRenderer.on("window-alert", callback),

  getUserData: () => ipcRenderer.invoke("get-userdata"),
  updateUserData: (data) => ipcRenderer.invoke("update-userdata", data),
  showPayWindow: () => ipcRenderer.send("show-pay-window"),
});
