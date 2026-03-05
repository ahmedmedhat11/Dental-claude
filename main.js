const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Global variables
let mainWindow;
let db;
const isDev = process.argv.includes('--dev');

// Database path
const userDataPath = app.getPath('userData');
const dbPath = isDev 
  ? path.join(__dirname, '../database/clinic.db')
  : path.join(userDataPath, 'clinic.db');

const backupDir = isDev
  ? path.join(__dirname, '../database/backups')
  : path.join(userDataPath, 'backups');

// Ensure directories exist
function ensureDirectories() {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

// Initialize database connection
function initDatabase() {
  try {
    ensureDirectories();
    
    // Check if database exists
    const dbExists = fs.existsSync(dbPath);
    
    // Create database connection
    db = new Database(dbPath, { 
      verbose: isDev ? console.log : null,
      fileMustExist: false
    });
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    
    // If database is new, initialize schema
    if (!dbExists) {
      console.log('Initializing new database...');
      const initSchema = require('./database/init-schema');
      initSchema(db);
    }
    
    console.log('Database initialized successfully at:', dbPath);
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    dialog.showErrorBox('Database Error', 
      'Failed to initialize database: ' + error.message);
    app.quit();
  }
}

// Create backup on app close
function createBackup() {
  try {
    if (!db || !fs.existsSync(dbPath)) {
      return;
    }
    
    const date = new Date();
    const timestamp = date.toISOString().split('T')[0].replace(/-/g, '_');
    const backupFileName = `backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Close database before backup
    if (db) {
      db.close();
    }
    
    // Copy database file
    fs.copyFileSync(dbPath, backupPath);
    console.log('Backup created:', backupPath);
    
    // Clean old backups (keep last 30 days)
    cleanOldBackups();
  } catch (error) {
    console.error('Backup failed:', error);
  }
}

// Clean old backups
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(backupDir);
    const backupFiles = files
      .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    // Keep last 30 backups
    const toDelete = backupFiles.slice(30);
    toDelete.forEach(file => {
      fs.unlinkSync(file.path);
      console.log('Deleted old backup:', file.name);
    });
  } catch (error) {
    console.error('Failed to clean old backups:', error);
  }
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev
    },
    show: false,
    frame: true,
    autoHideMenuBar: true
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window close
  mainWindow.on('close', (e) => {
    // Create backup before closing
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Confirm Exit',
      message: 'Are you sure you want to exit? A backup will be created automatically.'
    });
    
    if (choice === 1) {
      e.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    createBackup();
    if (db) {
      db.close();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  createBackup();
  if (db) {
    db.close();
  }
});

// Export database getter for IPC handlers
function getDatabase() {
  return db;
}

// Export functions
module.exports = {
  getDatabase,
  getMainWindow: () => mainWindow
};

// IPC Handlers will be registered here
require('./ipc/handlers')(getDatabase);
