/**
 * Report Handlers
 * Handles dashboard statistics and reports
 */

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Report handlers loaded');
  
  /**
   * GET DASHBOARD STATS
   * Returns key statistics for dashboard
   */
  ipcMain.handle('reports:getDashboard', async (event) => {
    const db = getDatabase();
    
    try {
      global.requireAuth();
      
      // Total patients
      const totalPatients = db.prepare(`
        SELECT COUNT(*) as count FROM patients
      `).get().count;
      
      // Today's appointments
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = db.prepare(`
        SELECT COUNT(*) as count FROM appointments
        WHERE appointment_date = ? AND status != 'Cancelled'
      `).get(today).count;
      
      // Pending payments
      const pendingPayments = db.prepare(`
        SELECT COALESCE(SUM(amount_remaining), 0) as total
        FROM visits
        WHERE amount_remaining > 0
      `).get().total;
      
      // Monthly revenue
      const monthlyRevenue = db.prepare(`
        SELECT COALESCE(SUM(amount_paid), 0) as total
        FROM visits
        WHERE strftime('%Y-%m', visit_date) = strftime('%Y-%m', 'now')
      `).get().total;
      
      // Recent patients (last 7 days)
      const recentPatients = db.prepare(`
        SELECT COUNT(*) as count FROM patients
        WHERE date(created_at) >= date('now', '-7 days')
      `).get().count;
      
      // Pending follow-ups
      const pendingFollowups = db.prepare(`
        SELECT COUNT(*) as count FROM followups
        WHERE status = 'Pending' AND followup_date <= date('now', '+7 days')
      `).get().count;
      
      return {
        success: true,
        stats: {
          totalPatients,
          todayAppointments,
          pendingPayments,
          monthlyRevenue,
          recentPatients,
          pendingFollowups
        }
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get dashboard stats error:', error);
      return {
        success: false,
        message: 'Failed to retrieve dashboard statistics'
      };
    }
  });
  
  /**
   * GET FINANCIAL REPORT
   * Returns financial data for date range
   */
  ipcMain.handle('reports:getFinancial', async (event, startDate, endDate) => {
    const db = getDatabase();
    
    try {
      global.requireAuth();
      
      const report = db.prepare(`
        SELECT 
          COUNT(*) as total_visits,
          COALESCE(SUM(total_cost), 0) as total_revenue,
          COALESCE(SUM(amount_paid), 0) as total_collected,
          COALESCE(SUM(amount_remaining), 0) as total_pending,
          COALESCE(SUM(total_cost * discount / 100), 0) as total_discounts
        FROM visits
        WHERE date(visit_date) BETWEEN date(?) AND date(?)
      `).get(startDate, endDate);
      
      return {
        success: true,
        report: report,
        period: { start: startDate, end: endDate }
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get financial report error:', error);
      return {
        success: false,
        message: 'Failed to generate financial report'
      };
    }
  });
  
  /**
   * GET PATIENT REPORT
   * Returns comprehensive patient statistics
   */
  ipcMain.handle('reports:getPatient', async (event, patientId) => {
    const db = getDatabase();
    
    try {
      global.requireAuth();
      
      const patient = db.prepare(`SELECT * FROM patients WHERE id = ?`).get(patientId);
      if (!patient) {
        return { success: false, message: 'Patient not found' };
      }
      
      const visitStats = db.prepare(`
        SELECT 
          COUNT(*) as total_visits,
          COALESCE(SUM(total_cost), 0) as total_spent,
          COALESCE(SUM(amount_paid), 0) as total_paid,
          COALESCE(SUM(amount_remaining), 0) as total_pending
        FROM visits WHERE patient_id = ?
      `).get(patientId);
      
      const referralStats = db.prepare(`
        SELECT COUNT(*) as total_referrals
        FROM patients WHERE referred_by_code = ?
      `).get(patient.referral_code).total_referrals;
      
      return {
        success: true,
        patient: patient,
        visitStats: visitStats,
        referralStats: { total_referrals: referralStats }
      };
      
    } catch (error) {
      if (error.message === 'Authentication required') {
        return { success: false, message: error.message };
      }
      console.error('Get patient report error:', error);
      return {
        success: false,
        message: 'Failed to generate patient report'
      };
    }
  });
};
