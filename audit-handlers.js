/**
 * Audit Log Handlers
 * Handles viewing of audit logs (Admin only)
 */

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Audit log handlers loaded');
  
  /**
   * GET AUDIT LOGS
   * Retrieves audit logs with filters (Admin only)
   */
  ipcMain.handle('audit:getLogs', async (event, filters = {}) => {
    const db = getDatabase();
    
    try {
      // Check authentication and permission
      global.requireRole('Admin');
      
      let query = `
        SELECT 
          a.*,
          u.username,
          u.full_name
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filters.user_id) {
        query += ` AND a.user_id = ?`;
        params.push(filters.user_id);
      }
      
      if (filters.action) {
        query += ` AND a.action = ?`;
        params.push(filters.action);
      }
      
      if (filters.table_name) {
        query += ` AND a.table_name = ?`;
        params.push(filters.table_name);
      }
      
      if (filters.start_date) {
        query += ` AND date(a.created_at) >= date(?)`;
        params.push(filters.start_date);
      }
      
      if (filters.end_date) {
        query += ` AND date(a.created_at) <= date(?)`;
        params.push(filters.end_date);
      }
      
      query += ` ORDER BY a.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit || 100);
      } else {
        query += ` LIMIT 100`;
      }
      
      const logs = db.prepare(query).all(...params);
      
      return {
        success: true,
        logs: logs,
        count: logs.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required' || error.message.includes('requires')) {
        return { success: false, message: error.message };
      }
      console.error('Get audit logs error:', error);
      return {
        success: false,
        message: 'Failed to retrieve audit logs'
      };
    }
  });
};
