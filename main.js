// main.js
const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');

// 開発環境かどうかの判定
const isDev = process.argv.includes('--dev');

// メインウィンドウの参照を保持
let mainWindow;

// ウィンドウ作成関数
function createWindow() {
  // ブラウザウィンドウを作成
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,         // セキュリティ: レンダラーでNode.js無効
      contextIsolation: true,         // セキュリティ: コンテキスト分離有効
      enableRemoteModule: false,      // セキュリティ: リモートモジュール無効
      preload: path.join(__dirname, 'src/scripts/preload.js') // 安全な通信用
    },
    icon: path.join(__dirname, 'build/icon.png'), // アイコン設定
    show: false  // 初期状態では非表示（準備完了後に表示）
  });

  // HTMLファイルを読み込み
  mainWindow.loadFile('src/index.html');

  // ウィンドウが準備完了したら表示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 開発環境なら開発者ツールを開く
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // ウィンドウが閉じられた時の処理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// アプリケーションの準備完了時
app.whenReady().then(() => {
  createWindow();
  createMenu(); // メニューを作成

  // macOSでの動作（ドックアイコンクリック時）
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 全てのウィンドウが閉じられた時
app.on('window-all-closed', () => {
  // macOS以外では完全終了
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// メニュー作成関数
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new');
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Mind Map Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu-open', result.filePaths[0]);
            }
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => {
            mainWindow.webContents.send('menu-undo');
          }
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Y',
          click: () => {
            mainWindow.webContents.send('menu-redo');
          }
        },
        { type: 'separator' },
        {
          label: 'Delete',
          accelerator: 'Delete',
          click: () => {
            mainWindow.webContents.send('menu-delete');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow.webContents.send('menu-zoom-in');
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.send('menu-zoom-out');
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.send('menu-zoom-reset');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC通信ハンドラの設定
function setupIpcHandlers() {
  // ファイル保存ダイアログ
  ipcMain.handle('show-save-dialog', async () => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'マインドマップを保存',
        defaultPath: 'mindmap.json',
        filters: [
          { name: 'Mind Map Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['createDirectory']
      });
      
      return result;
    } catch (error) {
      console.error('Save dialog error:', error);
      return { canceled: true, error: error.message };
    }
  });

  // ファイル選択ダイアログ
  ipcMain.handle('show-open-dialog', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'マインドマップを開く',
        filters: [
          { name: 'Mind Map Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      return result;
    } catch (error) {
      console.error('Open dialog error:', error);
      return { canceled: true, error: error.message };
    }
  });

  // アプリバージョン取得
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // エラーログ出力
  ipcMain.on('log-error', (event, errorMessage) => {
    console.error('Renderer error:', errorMessage);
  });
}