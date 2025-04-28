document.addEventListener("DOMContentLoaded", () => {
  const dropVadZone = document.getElementById("dropVadZone");
  const dropProcessZone = document.getElementById("dropProcessZone");
  const fileContent1 = document.getElementById("fileContent1");
  const fileContent2 = document.getElementById("fileContent2");
  const fileContent3 = document.getElementById("fileContent3");
  const fileContent4 = document.getElementById("fileContent4");

  const vadFileInput = document.getElementById("vadFileInput");
  const processFileInput = document.getElementById("processFileInput");

  const submitButton = document.getElementById("submit");

  // 虚拟地址库的监听
  dropVadZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropVadZone.style.borderColor = "#333";
  });

  dropVadZone.addEventListener("dragleave", () => {
    dropVadZone.style.borderColor = "#aaa";
  });

  dropVadZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropVadZone.style.borderColor = "#aaa";

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const filePath = files[0].path;
      console.log("File dropped:", filePath); // 用于调试
      dropVadZone.textContent = filePath;
      window.electron.loadFile(filePath);
    }
  });

  dropVadZone.addEventListener("click", () => {
    vadFileInput.click();
  });

  vadFileInput.addEventListener("change", () => {
    const files = vadFileInput.files;
    if (files.length > 0) {
      const filePath = files[0].path || URL.createObjectURL(files[0]);
      dropVadZone.textContent = filePath;
      window.electron.loadFile(filePath);
    }
  });

  // 待处理文件的监听
  dropProcessZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropProcessZone.style.borderColor = "#333";
  });

  dropProcessZone.addEventListener("dragleave", () => {
    dropProcessZone.style.borderColor = "#aaa";
  });

  dropProcessZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropProcessZone.style.borderColor = "#aaa";

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const filePath = files[0].path;
      console.log("File dropped:", filePath); // 用于调试
      dropProcessZone.textContent = filePath;
    }
  });

  dropProcessZone.addEventListener("click", () => {
    processFileInput.click();
  });

  processFileInput.addEventListener("change", () => {
    const files = processFileInput.files;
    if (files.length > 0) {
      const filePath = files[0].path || URL.createObjectURL(files[0]);
      dropProcessZone.textContent = filePath;
    }
  });

  // contextBridge相关
  window.electron.onFileLoaded((result) => {
    if (result.success) {
      alert("已加载虚拟地址库");
      fileContent1.textContent = result.content1.join("\n");
      fileContent2.textContent = result.content2.join("\n");
      fileContent3.textContent = result.content3.join("\n");
      fileContent4.textContent = result.content4.join("\n");
    } else {
      // alert(`加载虚拟地址库失败:${result.error}`);
      fileContent1.textContent = `Error loading file: ${result.error}`;
      dropVadZone.textContent = "虚拟地址库文件丢到这里";
    }
  });

  // 监听来自主进程的消息
  window.electron.onAlertMessage((event, message) => {
    alert(message); // 显示弹窗
  });

  async function loadUserData() {
    const data = await window.electron.getUserData();
    document.getElementById("click-count").innerText = data.clickCount;
  }

  async function updateClickCount() {
    const data = await window.electron.getUserData();
    data.clickCount += 1;

    if (data.clickCount >= 10) {
      alert("软件好用吗，不如支持一下作者吧!");
      window.electron.showPayWindow(); // 触发主进程创建图像窗口
      data.clickCount = 0; // 重置计数
    }

    await window.electron.updateUserData(data);
    document.getElementById("click-count").innerText = data.clickCount;
  }

  submitButton.addEventListener("click", updateClickCount);

  // 初次加载数据
  loadUserData();
});
