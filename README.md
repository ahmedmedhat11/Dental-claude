# 🦷 Dental Clinic Management System

A complete offline Windows Desktop application for dental clinic management built with Electron.js, Node.js, and SQLite.

## 📋 Features

- **Patient Management**: Complete patient records with referral system
- **Visit Tracking**: Detailed visit records with treatments and medications
- **Financial Management**: Invoicing, payments, and installments
- **Appointment Scheduling**: Calendar-based appointment system
- **Referral System**: Automated referral rewards and discounts
- **Role-Based Access**: Admin, Doctor, and User roles with permissions
- **Audit Logging**: Complete activity tracking
- **Automatic Backups**: Database backups on app close
- **Print Support**: Print prescriptions, invoices, and reports
- **WhatsApp Integration**: Quick patient communication
- **Offline First**: Works completely offline

## 🏗️ Project Structure

```
dental-clinic-system/
├── src/
│   ├── main.js                 # Electron main process
│   ├── preload.js              # Preload script (IPC bridge)
│   ├── database/
│   │   └── init-schema.js      # Database schema initialization
│   └── ipc/
│       ├── handlers.js         # Main IPC handler registry
│       ├── auth-handlers.js    # Authentication handlers
│       ├── user-handlers.js    # User management handlers
│       ├── patient-handlers.js # Patient management handlers
│       ├── visit-handlers.js   # Visit management handlers
│       ├── appointment-handlers.js
│       ├── medication-handlers.js
│       ├── referral-handlers.js
│       ├── invoice-handlers.js
│       ├── followup-handlers.js
│       ├── settings-handlers.js
│       ├── audit-handlers.js
│       ├── report-handlers.js
│       ├── print-handlers.js
│       ├── backup-handlers.js
│       └── util-handlers.js
├── renderer/
│   ├── index.html              # Main HTML file
│   ├── css/
│   │   └── styles.css          # Application styles
│   └── js/
│       └── renderer.js         # Renderer process logic
├── database/
│   ├── clinic.db               # SQLite database (created on first run)
│   └── backups/                # Automatic backups folder
├── assets/
│   ├── icon.ico                # Windows icon
│   └── icon.png                # Application icon
├── package.json                # NPM configuration
├── .env.example                # Environment template
└── README.md                   # This file
```

## 📊 Database Schema

### Tables Created:
1. **users** - System users with role-based access
2. **patients** - Patient records with referral codes
3. **visits** - Visit records with treatments
4. **medications** - Prescribed medications
5. **appointments** - Appointment scheduling
6. **invoices** - Financial records
7. **followups** - Follow-up reminders
8. **referrals** - Referral tracking
9. **settings** - System configuration
10. **audit_logs** - Activity logging

### Key Constraints:
- Foreign key enforcement enabled
- Unique constraints on critical fields
- Check constraints for data validation
- Generated columns for calculated values
- Proper indexes for performance

## 🚀 Installation & Setup

### Prerequisites:
- Node.js (v18 or higher)
- npm or yarn
- Windows 10/11 (for production)

### Step 1: Install Dependencies
```bash
cd dental-clinic-system
npm install
```

### Step 2: Configure Environment (Optional)
```bash
cp .env.example .env
# Edit .env with your configurations
```

### Step 3: Run in Development Mode
```bash
npm run dev
```

The application will:
- Create the SQLite database automatically
- Initialize all tables with proper schema
- Create a default admin user (username: admin, password: admin123)

## 🔨 Building for Production

### Build Windows Installer (.exe)
```bash
npm run build
```

This creates:
- NSIS installer in `dist/`
- Portable executable in `dist/`

### Build Portable Version Only
```bash
npm run build:portable
```

### Output Files:
```
dist/
├── Dental Clinic Manager-1.0.0-Setup.exe  # Installer
└── Dental Clinic Manager-1.0.0.exe        # Portable
```

## 🔐 Default Credentials

**Username:** admin  
**Password:** admin123

⚠️ **IMPORTANT:** Change the default password immediately after first login!

## 📁 Data Locations

### Development Mode:
- Database: `./database/clinic.db`
- Backups: `./database/backups/`

### Production Mode:
- Database: `%APPDATA%/dental-clinic-management/clinic.db`
- Backups: `%APPDATA%/dental-clinic-management/backups/`

## 🔧 Database Features

### Auto-Generated Fields:
- Patient referral codes (8 digits, unique)
- Invoice numbers (sequential)
- Visit remaining amount (calculated)
- Timestamps (created_at, updated_at)

### Validation:
- Patient name: 3-100 characters, letters only
- Phone: Egyptian format (201XXXXXXXXX)
- Referral codes: Validated before use
- Financial amounts: No negative values
- Discounts: 0-100 range

### Referral System:
- Configurable discount for new patients
- Configurable reward for referrers
- Automatic wallet balance updates
- Transaction-safe operations

## 🔒 Security Features

- Password hashing with bcrypt (10 rounds)
- Role-based access control
- Backend permission enforcement
- SQL injection prevention (prepared statements)
- Audit logging for sensitive operations
- No hard-coded credentials

## 💾 Backup System

### Automatic Backups:
- Created on app close
- Named: `backup_YYYY_MM_DD.db`
- Stored in backups folder
- Retention: 30 days (configurable)

### Manual Backup:
Users can create manual backups through the UI (Phase 7)

## 🎨 UI Features (Phase 6)

- Clean medical-themed interface
- Dark mode support
- Responsive sidebar navigation
- Fast performance
- Professional design

## 📱 WhatsApp Integration

- Direct patient messaging
- Pre-filled message support
- Egyptian phone format handling
- Click-to-open functionality

## 📊 Reports Available

- Dashboard statistics
- Financial reports
- Patient history
- Visit summaries
- Referral analytics

## 🛠️ Development Phases

- ✅ **Phase 1**: Project Foundation - COMPLETE
- ✅ **Phase 2**: Auth & Role System - COMPLETE
- ✅ **Phase 3**: Patient + Referral System - COMPLETE
- ⏳ **Phase 4**: Visits + Financial System - Backend Ready (UI in Phase 6)
- ⏳ **Phase 5**: Printing + WhatsApp - Backend Ready (UI in Phase 6)
- ⏳ **Phase 6**: Complete UI/UX Implementation
- ⏳ **Phase 7**: Backup System - Backend Ready (UI in Phase 6)

## 🐛 Troubleshooting

### Database locked error:
- Close all instances of the app
- Delete `.db-shm` and `.db-wal` files
- Restart the application

### Cannot find module errors:
```bash
rm -rf node_modules
npm install
```

### Build fails:
```bash
npm run postinstall
npm run build
```

## 📝 Development Notes

### Code Organization:
- Modular structure with separation of concerns
- Clean IPC communication pattern
- Type-safe database operations
- Error handling at all levels

### Best Practices:
- Use prepared statements
- Validate all inputs
- Log all critical operations
- Handle errors gracefully
- Test before production deployment

## 🔄 Database Migrations

Currently using SQLite with schema initialization on first run. For future schema changes:
1. Create migration scripts
2. Version your database
3. Test thoroughly before deployment

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review audit logs for errors
3. Check database backups
4. Consult the documentation

## 📄 License

MIT License - See LICENSE file for details

## ⚠️ Important Notes

1. **Always backup** before major updates
2. **Test thoroughly** in development before production
3. **Change default passwords** immediately
4. **Keep backups** in a secure location
5. **Monitor disk space** for database growth

---

**Version:** 1.0.0  
**Status:** Phase 3 Complete ✅  
**Current:** Patient Management & Referral System Fully Operational  
**Next:** Implementing remaining backend handlers, then complete UI/UX in Phase 6
