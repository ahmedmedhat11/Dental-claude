/**
 * Authentication Handlers
 * Handles login, logout, session management, and password changes
 */

const bcrypt = require('bcrypt');

// In-memory session storage
let currentSession = null;

/**
 * Create audit log entry
 */
function createAuditLog(db, userId, action, tableName, recordId = null, oldValues = null, newValues = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      userId,
      action,
      tableName,
      recordId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null
    );
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Sanitize user object (remove sensitive data)
 */
function sanitizeUser(user) {
  if (!user) return null;
  
  const { password_hash, ...sanitized } = user;
  return sanitized;
}

module.exports = function(ipcMain, getDatabase) {
  console.log('✅ Auth handlers loaded');
  
  /**
   * LOGIN
   * Authenticates user with username and password
   */
  ipcMain.handle('auth:login', async (event, username, password) => {
    const db = getDatabase();
    
    try {
      // Validate input
      if (!username || !password) {
        return {
          success: false,
          message: 'Username and password are required'
        };
      }
      
      // Find user by username (case-insensitive)
      const user = db.prepare(`
        SELECT * FROM users 
        WHERE username = ? COLLATE NOCASE
      `).get(username.trim());
      
      // Check if user exists
      if (!user) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }
      
      // Check if user is active
      if (!user.is_active) {
        return {
          success: false,
          message: 'Account is disabled. Contact administrator.'
        };
      }
      
      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordMatch) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }
      
      // Update last login timestamp
      db.prepare(`
        UPDATE users 
        SET last_login = datetime('now', 'localtime')
        WHERE id = ?
      `).run(user.id);
      
      // Create session
      currentSession = {
        userId: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        loginTime: new Date().toISOString()
      };
      
      // Create audit log
      createAuditLog(db, user.id, 'LOGIN', 'users', user.id);
      
      console.log(`✅ User logged in: ${user.username} (${user.role})`);
      
      return {
        success: true,
        user: sanitizeUser({
          ...user,
          last_login: new Date().toISOString()
        })
      };
      
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  });
  
  /**
   * LOGOUT
   * Clears current session
   */
  ipcMain.handle('auth:logout', async (event) => {
    const db = getDatabase();
    
    try {
      if (currentSession) {
        // Create audit log
        createAuditLog(db, currentSession.userId, 'LOGOUT', 'users', currentSession.userId);
        
        console.log(`✅ User logged out: ${currentSession.username}`);
        
        // Clear session
        currentSession = null;
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Logout error:', error);
      currentSession = null;
      return { success: true };
    }
  });
  
  /**
   * GET CURRENT USER
   * Returns the currently logged-in user
   */
  ipcMain.handle('auth:getCurrentUser', async (event) => {
    const db = getDatabase();
    
    try {
      if (!currentSession) {
        return null;
      }
      
      // Fetch fresh user data
      const user = db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get(currentSession.userId);
      
      if (!user || !user.is_active) {
        currentSession = null;
        return null;
      }
      
      return sanitizeUser(user);
      
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  });
  
  /**
   * CHANGE PASSWORD
   * Allows user to change their password
   */
  ipcMain.handle('auth:changePassword', async (event, oldPassword, newPassword) => {
    const db = getDatabase();
    
    try {
      // Check if user is logged in
      if (!currentSession) {
        return {
          success: false,
          message: 'Not authenticated'
        };
      }
      
      // Validate input
      if (!oldPassword || !newPassword) {
        return {
          success: false,
          message: 'Both old and new passwords are required'
        };
      }
      
      // Validate new password length
      if (newPassword.length < 6) {
        return {
          success: false,
          message: 'New password must be at least 6 characters long'
        };
      }
      
      // Get current user
      const user = db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get(currentSession.userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Verify old password
      const passwordMatch = await bcrypt.compare(oldPassword, user.password_hash);
      
      if (!passwordMatch) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }
      
      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      // Update password
      db.prepare(`
        UPDATE users 
        SET password_hash = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(newPasswordHash, user.id);
      
      // Create audit log
      createAuditLog(db, user.id, 'PASSWORD_CHANGE', 'users', user.id);
      
      console.log(`✅ Password changed for user: ${user.username}`);
      
      return {
        success: true,
        message: 'Password changed successfully'
      };
      
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Failed to change password'
      };
    }
  });
  
  /**
   * CHECK PERMISSION
   * Internal helper to check if current user has required role
   */
  ipcMain.handle('auth:checkPermission', async (event, requiredRole) => {
    try {
      if (!currentSession) {
        return { hasPermission: false, message: 'Not authenticated' };
      }
      
      const roleHierarchy = {
        'Admin': 3,
        'Doctor': 2,
        'User': 1
      };
      
      const userLevel = roleHierarchy[currentSession.role] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;
      
      if (userLevel >= requiredLevel) {
        return { hasPermission: true };
      } else {
        return {
          hasPermission: false,
          message: `This action requires ${requiredRole} role or higher`
        };
      }
      
    } catch (error) {
      console.error('Permission check error:', error);
      return { hasPermission: false, message: 'Permission check failed' };
    }
  });
  
  /**
   * Export helper to check authentication in other handlers
   */
  global.requireAuth = function() {
    if (!currentSession) {
      throw new Error('Authentication required');
    }
    return currentSession;
  };
  
  /**
   * Export helper to check permission in other handlers
   */
  global.requireRole = function(requiredRole) {
    const session = global.requireAuth();
    
    const roleHierarchy = {
      'Admin': 3,
      'Doctor': 2,
      'User': 1
    };
    
    const userLevel = roleHierarchy[session.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    if (userLevel < requiredLevel) {
      throw new Error(`This action requires ${requiredRole} role or higher`);
    }
    
    return session;
  };
  
  /**
   * Export audit log helper for use in other handlers
   */
  global.createAuditLog = createAuditLog;
};
