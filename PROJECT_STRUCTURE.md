# 🏗️ PROJECT STRUCTURE VISUALIZATION

## Complete File Tree

```
dental-clinic-system/
│
├── 📄 package.json                   # NPM configuration & dependencies
├── 📄 .env.example                   # Environment variables template
├── 📄 .gitignore                     # Git ignore rules
├── 📄 README.md                      # Main documentation
├── 📄 BUILD_INSTRUCTIONS.md          # Detailed build guide
├── 📄 DATABASE_SCHEMA.md             # Database reference
│
├── 📁 src/                           # SOURCE CODE
│   │
│   ├── 📄 main.js                    # ⚡ Electron main process
│   │   ├── Window management
│   │   ├── Database initialization
│   │   ├── Backup system
│   │   └── App lifecycle
│   │
│   ├── 📄 preload.js                 # 🔒 IPC Security bridge
│   │   ├── API exposure to renderer
│   │   ├── Context isolation
│   │   └── Event handlers
│   │
│   ├── 📁 database/
│   │   └── 📄 init-schema.js         # 🗄️ Database schema
│   │       ├── Table creation
│   │       ├── Indexes
│   │       ├── Constraints
│   │       ├── Default settings
│   │       └── Default admin user
│   │
│   └── 📁 ipc/                       # IPC HANDLERS
│       ├── 📄 handlers.js            # Handler registry
│       ├── 📄 auth-handlers.js       # Authentication (Phase 2)
│       ├── 📄 user-handlers.js       # User management (Phase 2)
│       ├── 📄 patient-handlers.js    # Patient CRUD (Phase 3)
│       ├── 📄 visit-handlers.js      # Visit management (Phase 4)
│       ├── 📄 appointment-handlers.js
│       ├── 📄 medication-handlers.js
│       ├── 📄 referral-handlers.js   # Referral system (Phase 3)
│       ├── 📄 invoice-handlers.js    # Financial (Phase 4)
│       ├── 📄 followup-handlers.js
│       ├── 📄 settings-handlers.js
│       ├── 📄 audit-handlers.js
│       ├── 📄 report-handlers.js
│       ├── 📄 print-handlers.js      # Printing (Phase 5)
│       ├── 📄 backup-handlers.js     # Backup system (Phase 7)
│       └── 📄 util-handlers.js       # Utilities
│
├── 📁 renderer/                      # FRONTEND
│   │
│   ├── 📄 index.html                 # Main HTML
│   │
│   ├── 📁 css/
│   │   └── 📄 styles.css             # Base styles & theme
│   │
│   └── 📁 js/
│       └── 📄 renderer.js            # UI logic & state
│
├── 📁 database/                      # DATABASE (created at runtime)
│   ├── 📄 clinic.db                  # SQLite database
│   ├── 📄 clinic.db-shm              # Shared memory (WAL mode)
│   ├── 📄 clinic.db-wal              # Write-ahead log
│   └── 📁 backups/
│       └── 📄 backup_YYYY_MM_DD.db
│
├── 📁 assets/                        # ASSETS
│   ├── 🖼️ icon.ico                   # Windows icon
│   └── 🖼️ icon.png                   # App icon
│
├── 📁 node_modules/                  # Dependencies (npm install)
│
└── 📁 dist/                          # BUILD OUTPUT (npm run build)
    ├── 📁 win-unpacked/              # Unpacked application
    ├── 📦 Dental Clinic Manager-1.0.0-Setup.exe
    └── 📦 Dental Clinic Manager-1.0.0.exe
```

---

## 📊 Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ELECTRON MAIN PROCESS                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │                    main.js                         │ │
│  │  • Window Management                               │ │
│  │  • Database Connection                             │ │
│  │  • Backup System                                   │ │
│  │  • App Lifecycle                                   │ │
│  └────────────────────────────────────────────────────┘ │
│                           ↕                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │              IPC HANDLERS (src/ipc/)               │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │     Auth     │  │     User     │               │ │
│  │  └──────────────┘  └──────────────┘               │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │   Patient    │  │    Visit     │               │ │
│  │  └──────────────┘  └──────────────┘               │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │   Invoice    │  │   Referral   │               │ │
│  │  └──────────────┘  └──────────────┘               │ │
│  └────────────────────────────────────────────────────┘ │
│                           ↕                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │          SQLite Database (better-sqlite3)          │ │
│  │  • 10 Tables with relationships                    │ │
│  │  • Foreign keys enforced                           │ │
│  │  • Automatic backups                               │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↕
                    ┌───────────────┐
                    │  preload.js   │  (Security Bridge)
                    │  • IPC Expose │
                    │  • Context    │
                    │    Isolation  │
                    └───────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                  RENDERER PROCESS (UI)                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │                 renderer.js                        │ │
│  │  • App State                                       │ │
│  │  • Page Routing                                    │ │
│  │  • Event Handlers                                  │ │
│  └────────────────────────────────────────────────────┘ │
│                           ↕                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │               HTML + CSS (UI Layer)                │ │
│  │  • Login Screen                                    │ │
│  │  • Dashboard (Phase 6)                             │ │
│  │  • Patient Management (Phase 3)                    │ │
│  │  • Visit Management (Phase 4)                      │ │
│  │  • Reports & Settings                              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Example: Creating a Patient with Referral

```
USER ACTION (Renderer)
    ↓
renderer.js: Validate input
    ↓
window.electronAPI.createPatient(data)
    ↓
preload.js: ipcRenderer.invoke('patients:create')
    ↓
patient-handlers.js: Receive request
    ↓
Validate referral code (if provided)
    ↓
Start SQLite transaction
    ↓
Check referral code in patients table
    ↓
Calculate discount from settings
    ↓
Insert new patient
    ↓
Update referrer wallet_balance
    ↓
Insert referral record
    ↓
Create audit log
    ↓
Commit transaction
    ↓
Return success to renderer
    ↓
Update UI
```

---

## 📦 Dependencies Breakdown

### Production Dependencies:
```json
{
  "bcrypt": "^5.1.1",           // Password hashing
  "better-sqlite3": "^9.2.2",   // SQLite database
  "dotenv": "^16.3.1",          // Environment config
  "electron-store": "^8.1.0",   // Persistent storage
  "uuid": "^9.0.1"              // Unique IDs
}
```

### Development Dependencies:
```json
{
  "electron": "^28.1.0",         // Framework
  "electron-builder": "^24.9.1"  // Build tool
}
```

---

## 🗂️ File Sizes (Approximate)

```
Source Code:
├── src/main.js                 ~8 KB
├── src/preload.js              ~5 KB
├── src/database/init-schema.js ~15 KB
├── src/ipc/*.js (15 files)     ~3-5 KB each
├── renderer/js/renderer.js     ~6 KB
├── renderer/css/styles.css     ~8 KB
└── Total Source:               ~150 KB

Database (empty):
└── clinic.db                   ~100 KB

After Build:
├── Installer (.exe)            ~120 MB
└── Portable (.exe)             ~170 MB
```

---

## 🎯 Module Responsibilities

### main.js (Main Process):
- ✅ Create BrowserWindow
- ✅ Initialize database
- ✅ Handle app lifecycle
- ✅ Create backups on close
- ✅ Register IPC handlers

### preload.js (Security Layer):
- ✅ Expose safe IPC API
- ✅ Maintain context isolation
- ✅ No direct Node.js access
- ✅ Event listener setup

### init-schema.js (Database):
- ✅ Create all tables
- ✅ Set up indexes
- ✅ Add constraints
- ✅ Insert default data
- ✅ Transaction handling

### handlers.js (IPC Registry):
- ✅ Register all IPC handlers
- ✅ Route requests to modules
- ✅ Handle WhatsApp integration
- ⏳ Phase 2-7 implementations

### renderer.js (UI Controller):
- ✅ App state management
- ✅ Page routing
- ✅ Event handling
- ⏳ Full UI (Phase 6)

---

## 🔐 Security Layers

```
┌────────────────────────────────────┐
│     Renderer Process (Sandboxed)   │
│     • No Node.js access            │
│     • No file system access        │
│     • Only electronAPI available   │
└────────────────────────────────────┘
              ↕ (IPC)
┌────────────────────────────────────┐
│     Preload Script (Bridge)        │
│     • Context isolation ON         │
│     • Selective API exposure       │
│     • No eval/remote execution     │
└────────────────────────────────────┘
              ↕ (IPC)
┌────────────────────────────────────┐
│     Main Process (Privileged)      │
│     • Full Node.js access          │
│     • Database operations          │
│     • File system access           │
│     • Role-based permissions       │
└────────────────────────────────────┘
              ↕
┌────────────────────────────────────┐
│     SQLite Database                │
│     • Prepared statements          │
│     • Foreign key constraints      │
│     • Data validation              │
└────────────────────────────────────┘
```

---

## 📝 Development Phases Status

| Phase | Status | Files Created |
|-------|--------|---------------|
| Phase 1: Foundation | ✅ COMPLETE | All structure files |
| Phase 2: Auth System | ⏳ Pending | auth-handlers.js, user-handlers.js |
| Phase 3: Patient/Referral | ⏳ Pending | patient-handlers.js, referral-handlers.js |
| Phase 4: Visits/Financial | ⏳ Pending | visit-handlers.js, invoice-handlers.js |
| Phase 5: Print/WhatsApp | ⏳ Pending | print-handlers.js |
| Phase 6: UI Structure | ⏳ Pending | Full UI components |
| Phase 7: Backup System | ⏳ Pending | backup-handlers.js |

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Build portable only
npm run build:portable
```

---

## 📊 Database Tables (10 Total)

1. ✅ **users** - System users & authentication
2. ✅ **patients** - Patient records & referrals
3. ✅ **visits** - Treatment records
4. ✅ **medications** - Prescriptions
5. ✅ **appointments** - Scheduling
6. ✅ **invoices** - Financial records
7. ✅ **followups** - Follow-up reminders
8. ✅ **referrals** - Referral tracking
9. ✅ **settings** - System config
10. ✅ **audit_logs** - Activity logs

---

**Project Status:** Phase 1 Complete ✅  
**Next Step:** Awaiting confirmation for Phase 2  
**Total Files Created:** 27  
**Lines of Code:** ~1,500+
