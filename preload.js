const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth APIs
  login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
  changePassword: (oldPassword, newPassword) => ipcRenderer.invoke('auth:changePassword', oldPassword, newPassword),
  
  // User Management APIs (Admin only)
  createUser: (userData) => ipcRenderer.invoke('users:create', userData),
  getAllUsers: () => ipcRenderer.invoke('users:getAll'),
  updateUser: (userId, userData) => ipcRenderer.invoke('users:update', userId, userData),
  deleteUser: (userId) => ipcRenderer.invoke('users:delete', userId),
  resetPassword: (userId, newPassword) => ipcRenderer.invoke('users:resetPassword', userId, newPassword),
  
  // Patient APIs
  createPatient: (patientData) => ipcRenderer.invoke('patients:create', patientData),
  getAllPatients: (filters) => ipcRenderer.invoke('patients:getAll', filters),
  getPatientById: (patientId) => ipcRenderer.invoke('patients:getById', patientId),
  updatePatient: (patientId, patientData) => ipcRenderer.invoke('patients:update', patientId, patientData),
  deletePatient: (patientId) => ipcRenderer.invoke('patients:delete', patientId),
  searchPatients: (searchTerm) => ipcRenderer.invoke('patients:search', searchTerm),
  validateReferralCode: (referralCode) => ipcRenderer.invoke('patients:validateReferral', referralCode),
  
  // Visit APIs
  createVisit: (visitData) => ipcRenderer.invoke('visits:create', visitData),
  getVisitsByPatient: (patientId) => ipcRenderer.invoke('visits:getByPatient', patientId),
  getVisitById: (visitId) => ipcRenderer.invoke('visits:getById', visitId),
  updateVisit: (visitId, visitData) => ipcRenderer.invoke('visits:update', visitId, visitData),
  deleteVisit: (visitId) => ipcRenderer.invoke('visits:delete', visitId),
  addPayment: (visitId, amount) => ipcRenderer.invoke('visits:addPayment', visitId, amount),
  
  // Appointment APIs
  createAppointment: (appointmentData) => ipcRenderer.invoke('appointments:create', appointmentData),
  getAllAppointments: (filters) => ipcRenderer.invoke('appointments:getAll', filters),
  updateAppointment: (appointmentId, appointmentData) => ipcRenderer.invoke('appointments:update', appointmentId, appointmentData),
  deleteAppointment: (appointmentId) => ipcRenderer.invoke('appointments:delete', appointmentId),
  
  // Medication APIs
  createMedication: (medicationData) => ipcRenderer.invoke('medications:create', medicationData),
  getMedicationsByVisit: (visitId) => ipcRenderer.invoke('medications:getByVisit', visitId),
  deleteMedication: (medicationId) => ipcRenderer.invoke('medications:delete', medicationId),
  
  // Referral APIs
  getReferralStats: (patientId) => ipcRenderer.invoke('referrals:getStats', patientId),
  getWalletBalance: (patientId) => ipcRenderer.invoke('referrals:getWalletBalance', patientId),
  withdrawFromWallet: (patientId, amount) => ipcRenderer.invoke('referrals:withdraw', patientId, amount),
  
  // Invoice APIs
  getInvoicesByPatient: (patientId) => ipcRenderer.invoke('invoices:getByPatient', patientId),
  getInvoiceById: (invoiceId) => ipcRenderer.invoke('invoices:getById', invoiceId),
  
  // Follow-up APIs
  createFollowUp: (followUpData) => ipcRenderer.invoke('followups:create', followUpData),
  getFollowUpsByPatient: (patientId) => ipcRenderer.invoke('followups:getByPatient', patientId),
  updateFollowUpStatus: (followUpId, status) => ipcRenderer.invoke('followups:updateStatus', followUpId, status),
  
  // Settings APIs
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  updateSetting: (key, value) => ipcRenderer.invoke('settings:update', key, value),
  bulkUpdateSettings: (settingsObject) => ipcRenderer.invoke('settings:bulkUpdate', settingsObject),
  
  // Audit Log APIs (Admin only)
  getAuditLogs: (filters) => ipcRenderer.invoke('audit:getLogs', filters),
  
  // Report APIs
  getDashboardStats: () => ipcRenderer.invoke('reports:getDashboard'),
  getFinancialReport: (startDate, endDate) => ipcRenderer.invoke('reports:getFinancial', startDate, endDate),
  getPatientReport: (patientId) => ipcRenderer.invoke('reports:getPatient', patientId),
  
  // Print APIs
  printPatientProfile: (patientId) => ipcRenderer.invoke('print:patientProfile', patientId),
  printVisitReport: (visitId) => ipcRenderer.invoke('print:visitReport', visitId),
  printPrescription: (visitId) => ipcRenderer.invoke('print:prescription', visitId),
  printInvoice: (invoiceId) => ipcRenderer.invoke('print:invoice', invoiceId),
  
  // WhatsApp API
  openWhatsApp: (phone, message) => ipcRenderer.invoke('whatsapp:open', phone, message),
  
  // Backup APIs
  createManualBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: (backupPath) => ipcRenderer.invoke('backup:restore', backupPath),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  
  // Utility APIs
  showMessage: (type, title, message) => ipcRenderer.invoke('utils:showMessage', type, title, message),
  showConfirm: (title, message) => ipcRenderer.invoke('utils:showConfirm', title, message),
  selectFile: (options) => ipcRenderer.invoke('utils:selectFile', options),
  
  // Event listeners
  onAuthStateChange: (callback) => {
    ipcRenderer.on('auth:stateChanged', (event, user) => callback(user));
    return () => ipcRenderer.removeAllListeners('auth:stateChanged');
  },
  
  onNotification: (callback) => {
    ipcRenderer.on('notification', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('notification');
  }
});

// Expose app info
contextBridge.exposeInMainWorld('appInfo', {
  version: '1.0.0',
  platform: process.platform,
  name: 'Dental Clinic Management System'
});

// Log that preload script loaded successfully
console.log('Preload script loaded successfully');
