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
      // 启用Node.js集成（用于require模块）
      nodeIntegration: true,
      contextIsolation: false
    },
    // 窗口标题
    title: '班级任务统计助手',
    // 窗口图标（如果有的话）
    // icon: path.join(__dirname, 'assets/icon.png')
  });

  // 加载index.html文件
  mainWindow.loadFile('index.html');

  // 当页面加载完成后，注入electronAPI
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Main process: 页面加载完成，准备注入electronAPI');
    const code = `
      window.electronAPI = {
        onWindowResize: (callback) => {
          console.log('Renderer: 注册窗口大小变化监听');
          const handler = (event, size) => {
            console.log('Renderer: 收到window-resize事件', size);
            callback(size);
          };
          require('electron').ipcRenderer.on('window-resize', handler);
          // 保存handler引用以便后面移除
          window.__resizeHandler = handler;
        },
        removeAllListeners: (channel) => {
          console.log('Renderer: 移除监听器', channel);
          if (channel === 'window-resize' && window.__resizeHandler) {
            require('electron').ipcRenderer.removeListener('window-resize', window.__resizeHandler);
            window.__resizeHandler = null;
          } else {
            require('electron').ipcRenderer.removeAllListeners(channel);
          }
        }
      };
      console.log('Renderer: electronAPI已注入');
    `;
    mainWindow.webContents.executeJavaScript(code);
    console.log('Main process: electronAPI注入完成');
  });

  // 开发工具（在开发模式下打开）
  // 只有在命令行包含 --dev 参数时才打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 监听窗口大小变化事件，通知渲染进程
  mainWindow.on('resize', () => {
    console.log('Main process: 检测到窗口resize事件');
    const { width, height } = mainWindow.getBounds();
    console.log(`Main process: 窗口尺寸 ${width}x${height}`);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('window-resize', { width, height });
      console.log('Main process: 已发送 window-resize 事件到渲染进程');
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
