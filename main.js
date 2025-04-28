const {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  Menu,
  MenuItem,
  dialog,
} = require("electron");
const path = require("node:path");
const fs = require("fs");
const os = require("os");
const nodeXlsx = require("node-xlsx");

function createPayWindow() {
  const imageWindow = new BrowserWindow({
    width: 600,
    height: 400,
    modal: true,
    frame: false, // 无边框
    titleBarStyle: "hidden", // 隐藏标题栏
    parent: BrowserWindow.getFocusedWindow(), // 设置父窗口
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  imageWindow.loadFile("pay.html");
}

const createWindow = () => {
  const win = new BrowserWindow({
    center: true,
    width: 400,
    height: 400,
    icon: path.join(__dirname, "icon.png"),
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  win.loadFile("index.html");

  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "退出软件",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "About",
      submenu: [
        {
          label: "关于本软件",
          click: () => {
            dialog.showMessageBox(win, {
              type: "info",
              title: "About VAT",
              message: "VAT Version 0.5\n\n1.新版匹配逻辑",
            });
          },
        },
        {
          label: "联系方式",
          click: () => {
            dialog.showMessageBox(win, {
              type: "info",
              title: "Contact",
              message: "Wechat:  cjhxhe\nEmail:  cjhxhe@126.com",
            });
          },
        },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);

  // 打开开发者工具
  // win.webContents.openDevTools();

  const userDataPath = path.join(os.homedir(), "vat"); // 获取用户的家目录并创建数据目录
  const userDataJson = path.join(userDataPath, "vat.info");

  // 确保数据目录存在
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath);
  }

  // 监听获取用户数据请求
  ipcMain.handle("get-userdata", async () => {
    if (fs.existsSync(userDataJson)) {
      const data = fs.readFileSync(userDataJson);
      return JSON.parse(data);
    }
    return { clickCount: 0 };
  });

  // 监听更新用户数据请求
  ipcMain.handle("update-userdata", async (event, data) => {
    fs.writeFileSync(userDataJson, JSON.stringify(data));
  });

  ipcMain.on("show-pay-window", () => {
    createPayWindow();
  });

  ipcMain.on("load-file", (event, filePath) => {
    if (path.extname(filePath) !== ".xlsx") {
      event.sender.send("window-alert", "只支持xlsx文件!");
      event.sender.send("file-loaded", { success: false, content: undefined });
      return;
    }
    console.log("Received file path:", filePath); // 用于调试
    let sheets = nodeXlsx.parse(filePath);
    let content1Array = []; // 风险地址库
    let content2Array = []; // 风险人员库
    let content3Array = []; // 生僻字库
    let content4Array = []; // 行业库

    // 解析所有sheet
    let idx = 0;
    sheets.forEach((sheet) => {
      let sname = sheet.name;
      // sheet.data是所有行数据
      let rows = sheet.data;
      let cols = 0;
      for (var i = 0; i < rows.length; i++) {
        // 表头不解析
        if (i == 0) {
          cols = rows[i].length;
          continue;
        }
        let lineData = [];
        for (var j = 0; j < cols; j++) {
          lineData[j] = rows[i][j];
        }
        if (sname == "风险地址库" || idx == 0) {
          content1Array.push(lineData);
        } else if (sname == "风险人员库" || idx == 1) {
          content2Array.push(lineData);
        } else if (sname == "生僻字库" || idx == 2) {
          content3Array.push(lineData);
        } else if (sname == "行业库" || idx == 3) {
          content4Array.push(lineData);
        }
      }
      idx++;
    });
    event.sender.send("file-loaded", {
      success: true,
      content1: content1Array,
      content2: content2Array,
      content3: content3Array,
      content4: content4Array,
    });
  });

  function extractAge(input) {
    // 使用正则表达式提取 18 位的身份证号码
    const idPattern = /\d{18}/;
    const match = input.match(idPattern);

    if (!match) {
      return -1; // 未找到身份证号码，返回 -1
    }

    const idNumber = match[0];

    // 提取身份证号码中的出生日期 (第 7 到 14 位)
    const birthYear = parseInt(idNumber.slice(6, 10), 10);
    const birthMonth = parseInt(idNumber.slice(10, 12), 10);
    const birthDay = parseInt(idNumber.slice(12, 14), 10);

    // 获取当前日期
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // 计算年龄
    let age = currentYear - birthYear;

    // 如果当前月份还没到出生月份，或者当前日期还没到出生日期，年龄减一岁
    if (
      currentMonth < birthMonth ||
      (currentMonth === birthMonth && currentDay < birthDay)
    ) {
      age--;
    }

    return age;
  }

  ipcMain.handle(
    "process-excel",
    async (
      event,
      { fileContent1, fileContent2, fileContent3, fileContent4, filePath }
    ) => {
      if (
        fileContent1 == undefined ||
        fileContent1 == "" ||
        filePath == "待匹配文件丢到这里"
      ) {
        event.sender.send("window-alert", "请先选择需要处理的标签库和文件!");
        return;
      }
      // 处理风险地址库
      let vadArray = fileContent1.split("\n");
      let vadLineArray = [];
      for (var i = 0; i < vadArray.length; i++) {
        let curLine = vadArray[i];
        vadLineArray.push(curLine.split(","));
      }

      // 处理风险人员库
      let riskArray = fileContent2.split("\n");
      let riskLineArray = [];
      for (var i = 0; i < riskArray.length; i++) {
        let curLine = riskArray[i];
        riskLineArray.push(curLine.split(","));
      }

      // 处理生僻字库
      let rareLineArray = fileContent3.split("\n");

      // 处理行业库
      let industryLineArray = fileContent4.split("\n");

      // 1. 读取 Excel 文件
      const workSheetsFromFile = nodeXlsx.parse(filePath);

      // 2. 遍历和修改数据
      const sheet = workSheetsFromFile[0].data;
      if (sheet == undefined || sheet.length <= 0) {
        event.sender.send("window-alert", "待处理的文件数据解析失败!");
        return;
      }

      // 前几列是固定的：纳税人识别号	纳税人名称	注册地址	行业	法人	财务负责人	办税员
      // 这几列是需要匹配的：风险地址	风险类型名称	风险人员	风险人员类型	行业预警	法人年龄预警	生僻字预警
      for (let i = 0; i < sheet.length; i++) {
        if (i == 0) {
          console.log(sheet[0]);
          continue;
        }

        // 从 1 开始跳过标题行
        let row = sheet[i];

        // 地址列
        let address = row[2];
        let foundVadLineData = vadLineArray.find((lineData) => {
          let curLine0 = lineData[0];
          let curLine1 = curLine0.replace("浙江省杭州市西湖区", "");
          let curLine2 = curLine0.replace("浙江省杭州市", "");
          let curLine3 = curLine0.replace("西湖区", "");
          return (
            address.includes(curLine0) ||
            address.includes(curLine1) ||
            address.includes(curLine2) ||
            address.includes(curLine3)
          );
        });
        if (foundVadLineData) {
          console.log("Found line:", foundVadLineData);
          row[7] = foundVadLineData[0]; // 风险地址
          row[8] = foundVadLineData[1]; // 风险类型名称
        } else {
          row[7] = "";
          row[8] = "";
        }

        // 风险人员
        let riskSet = new Set([row[4], row[5], row[6]]);
        let foundRiskLineData = riskLineArray.filter((item) =>
          riskSet.has(item)
        );
        if (foundRiskLineData) {
          let firstElements = [];
          let secondElements = [];

          // 遍历 riskLineArray
          riskLineArray.forEach((item) => {
            if (Array.isArray(item)) {
              // 检查 item 是否是数组
              firstElements.push(item[0]); // 提取第一个元素
              secondElements.push(item[1]); // 提取第二个元素
            }
          });

          // 用顿号拼接每个数组的元素
          let firstString = firstElements.join("、");
          let secondString = secondElements.join("、");
          row[9] = firstString;
          row[10] = secondString;
        } else {
          row[9] = "";
          row[10] = "";
        }

        // 法人年龄预警 18~70
        let age = extractAge(row[4]);
        if ((age > 0 && age < 18) || age >= 70) {
          row[12] = age;
        } else if (age < 0) {
          row[12] = "法人身份证可能不对";
        } else {
          row[12] = "";
        }

        // 行业预警
        let industry = row[3];
        if (industryLineArray.includes(industry)) {
          row[11] = industry;
        } else {
          row[11] = "";
        }

        // 生僻字预警
        let company = row[1];
        // 查找匹配的字
        let matchedChars = rareLineArray.filter((char) =>
          company.includes(char)
        );
        if (matchedChars.length > 0) {
          row[13] = matchedChars.join("、");
        } else {
          row[13] = "";
        }
      }

      // 3. 保存修改后的数据
      const buffer = nodeXlsx.build([{ name: "Sheet1", data: sheet }]);
      fs.writeFileSync(filePath.replace(".xls", "_new.xls"), buffer); // 保存到新文件

      event.sender.send("window-alert", "完成!");
    }
  );
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
