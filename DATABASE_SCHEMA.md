# 📊 DATABASE SCHEMA QUICK REFERENCE

## Table of Contents
- [Users](#users)
- [Patients](#patients)
- [Visits](#visits)
- [Medications](#medications)
- [Appointments](#appointments)
- [Invoices](#invoices)
- [Follow-ups](#followups)
- [Referrals](#referrals)
- [Settings](#settings)
- [Audit Logs](#audit_logs)

---

## USERS

Stores system users with role-based access control.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Auto-increment user ID |
| username | TEXT | NOT NULL, UNIQUE | Login username (case-insensitive) |
| password_hash | TEXT | NOT NULL | Bcrypt hashed password |
| full_name | TEXT | NOT NULL | User's full name |
| role | TEXT | NOT NULL | Admin, Doctor, or User |
| is_active | INTEGER | DEFAULT 1 | 1=active, 0=inactive |
| created_at | TEXT | DEFAULT NOW | Creation timestamp |
| updated_at | TEXT | DEFAULT NOW | Last update timestamp |
| last_login | TEXT | NULL | Last login timestamp |

**Indexes:** username, role, is_active

**Default User:** admin / admin123 (⚠️ Change immediately!)

---

## PATIENTS

Patient records with referral system integration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Patient ID |
| name | TEXT | NOT NULL, 3-100 chars | Patient full name (letters only) |
| phone | TEXT | NOT NULL, UNIQUE | Egyptian format: 201XXXXXXXXX |
| age | INTEGER | 0-150 or NULL | Patient age |
| gender | TEXT | Male/Female or NULL | Patient gender |
| address | TEXT | NULL | Physical address |
| medical_history | TEXT | NULL | Medical history notes |
| referral_code | TEXT | NOT NULL, UNIQUE, 8 digits | Patient's unique referral code |
| referred_by_code | TEXT | FK → patients.referral_code | Who referred this patient |
| wallet_balance | REAL | DEFAULT 0, ≥0 | Referral rewards balance |
| created_by | INTEGER | FK → users.id | User who created record |
| created_at | TEXT | DEFAULT NOW | Creation timestamp |
| updated_at | TEXT | DEFAULT NOW | Last update timestamp |

**Indexes:** phone, referral_code, referred_by_code, name, created_at

**Constraints:**
- Phone must be exactly 13 characters, start with "201"
- Name must be 3-100 characters
- Referral code auto-generated, 8 digits
- Cannot refer yourself

---

## VISITS

Visit records with treatment and financial tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Visit ID |
| patient_id | INTEGER | FK → patients.id, CASCADE | Patient reference |
| visit_date | TEXT | DEFAULT NOW | Visit date/time |
| complaint | TEXT | NULL | Chief complaint |
| diagnosis | TEXT | NULL | Diagnosis |
| treatment | TEXT | NULL | Treatment provided |
| tooth_number | TEXT | NULL | Tooth number(s) |
| total_cost | REAL | DEFAULT 0, ≥0 | Total treatment cost |
| discount | REAL | DEFAULT 0, 0-100 | Discount percentage |
| amount_paid | REAL | DEFAULT 0, ≥0 | Amount paid so far |
| amount_remaining | REAL | GENERATED/STORED | Auto-calculated remaining |
| notes | TEXT | NULL | Additional notes |
| created_by | INTEGER | FK → users.id | User who created record |
| created_at | TEXT | DEFAULT NOW | Creation timestamp |
| updated_at | TEXT | DEFAULT NOW | Last update timestamp |

**Indexes:** patient_id, visit_date, created_by, amount_remaining

**Calculation:** amount_remaining = total_cost - (total_cost × discount / 100) - amount_paid

**Constraints:**
- amount_paid cannot exceed (total_cost - discount)
- All amounts must be ≥ 0
- Discount must be 0-100

---

## MEDICATIONS

Prescribed medications linked to visits.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Medication ID |
| visit_id | INTEGER | FK → visits.id, CASCADE | Visit reference |
| medication_name | TEXT | NOT NULL | Drug name |
| dosage | TEXT | NULL | Dosage (e.g., "500mg") |
| frequency | TEXT | NULL | How often (e.g., "3x daily") |
| duration | TEXT | NULL | Duration (e.g., "7 days") |
| instructions | TEXT | NULL | Special instructions |
| created_at | TEXT | DEFAULT NOW | Creation timestamp |

**Indexes:** visit_id

---

## APPOINTMENTS

Appointment scheduling system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Appointment ID |
| patient_id | INTEGER | FK → patients.id, CASCADE | Patient reference |
| appointment_date | TEXT | NOT NULL | Date (YYYY-MM-DD) |
| appointment_time | TEXT | NOT NULL | Time (HH:MM) |
| duration_minutes | INTEGER | DEFAULT 30 | Duration in minutes |
| status | TEXT | DEFAULT 'Scheduled' | Scheduled/Confirmed/Completed/Cancelled/No-Show |
| notes | TEXT | NULL | Appointment notes |
| created_by | INTEGER | FK → users.id | User who created |
| created_at | TEXT | DEFAULT NOW | Creation timestamp |
| updated_at | TEXT | DEFAULT NOW | Last update timestamp |

**Indexes:** patient_id, appointment_date, status, (date,time) UNIQUE

**Constraint:** No overlapping appointments (unique date+time)

---

## INVOICES

Financial records and receipts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Invoice ID |
| invoice_number | TEXT | NOT NULL, UNIQUE | Sequential invoice number |
| patient_id | INTEGER | FK → patients.id | Patient reference |
| visit_id | INTEGER | FK → visits.id | Visit reference |
| total_amount | REAL | NOT NULL, ≥0 | Total before discount |
| discount_amount | REAL | DEFAULT 0, ≥0 | Discount amount |
| net_amount | REAL | NOT NULL, ≥0 | Total after discount |
| amount_paid | REAL | DEFAULT 0, ≥0 | Amount paid |
| payment_method | TEXT | Cash/Card/Transfer/Other | Payment method |
| notes | TEXT | NULL | Invoice notes |
| created_by | INTEGER | FK → users.id | User who created |
| created_at | TEXT | DEFAULT NOW | Creation timestamp |

**Indexes:** patient_id, visit_id, invoice_number, created_at

**Invoice Number Format:** {PREFIX}-{SEQUENTIAL} (e.g., INV-001)

---

## FOLLOWUPS

Follow-up reminders and tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Follow-up ID |
| patient_id | INTEGER | FK → patients.id, CASCADE | Patient reference |
| visit_id | INTEGER | FK → visits.id, SET NULL | Related visit |
| followup_date | TEXT | NOT NULL | Follow-up date |
| reason | TEXT | NOT NULL | Reason for follow-up |
| status | TEXT | DEFAULT 'Pending' | Pending/Completed/Cancelled |
| notes | TEXT | NULL | Additional notes |
| created_by | INTEGER | FK → users.id | User who created |
| created_at | TEXT | DEFAULT NOW | Creation timestamp |
| updated_at | TEXT | DEFAULT NOW | Last update timestamp |

**Indexes:** patient_id, followup_date, status

---

## REFERRALS

Detailed referral tracking (optional - for analytics).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Referral ID |
| referrer_patient_id | INTEGER | FK → patients.id | Who referred |
| referred_patient_id | INTEGER | FK → patients.id | Who was referred |
| referral_date | TEXT | DEFAULT NOW | When referral occurred |
| discount_given | REAL | DEFAULT 0 | Discount given to new patient |
| reward_earned | REAL | DEFAULT 0 | Reward to referrer |
| status | TEXT | DEFAULT 'Active' | Active/Redeemed/Expired |
| created_at | TEXT | DEFAULT NOW | Creation timestamp |

**Indexes:** referrer_patient_id, referred_patient_id, status

**Constraint:** UNIQUE(referrer_patient_id, referred_patient_id)

---

## SETTINGS

System configuration key-value store.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Setting ID |
| setting_key | TEXT | NOT NULL, UNIQUE | Setting identifier |
| setting_value | TEXT | NOT NULL | Setting value |
| description | TEXT | NULL | Setting description |
| updated_by | INTEGER | FK → users.id | Last updated by |
| updated_at | TEXT | DEFAULT NOW | Last update timestamp |

**Indexes:** setting_key

**Default Settings:**
```
clinic_name = "Dental Clinic"
clinic_phone = "201234567890"
clinic_address = "Address goes here"
referral_discount_new_patient = "10"  (percentage)
referral_reward_owner = "50"  (currency amount)
invoice_prefix = "INV"
currency_symbol = "EGP"
tax_rate = "0"  (percentage)
appointment_duration_default = "30"  (minutes)
```

---

## AUDIT_LOGS

Activity logging for security and compliance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Log ID |
| user_id | INTEGER | FK → users.id | User who performed action |
| action | TEXT | NOT NULL | Action type (CREATE/UPDATE/DELETE) |
| table_name | TEXT | NOT NULL | Affected table |
| record_id | INTEGER | NULL | Affected record ID |
| old_values | TEXT | NULL | JSON of old values |
| new_values | TEXT | NULL | JSON of new values |
| ip_address | TEXT | NULL | IP address (if applicable) |
| created_at | TEXT | DEFAULT NOW | When action occurred |

**Indexes:** user_id, action, table_name, created_at

**Actions to Log:**
- User creation/modification/deletion
- Financial record changes
- Discount modifications
- Settings updates
- Permission changes

---

## 🔑 RELATIONSHIPS SUMMARY

```
users (1) ──< (many) patients [created_by]
users (1) ──< (many) visits [created_by]
users (1) ──< (many) appointments [created_by]
users (1) ──< (many) audit_logs [user_id]

patients (1) ──< (many) patients [self-referral via referral_code]
patients (1) ──< (many) visits
patients (1) ──< (many) appointments
patients (1) ──< (many) followups
patients (1) ──< (many) invoices

visits (1) ──< (many) medications
visits (1) ──< (1) invoices [1-to-1 relationship]
visits (1) ──< (many) followups [optional]
```

---

## 🛡️ DATA VALIDATION RULES

### Phone Number:
```javascript
// Must be Egyptian format
// Normalized: 201XXXXXXXXX (13 characters)
// Display: +20 1XX XXX XXXX
// Validation: /^201\d{9}$/
```

### Patient Name:
```javascript
// 3-100 characters
// Letters and spaces only
// No numbers or special characters
// Validation: /^[A-Za-z\s]{3,100}$/
```

### Referral Code:
```javascript
// 8 digits
// Unique across all patients
// Auto-generated
// Format: "12345678"
```

### Financial Values:
```javascript
// All amounts >= 0
// Discount: 0-100 (percentage)
// Precision: 2 decimal places
// No negative values allowed
```

---

## 📝 NOTES

1. **Foreign Keys:** Always enabled (`PRAGMA foreign_keys = ON`)
2. **Journal Mode:** WAL for better concurrency
3. **Timestamps:** All in local time
4. **Cascade Deletes:** Patient deletion cascades to visits, appointments, followups
5. **Generated Columns:** amount_remaining auto-calculated, cannot be manually set
6. **Audit Trail:** Critical operations logged automatically
7. **Indexes:** Created for all frequently queried columns
8. **Constraints:** Enforced at database level for data integrity

---

**Schema Version:** 1.0  
**Last Updated:** Phase 1  
**Database Engine:** SQLite 3.x with better-sqlite3
