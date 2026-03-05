/**
 * Utility Handlers
 * Handles utility functions like dialogs and messages
 */

const { dialog } = require('electron');

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Utility handlers loaded');
  
  /**
   * SHOW MESSAGE
   * Displays a message dialog
   */
  ipcMain.handle('utils:showMessage', async (event, type, title, message) => {
    try {
      const { getMainWindow } = require('../main');
      const mainWindow = getMainWindow();
      
      dialog.showMessageBox(mainWindow, {
        type: type || 'info',
        title: title || 'Message',
        message: message || '',
        buttons: ['OK']
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('Show message error:', error);
      return { success: false, message: error.message };
    }
  });
  
  /**
   * SHOW CONFIRM
   * Displays a confirmation dialog
   */
  ipcMain.handle('utils:showConfirm', async (event, title, message) => {
    try {
      const { getMainWindow } = require('../main');
      const mainWindow = getMainWindow();
      
      const result = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        title: title || 'Confirm',
        message: message || 'Are you sure?',
        buttons: ['Yes', 'No'],
        defaultId: 1,
        cancelId: 1
      });
      
      return {
        success: true,
        confirmed: result === 0
      };
      
    } catch (error) {
      console.error('Show confirm error:', error);
      return { success: false, message: error.message };
    }
  });
  
  /**
   * SELECT FILE
   * Opens file selection dialog
   */
  ipcMain.handle('utils:selectFile', async (event, options) => {
    try {
      const { getMainWindow } = require('../main');
      const mainWindow = getMainWindow();
      
      const result = await dialog.showOpenDialog(mainWindow, options || {});
      
      return {
        success: true,
        canceled: result.canceled,
        filePaths: result.filePaths
      };
      
    } catch (error) {
      console.error('Select file error:', error);
      return { success: false, message: error.message };
    }
  });
};
