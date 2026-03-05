/**
 * Medication Management Handlers
 * Handles prescription management for visits
 */

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Medication management handlers loaded');
  
  /**
   * CREATE MEDICATION
   * Adds a medication to a visit
   */
  ipcMain.handle('medications:create', async (event, medicationData) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      const session = global.requireAuth();
      
      // Validate required fields
      if (!medicationData.visit_id || !medicationData.medication_name) {
        return {
          success: false,
          message: 'Visit ID and medication name are required'
        };
      }
      
      // Verify visit exists
      const visit = db.prepare(`
        SELECT id FROM visits WHERE id = ?
      `).get(medicationData.visit_id);
      
      if (!visit) {
        return { success: false, message: 'Visit not found' };
      }
      
      // Insert medication
      const result = db.prepare(`
        INSERT INTO medications (
          visit_id, medication_name, dosage, frequency, duration, instructions
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        medicationData.visit_id,
        medicationData.medication_name.trim(),
        medicationData.dosage || null,
        medicationData.frequency || null,
        medicationData.duration || null,
        medicationData.instructions || null
      );
      
      console.log(`✅ Medication added: ${medicationData.medication_name} to visit ${medicationData.visit_id}`);
      
      return {
        success: true,
        medicationId: result.lastInsertRowid,
        message: 'Medication added successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Create medication error:', error);
      return {
        success: false,
        message: 'Failed to add medication'
      };
    }
  });
  
  /**
   * GET MEDICATIONS BY VISIT
   * Retrieves all medications for a specific visit
   */
  ipcMain.handle('medications:getByVisit', async (event, visitId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!visitId) {
        return { success: false, message: 'Visit ID is required' };
      }
      
      const medications = db.prepare(`
        SELECT * FROM medications
        WHERE visit_id = ?
        ORDER BY created_at
      `).all(visitId);
      
      return {
        success: true,
        medications: medications,
        count: medications.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get medications by visit error:', error);
      return {
        success: false,
        message: 'Failed to retrieve medications'
      };
    }
  });
  
  /**
   * UPDATE MEDICATION
   * Updates medication information
   */
  ipcMain.handle('medications:update', async (event, medicationId, medicationData) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!medicationId) {
        return { success: false, message: 'Medication ID is required' };
      }
      
      // Check medication exists
      const existing = db.prepare(`
        SELECT * FROM medications WHERE id = ?
      `).get(medicationId);
      
      if (!existing) {
        return { success: false, message: 'Medication not found' };
      }
      
      // Build update query
      const updates = [];
      const values = [];
      
      if (medicationData.medication_name !== undefined) {
        if (!medicationData.medication_name.trim()) {
          return { success: false, message: 'Medication name cannot be empty' };
        }
        updates.push('medication_name = ?');
        values.push(medicationData.medication_name.trim());
      }
      
      if (medicationData.dosage !== undefined) {
        updates.push('dosage = ?');
        values.push(medicationData.dosage || null);
      }
      
      if (medicationData.frequency !== undefined) {
        updates.push('frequency = ?');
        values.push(medicationData.frequency || null);
      }
      
      if (medicationData.duration !== undefined) {
        updates.push('duration = ?');
        values.push(medicationData.duration || null);
      }
      
      if (medicationData.instructions !== undefined) {
        updates.push('instructions = ?');
        values.push(medicationData.instructions || null);
      }
      
      if (updates.length === 0) {
        return { success: false, message: 'No fields to update' };
      }
      
      // Update medication
      values.push(medicationId);
      db.prepare(`
        UPDATE medications
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
      
      // Get updated medication
      const updated = db.prepare(`
        SELECT * FROM medications WHERE id = ?
      `).get(medicationId);
      
      console.log(`✅ Medication updated (ID: ${medicationId})`);
      
      return {
        success: true,
        medication: updated,
        message: 'Medication updated successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Update medication error:', error);
      return {
        success: false,
        message: 'Failed to update medication'
      };
    }
  });
  
  /**
   * DELETE MEDICATION
   * Deletes a medication record
   */
  ipcMain.handle('medications:delete', async (event, medicationId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!medicationId) {
        return { success: false, message: 'Medication ID is required' };
      }
      
      // Check medication exists
      const medication = db.prepare(`
        SELECT * FROM medications WHERE id = ?
      `).get(medicationId);
      
      if (!medication) {
        return { success: false, message: 'Medication not found' };
      }
      
      // Delete medication
      db.prepare(`DELETE FROM medications WHERE id = ?`).run(medicationId);
      
      console.log(`✅ Medication deleted: ${medication.medication_name} (ID: ${medicationId})`);
      
      return {
        success: true,
        message: 'Medication deleted successfully'
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Delete medication error:', error);
      return {
        success: false,
        message: 'Failed to delete medication'
      };
    }
  });
  
  /**
   * GET MEDICATIONS BY PATIENT
   * Retrieves all medications ever prescribed to a patient
   */
  ipcMain.handle('medications:getByPatient', async (event, patientId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!patientId) {
        return { success: false, message: 'Patient ID is required' };
      }
      
      const medications = db.prepare(`
        SELECT 
          m.*,
          v.visit_date,
          v.diagnosis
        FROM medications m
        JOIN visits v ON m.visit_id = v.id
        WHERE v.patient_id = ?
        ORDER BY v.visit_date DESC, m.created_at DESC
      `).all(patientId);
      
      return {
        success: true,
        medications: medications,
        count: medications.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get medications by patient error:', error);
      return {
        success: false,
        message: 'Failed to retrieve medications'
      };
    }
  });
};
