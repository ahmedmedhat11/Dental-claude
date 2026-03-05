/**
 * Follow-up Management Handlers
 * Handles patient follow-up reminders and tracking
 */

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Follow-up management handlers loaded');
  
  /**
   * CREATE FOLLOW-UP
   * Creates a follow-up reminder for a patient
   */
  ipcMain.handle('followups:create', async (event, followupData) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      const session = global.requireAuth();
      
      // Validate required fields
      if (!followupData.patient_id || !followupData.followup_date || !followupData.reason) {
        return {
          success: false,
          message: 'Patient ID, date, and reason are required'
        };
      }
      
      // Verify patient exists
      const patient = db.prepare(`
        SELECT id, name FROM patients WHERE id = ?
      `).get(followupData.patient_id);
      
      if (!patient) {
        return { success: false, message: 'Patient not found' };
      }
      
      // Insert follow-up
      const result = db.prepare(`
        INSERT INTO followups (
          patient_id, visit_id, followup_date, reason, status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        followupData.patient_id,
        followupData.visit_id || null,
        followupData.followup_date,
        followupData.reason,
        followupData.status || 'Pending',
        followupData.notes || null,
        session.userId
      );
      
      console.log(`✅ Follow-up created for ${patient.name} on ${followupData.followup_date}`);
      
      return {
        success: true,
        followupId: result.lastInsertRowid,
        message: 'Follow-up created successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Create follow-up error:', error);
      return {
        success: false,
        message: 'Failed to create follow-up'
      };
    }
  });
  
  /**
   * GET FOLLOW-UPS BY PATIENT
   * Retrieves all follow-ups for a specific patient
   */
  ipcMain.handle('followups:getByPatient', async (event, patientId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!patientId) {
        return { success: false, message: 'Patient ID is required' };
      }
      
      const followups = db.prepare(`
        SELECT 
          f.*,
          u.full_name as created_by_name,
          v.visit_date
        FROM followups f
        LEFT JOIN users u ON f.created_by = u.id
        LEFT JOIN visits v ON f.visit_id = v.id
        WHERE f.patient_id = ?
        ORDER BY f.followup_date DESC
      `).all(patientId);
      
      return {
        success: true,
        followups: followups,
        count: followups.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get follow-ups by patient error:', error);
      return {
        success: false,
        message: 'Failed to retrieve follow-ups'
      };
    }
  });
  
  /**
   * GET ALL FOLLOW-UPS
   * Retrieves follow-ups with optional filters
   */
  ipcMain.handle('followups:getAll', async (event, filters = {}) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      let query = `
        SELECT 
          f.*,
          p.name as patient_name,
          p.phone as patient_phone,
          u.full_name as created_by_name
        FROM followups f
        LEFT JOIN patients p ON f.patient_id = p.id
        LEFT JOIN users u ON f.created_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // Status filter
      if (filters.status) {
        query += ` AND f.status = ?`;
        params.push(filters.status);
      }
      
      // Date range
      if (filters.start_date) {
        query += ` AND f.followup_date >= ?`;
        params.push(filters.start_date);
      }
      
      if (filters.end_date) {
        query += ` AND f.followup_date <= ?`;
        params.push(filters.end_date);
      }
      
      query += ` ORDER BY f.followup_date, f.created_at`;
      
      const followups = db.prepare(query).all(...params);
      
      return {
        success: true,
        followups: followups,
        count: followups.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get all follow-ups error:', error);
      return {
        success: false,
        message: 'Failed to retrieve follow-ups'
      };
    }
  });
  
  /**
   * UPDATE FOLLOW-UP STATUS
   * Updates the status of a follow-up
   */
  ipcMain.handle('followups:updateStatus', async (event, followupId, status) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!followupId || !status) {
        return { success: false, message: 'Follow-up ID and status are required' };
      }
      
      // Validate status
      const validStatuses = ['Pending', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return { success: false, message: 'Invalid status' };
      }
      
      // Update status
      db.prepare(`
        UPDATE followups
        SET status = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(status, followupId);
      
      console.log(`✅ Follow-up status updated to: ${status} (ID: ${followupId})`);
      
      return {
        success: true,
        message: 'Follow-up status updated successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Update follow-up status error:', error);
      return {
        success: false,
        message: 'Failed to update follow-up status'
      };
    }
  });
  
  /**
   * DELETE FOLLOW-UP
   * Deletes a follow-up
   */
  ipcMain.handle('followups:delete', async (event, followupId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!followupId) {
        return { success: false, message: 'Follow-up ID is required' };
      }
      
      // Delete follow-up
      db.prepare(`DELETE FROM followups WHERE id = ?`).run(followupId);
      
      console.log(`✅ Follow-up deleted (ID: ${followupId})`);
      
      return {
        success: true,
        message: 'Follow-up deleted successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Delete follow-up error:', error);
      return {
        success: false,
        message: 'Failed to delete follow-up'
      };
    }
  });
  
  /**
   * GET PENDING FOLLOW-UPS
   * Quick helper to get pending follow-ups
   */
  ipcMain.handle('followups:getPending', async (event) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      const followups = db.prepare(`
        SELECT 
          f.*,
          p.name as patient_name,
          p.phone as patient_phone
        FROM followups f
        JOIN patients p ON f.patient_id = p.id
        WHERE f.status = 'Pending'
        AND f.followup_date <= date('now', '+7 days')
        ORDER BY f.followup_date
      `).all();
      
      return {
        success: true,
        followups: followups,
        count: followups.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get pending follow-ups error:', error);
      return {
        success: false,
        message: 'Failed to retrieve pending follow-ups'
      };
    }
  });
};
