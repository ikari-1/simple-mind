// src/scripts/preload.js
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs').promises;
const path = require('path');

// セキュアなAPIをレンダラープロセスに公開
contextBridge.exposeInMainWorld('electronAPI', {
  // メニューイベントリスナー
  onMenuAction: (callback) => {
    // メインプロセスからのメニューイベントを受信
    ipcRenderer.on('menu-new', () => callback('new'));
    ipcRenderer.on('menu-open', (event, filePath) => callback('open', filePath));
    ipcRenderer.on('menu-save', () => callback('save'));
    ipcRenderer.on('menu-undo', () => callback('undo'));
    ipcRenderer.on('menu-redo', () => callback('redo'));
    ipcRenderer.on('menu-delete', () => callback('delete'));
    ipcRenderer.on('menu-zoom-in', () => callback('zoom-in'));
    ipcRenderer.on('menu-zoom-out', () => callback('zoom-out'));
    ipcRenderer.on('menu-zoom-reset', () => callback('zoom-reset'));
  },

  // ファイル操作API（安全なラッパー）
  fileOperations: {
    // ファイル読み込み
    async readFile(filePath) {
      try {
        // セキュリティ: パス検証
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('Invalid file path');
        }
        
        // 拡張子チェック（.jsonファイルのみ許可）
        const ext = path.extname(filePath).toLowerCase();
        if (ext !== '.json') {
          throw new Error('Only JSON files are allowed');
        }

        const data = await fs.readFile(filePath, 'utf8');
        
        // JSONの妥当性チェック
        try {
          JSON.parse(data);
          return data;
        } catch (parseError) {
          throw new Error('Invalid JSON format');
        }
      } catch (error) {
        console.error('File read error:', error);
        throw error;
      }
    },

    // ファイル書き込み
    async writeFile(filePath, data) {
      try {
        // セキュリティ: パス検証
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('Invalid file path');
        }
        
        // データ検証
        if (typeof data !== 'string') {
          throw new Error('Data must be a string');
        }

        // 拡張子チェック
        const ext = path.extname(filePath).toLowerCase();
        if (ext !== '.json') {
          throw new Error('Only JSON files are allowed');
        }

        // JSONの妥当性チェック
        try {
          JSON.parse(data);
        } catch (parseError) {
          throw new Error('Invalid JSON format');
        }

        await fs.writeFile(filePath, data, 'utf8');
        return true;
      } catch (error) {
        console.error('File write error:', error);
        throw error;
      }
    },

    // ファイル存在チェック
    async fileExists(filePath) {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    }
  },

  // ダイアログ操作（メインプロセスに委譲）
  dialog: {
    // ファイル保存ダイアログ
    showSaveDialog: () => {
      return ipcRenderer.invoke('show-save-dialog');
    },
    
    // ファイル選択ダイアログ
    showOpenDialog: () => {
      return ipcRenderer.invoke('show-open-dialog');
    }
  },

  // アプリケーション情報
  app: {
    // バージョン情報など安全な情報のみ
    getVersion: () => {
      return ipcRenderer.invoke('get-app-version');
    }
  }
});

// セキュリティログ
console.log('Preload script loaded - Secure context established');