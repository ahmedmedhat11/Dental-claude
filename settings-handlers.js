/**
 * Settings Management Handlers
 * Handles system configuration and settings
 */

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Settings management handlers loaded');
  
  /**
   * GET ALL SETTINGS
   * Retrieves all system settings
   */
  ipcMain.handle('settings:getAll', async (event) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      const settings = db.prepare(`
        SELECT *
        FROM settings
        ORDER BY setting_key
      `).all();
      
      // Convert to key-value object for easier use
      const settingsObject = {};
      settings.forEach(setting => {
        settingsObject[setting.setting_key] = {
          value: setting.setting_value,
          description: setting.description,
          updated_at: setting.updated_at
        };
      });
      
      return {
        success: true,
        settings: settingsObject,
        settingsArray: settings
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get all settings error:', error);
      return {
        success: false,
        message: 'Failed to retrieve settings'
      };
    }
  });
  
  /**
   * GET SETTING
   * Retrieves a specific setting value
   */
  ipcMain.handle('settings:get', async (event, key) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!key) {
        return { success: false, message: 'Setting key is required' };
      }
      
      const setting = db.prepare(`
        SELECT * FROM settings WHERE setting_key = ?
      `).get(key);
      
      if (!setting) {
        return { success: false, message: 'Setting not found' };
      }
      
      return {
        success: true,
        key: setting.setting_key,
        value: setting.setting_value,
        description: setting.description
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get setting error:', error);
      return {
        success: false,
        message: 'Failed to retrieve setting'
      };
    }
  });
  
  /**
   * UPDATE SETTING
   * Updates a setting value (Admin only)
   */
  ipcMain.handle('settings:update', async (event, key, value) => {
    const db = getDatabase();
    
    try {
      // Check authentication and permission
      const session = global.requireRole('Admin');
      
      if (!key || value === undefined || value === null) {
        return { success: false, message: 'Setting key and value are required' };
      }
      
      // Check if setting exists
      const existing = db.prepare(`
        SELECT * FROM settings WHERE setting_key = ?
      `).get(key);
      
      if (!existing) {
        return { success: false, message: 'Setting not found' };
      }
      
      // Validate specific settings
      if (key === 'referral_discount_new_patient') {
        const discount = parseFloat(value);
        if (isNaN(discount) || discount < 0 || discount > 100) {
          return { success: false, message: 'Discount must be between 0 and 100' };
        }
      }
      
      if (key === 'referral_reward_owner') {
        const reward = parseFloat(value);
        if (isNaN(reward) || reward < 0) {
          return { success: false, message: 'Reward must be a positive number' };
        }
      }
      
      if (key === 'appointment_duration_default') {
        const duration = parseInt(value);
        if (isNaN(duration) || duration < 5 || duration > 480) {
          return { success: false, message: 'Duration must be between 5 and 480 minutes' };
        }
      }
      
      // Update setting
      db.prepare(`
        UPDATE settings
        SET setting_value = ?,
            updated_by = ?,
            updated_at = datetime('now', 'localtime')
        WHERE setting_key = ?
      `).run(value.toString(), session.userId, key);
      
      // Create audit log
      global.createAuditLog(
        db,
        session.userId,
        'UPDATE',
        'settings',
        null,
        { [key]: existing.setting_value },
        { [key]: value.toString() }
      );
      
      console.log(`✅ Setting updated: ${key} = ${value}`);
      
      return {
        success: true,
        key: key,
        value: value.toString(),
        message: 'Setting updated successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires')) {
        return { success: false, message: error.message };
      }
      console.error('Update setting error:', error);
      return {
        success: false,
        message: 'Failed to update setting'
      };
    }
  });
  
  /**
   * BULK UPDATE SETTINGS
   * Updates multiple settings at once (Admin only)
   */
  ipcMain.handle('settings:bulkUpdate', async (event, settingsObject) => {
    const db = getDatabase();
    
    try {
      // Check authentication and permission
      const session = global.requireRole('Admin');
      
      if (!settingsObject || typeof settingsObject !== 'object') {
        return { success: false, message: 'Settings object is required' };
      }
      
      const transaction = db.transaction(() => {
        for (const [key, value] of Object.entries(settingsObject)) {
          db.prepare(`
            UPDATE settings
            SET setting_value = ?,
                updated_by = ?,
                updated_at = datetime('now', 'localtime')
            WHERE setting_key = ?
          `).run(value.toString(), session.userId, key);
        }
      });
      
      transaction();
      
      // Create audit log
      global.createAuditLog(
        db,
        session.userId,
        'BULK_UPDATE',
        'settings',
        null,
        null,
        settingsObject
      );
      
      console.log(`✅ Bulk settings updated: ${Object.keys(settingsObject).length} settings`);
      
      return {
        success: true,
        updatedCount: Object.keys(settingsObject).length,
        message: 'Settings updated successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires')) {
        return { success: false, message: error.message };
      }
      console.error('Bulk update settings error:', error);
      return {
        success: false,
        message: 'Failed to update settings'
      };
    }
  });
};
