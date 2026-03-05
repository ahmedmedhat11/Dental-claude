const { ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Register all IPC handlers
 * @param {Function} getDatabase - Function to get database instance
 */
function registerHandlers(getDatabase) {
  
  // Import handler modules
  const authHandlers = require('./auth-handlers');
  const userHandlers = require('./user-handlers');
  const patientHandlers = require('./patient-handlers');
  const visitHandlers = require('./visit-handlers');
  const appointmentHandlers = require('./appointment-handlers');
  const medicationHandlers = require('./medication-handlers');
  const referralHandlers = require('./referral-handlers');
  const invoiceHandlers = require('./invoice-handlers');
  const followupHandlers = require('./followup-handlers');
  const settingsHandlers = require('./settings-handlers');
  const auditHandlers = require('./audit-handlers');
  const reportHandlers = require('./report-handlers');
  const printHandlers = require('./print-handlers');
  const backupHandlers = require('./backup-handlers');
  const utilHandlers = require('./util-handlers');
  
  // Register all handlers
  authHandlers(ipcMain, getDatabase);
  userHandlers(ipcMain, getDatabase);
  patientHandlers(ipcMain, getDatabase);
  visitHandlers(ipcMain, getDatabase);
  appointmentHandlers(ipcMain, getDatabase);
  medicationHandlers(ipcMain, getDatabase);
  referralHandlers(ipcMain, getDatabase);
  invoiceHandlers(ipcMain, getDatabase);
  followupHandlers(ipcMain, getDatabase);
  settingsHandlers(ipcMain, getDatabase);
  auditHandlers(ipcMain, getDatabase);
  reportHandlers(ipcMain, getDatabase);
  printHandlers(ipcMain, getDatabase);
  backupHandlers(ipcMain, getDatabase);
  utilHandlers(ipcMain, getDatabase);
  
  // WhatsApp handler
  ipcMain.handle('whatsapp:open', async (event, phone, message = '') => {
    try {
      // Ensure phone is in correct format (without + sign for URL)
      const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
      let url = `https://wa.me/${cleanPhone}`;
      
      if (message && message.trim() !== '') {
        const encodedMessage = encodeURIComponent(message);
        url += `?text=${encodedMessage}`;
      }
      
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
      return { success: false, error: error.message };
    }
  });
  
  console.log('✅ All IPC handlers registered successfully');
}

module.exports = registerHandlers;
