/**
 * Backup Handlers
 * Handles manual backup, restore, and backup management
 */

const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Backup handlers loaded');
  
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'clinic.db');
  const backupDir = path.join(userDataPath, 'backups');
  
  /**
   * CREATE MANUAL BACKUP
   */
  ipcMain.handle('backup:create', async (event) => {
    try {
      const session = global.requireAuth();
      
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const backupFileName = `manual_backup_${timestamp}_${time}.db`;
      const backupPath = path.join(backupDir, backupFileName);
      
      // Copy database
      fs.copyFileSync(dbPath, backupPath);
      
      // Log in audit
      const db = getDatabase();
      global.createAuditLog(
        db,
        session.userId,
        'MANUAL_BACKUP',
        'system',
        null,
        null,
        { backup_file: backupFileName }
      );
      
      console.log(`✅ Manual backup created: ${backupFileName}`);
      
      return {
        success: true,
        backupPath: backupPath,
        fileName: backupFileName,
        message: 'Backup created successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Create backup error:', error);
      return { success: false, message: 'Backup failed: ' + error.message };
    }
  });
  
  /**
   * LIST BACKUPS
   */
  ipcMain.handle('backup:list', async (event) => {
    try {
      global.requireAuth();
      
      if (!fs.existsSync(backupDir)) {
        return { success: true, backups: [] };
      }
      
      const files = fs.readdirSync(backupDir);
      const backups = files
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const stats = fs.statSync(path.join(backupDir, f));
          return {
            name: f,
            path: path.join(backupDir, f),
            size: stats.size,
            created: stats.mtime,
            type: f.startsWith('manual_') ? 'Manual' : 'Automatic'
          };
        })
        .sort((a, b) => b.created - a.created);
      
      return {
        success: true,
        backups: backups,
        count: backups.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('List backups error:', error);
      return { success: false, message: 'Failed to list backups' };
    }
  });
  
  /**
   * RESTORE BACKUP
   * (Admin only)
   */
  ipcMain.handle('backup:restore', async (event, backupPath) => {
    try {
      const session = global.requireRole('Admin');
      
      if (!backupPath || !fs.existsSync(backupPath)) {
        return { success: false, message: 'Backup file not found' };
      }
      
      // This requires app restart, so just return instructions
      return {
        success: true,
        requiresRestart: true,
        message: 'To restore: Close app, replace clinic.db with backup file, restart app'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires')) {
        return { success: false, message: error.message };
      }
      console.error('Restore backup error:', error);
      return { success: false, message: 'Restore failed' };
    }
  });
};
