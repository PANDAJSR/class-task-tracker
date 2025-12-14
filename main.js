const { app, BrowserWindow } = require('electron');
const path = require('path');

// 主窗口对象
let mainWindow;

/**
 * 创建主窗口
 */
function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // 启用Node.js集成
      nodeIntegration: true,
      contextIsolation: false,
      // 允许在渲染进程中使用require
      enableRemoteModule: true
    },
    // 窗口标题
    title: '班级任务统计助手',
    // 窗口图标（如果有的话）
    // icon: path.join(__dirname, 'assets/icon.png')
  });

  // 加载index.html文件
  mainWindow.loadFile('index.html');

  // 开发工具（在开发模式下打开）
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 监听窗口大小变化事件，通知渲染进程
  mainWindow.on('resize', () => {
    const { width, height } = mainWindow.getBounds();
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('window-resize', { width, height });
    }
  });
}

/**
 * Electron应用就绪后创建窗口
 */
app.whenReady().then(() => {
  createWindow();

  // 在macOS上，当单击dock图标并且没有其他窗口打开时，通常会在应用程序中重新创建一个窗口。
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * 当所有窗口都关闭时退出应用
 */
app.on('window-all-closed', () => {
  // 在macOS上，除非用户明确退出（Cmd + Q），否则应用程序及其菜单栏通常会保持活动状态
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 应用激活时触发（主要针对macOS）
 */
app.on('activate', () => {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，通常会在应用程序中重新创建一个窗口。
  if (mainWindow === null) {
    createWindow();
  }
});
