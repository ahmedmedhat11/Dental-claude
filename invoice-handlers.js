/**
 * Invoice Management Handlers
 * Handles invoice retrieval and financial records
 */

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Invoice management handlers loaded');
  
  /**
   * GET INVOICES BY PATIENT
   * Retrieves all invoices for a specific patient
   */
  ipcMain.handle('invoices:getByPatient', async (event, patientId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!patientId) {
        return { success: false, message: 'Patient ID is required' };
      }
      
      const invoices = db.prepare(`
        SELECT 
          i.*,
          v.visit_date,
          v.diagnosis,
          v.treatment,
          u.full_name as created_by_name
        FROM invoices i
        LEFT JOIN visits v ON i.visit_id = v.id
        LEFT JOIN users u ON i.created_by = u.id
        WHERE i.patient_id = ?
        ORDER BY i.created_at DESC
      `).all(patientId);
      
      // Calculate totals
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
      const totalPending = invoices.reduce((sum, inv) => 
        sum + (inv.net_amount - inv.amount_paid), 0
      );
      
      return {
        success: true,
        invoices: invoices,
        count: invoices.length,
        summary: {
          totalAmount: totalAmount,
          totalPaid: totalPaid,
          totalPending: totalPending
        }
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get invoices by patient error:', error);
      return {
        success: false,
        message: 'Failed to retrieve invoices'
      };
    }
  });
  
  /**
   * GET INVOICE BY ID
   * Retrieves detailed invoice information
   */
  ipcMain.handle('invoices:getById', async (event, invoiceId) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!invoiceId) {
        return { success: false, message: 'Invoice ID is required' };
      }
      
      const invoice = db.prepare(`
        SELECT 
          i.*,
          v.visit_date,
          v.complaint,
          v.diagnosis,
          v.treatment,
          v.tooth_number,
          p.name as patient_name,
          p.phone as patient_phone,
          p.age as patient_age,
          p.gender as patient_gender,
          p.address as patient_address,
          u.full_name as created_by_name
        FROM invoices i
        LEFT JOIN visits v ON i.visit_id = v.id
        LEFT JOIN patients p ON i.patient_id = p.id
        LEFT JOIN users u ON i.created_by = u.id
        WHERE i.id = ?
      `).get(invoiceId);
      
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }
      
      // Get medications for this visit
      let medications = [];
      if (invoice.visit_id) {
        medications = db.prepare(`
          SELECT * FROM medications
          WHERE visit_id = ?
          ORDER BY created_at
        `).all(invoice.visit_id);
      }
      
      // Get clinic info from settings
      const clinicInfo = {};
      const settings = db.prepare(`
        SELECT setting_key, setting_value
        FROM settings
        WHERE setting_key IN ('clinic_name', 'clinic_phone', 'clinic_address', 'currency_symbol')
      `).all();
      
      settings.forEach(s => {
        clinicInfo[s.setting_key] = s.setting_value;
      });
      
      return {
        success: true,
        invoice: invoice,
        medications: medications,
        clinicInfo: clinicInfo
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get invoice by ID error:', error);
      return {
        success: false,
        message: 'Failed to retrieve invoice'
      };
    }
  });
  
  /**
   * GET ALL INVOICES
   * Retrieves all invoices with optional filters
   */
  ipcMain.handle('invoices:getAll', async (event, filters = {}) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      let query = `
        SELECT 
          i.*,
          p.name as patient_name,
          p.phone as patient_phone,
          v.visit_date,
          u.full_name as created_by_name
        FROM invoices i
        LEFT JOIN patients p ON i.patient_id = p.id
        LEFT JOIN visits v ON i.visit_id = v.id
        LEFT JOIN users u ON i.created_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // Date range filter
      if (filters.start_date) {
        query += ` AND date(i.created_at) >= date(?)`;
        params.push(filters.start_date);
      }
      
      if (filters.end_date) {
        query += ` AND date(i.created_at) <= date(?)`;
        params.push(filters.end_date);
      }
      
      // Payment status filter
      if (filters.payment_status === 'paid') {
        query += ` AND (i.net_amount - i.amount_paid) = 0`;
      } else if (filters.payment_status === 'pending') {
        query += ` AND (i.net_amount - i.amount_paid) > 0`;
      }
      
      query += ` ORDER BY i.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
      }
      
      const invoices = db.prepare(query).all(...params);
      
      // Calculate summary
      const summary = {
        totalInvoices: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
        totalPaid: invoices.reduce((sum, inv) => sum + inv.amount_paid, 0),
        totalPending: invoices.reduce((sum, inv) => sum + (inv.net_amount - inv.amount_paid), 0),
        totalDiscount: invoices.reduce((sum, inv) => sum + inv.discount_amount, 0)
      };
      
      return {
        success: true,
        invoices: invoices,
        summary: summary
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get all invoices error:', error);
      return {
        success: false,
        message: 'Failed to retrieve invoices'
      };
    }
  });
  
  /**
   * SEARCH INVOICES
   * Search invoices by number or patient
   */
  ipcMain.handle('invoices:search', async (event, searchTerm) => {
    const db = getDatabase();
    
    try {
      // Check authentication
      global.requireAuth();
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return {
          success: false,
          message: 'Search term must be at least 2 characters'
        };
      }
      
      const term = `%${searchTerm}%`;
      
      const invoices = db.prepare(`
        SELECT 
          i.*,
          p.name as patient_name,
          p.phone as patient_phone,
          v.visit_date
        FROM invoices i
        LEFT JOIN patients p ON i.patient_id = p.id
        LEFT JOIN visits v ON i.visit_id = v.id
        WHERE i.invoice_number LIKE ? OR p.name LIKE ? OR p.phone LIKE ?
        ORDER BY i.created_at DESC
        LIMIT 50
      `).all(term, term, term);
      
      return {
        success: true,
        invoices: invoices,
        count: invoices.length
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Search invoices error:', error);
      return {
        success: false,
        message: 'Failed to search invoices'
      };
    }
  });
};
