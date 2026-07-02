# SOFTWARE REQUIREMENT SPECIFICATION
## Eyes Clinic Management System (ECMS)
*– Hanoi, May 2026 –*

> Converted from `ECMS_SRS (3).docx`. This file replaces the previous (stale) summary version of the project instructions.

---

## I. Record of Changes

| Version | Date | A/M/D | In Charge | Change Description |
|---|---|---|---|---|
| V1.1 | 18/05/2026 | M | [Team] | Complete the Use Case Specifications (UC-01 → UC-30), incorporate comprehensive Business Rules, update the database schema (inventory and prescription_items tables), and update the Non-Functional KPIs. |
| V2.0 | 26/5/2026 | A | [Team] | Add new Use Cases (UC-40 and UC-41) |
| V2.1 | 8/5/2026 | M | [Team] | — |

*A – Added &nbsp;&nbsp; M – Modified &nbsp;&nbsp; D – Deleted*

---

## II. Software Requirement Specification

### 1. Overall Requirements

In the context of the digital age, most of the major ophthalmology medical facilities surveyed have undergone digital transformation, but the old systems are gradually revealing limitations in service and user experience. After surveying the websites of several hospitals and clinics such as Thien Thanh Eye Clinic, Thu Ha Eye Clinic, Tue Anh Eyecare, etc., the following limitations were observed:

- **Overly simple and passive interface**: The current system mainly supports registration through static forms, limiting patient interaction.
- **Slow and passive consultation response**: Most clinics still provide consultations through separate platforms such as Zalo, Facebook, or Messenger. Patients have to wait for staff to manually respond, leading to information congestion during peak hours.
- **Slow connectivity and synchronization**: Results from measuring devices (OCT, refractometer) often require synchronization or manual entry into patient records, easily leading to errors.
- **Rudimentary Patient Portal**: Most systems only offer appointment scheduling and do not provide sufficient medical history information or specialized images for patients to monitor remotely.
- **Lack of in-depth management reporting**: Older systems only provide static data, making it difficult for Clinic Managers to make business decisions based on forecasts.
- **Inflexible security**: Access control is often too loose or too rigid, hindering coordination between specialized ophthalmology departments.

#### 1.1. Context Diagram

The ECMS (Eyes Clinic Management System) is a full-stack web application built for the Anh Sao High-Tech Eye Clinic (85 Ba Trieu St., Hai Ba Trung Dist., Hanoi). The system digitalizes the entire patient lifecycle from appointment scheduling, reception, medical examination, laboratory testing, prescription, medicine dispensing, billing, to reporting.

The system interacts with 7 user actors (Patient, Receptionist, Doctor, Lab Technician, Pharmacist, Clinic Manager, Admin) and 1 system actor (cron jobs, email service). Architecture: ReactJS (Frontend) ↔ Spring Boot REST API (Backend) ↔ MySQL Database.

#### 1.2. Main Business Processes

**1.2.1. Online Appointment Booking & Patient Check-in**
- **Actors**: Patient, Receptionist, System
- **Objective**: Allow patients to register a visit (either online in advance or walk-in at the counter) and complete the check-in procedure that officially places them in the doctor's queue.
- **Process Summary**: The process begins with two alternative entry points depending on how the patient initiates their visit.
  - *Online booking path*: The patient logs into the Patient Portal, browses available doctors and time slots, and submits a booking request. The system creates a Pending appointment and sends a confirmation email. The receptionist reviews the request: if approved, the appointment is confirmed and the patient is notified; if rejected, the appointment is cancelled with a stated reason and the process ends for that request. On the day of the visit, the patient arrives at the clinic and provides their name or phone number at the counter.
  - *Walk-in path*: The patient arrives directly at the clinic and requests an appointment at the reception counter. The receptionist first checks whether the patient already has an account. If an account exists, the receptionist retrieves the existing patient profile. If no account exists, the receptionist registers a new account on the patient's behalf — the system creates the account and sends login credentials to the patient's email. After the account check, the receptionist reviews doctor availability, selects an appropriate time slot, and the system immediately creates a Confirmed appointment with a doctor assigned — bypassing the Pending/approval step entirely.
  - Both paths converge at the check-in step. The receptionist verifies the patient's identity and performs check-in. The system updates the appointment status to In Progress and pushes the patient into the assigned doctor's queue dashboard.
- **End State**: A formally registered visit exists in the system; the patient appears in the doctor's queue. Hands off to BP-2.

**1.2.2. Clinical Examination & EMR Creation**
- **Actors**: Doctor, Lab Technician, System, Patient
- **Objective**: Enable the doctor to conduct a full clinical examination, order and receive lab/imaging results if needed, record a treatment conclusion and medication plan, finalize the Electronic Medical Record (EMR) for the visit, and collect patient feedback.
- **Process Summary**: The doctor opens their dashboard, selects the next patient from the queue, and reviews the patient's past EMR history before beginning the examination. After conducting the clinical assessment, the doctor enters preliminary symptoms and diagnosis into the EMR form.
  - If lab tests or imaging are required (e.g., refraction measurement, OCT, ocular ultrasound), the doctor creates a Lab Order. The lab technician receives the order, performs the tests, and submits results along with any attached images. The system links the results to the EMR and pushes them to the doctor in real time. The doctor reviews the results and updates the diagnosis accordingly.
  - If no lab work is needed, the preliminary diagnosis serves as the official diagnosis and the process continues directly.
  - At the convergence point of both paths, the doctor writes the treatment conclusion (including the final diagnosis, ICD classification, and treatment direction) and drafts the medication and prescription plan within the EMR. This plan is informational at this stage; the formal Prescription record is created in BP-3.
  - The doctor then finalizes and submits the EMR. The system saves it as Finalized, locks free editing (audit-protected), unlocks the Prescription feature for this visit, and logs the event to the Audit Log. The system automatically sends a feedback request to the patient via the Portal and email. The patient may optionally rate the service quality and leave a comment; if submitted, the feedback is saved and the Clinic Manager is notified.
- **End State**: The EMR is permanently finalized. Hands off to BP-3 if medication is needed, or ends the clinical flow otherwise.

**1.2.3. Prescription & Medicine Dispensing**
- **Actors**: Doctor, Pharmacist, Patient, System
- **Objective**: Transfer the doctor's prescription to the pharmacy, give the patient the choice to purchase medications, dispense the correct drugs if the patient opts in, and trigger invoice generation for the relevant charges.
- **Process Summary**: After the EMR is finalized, the doctor opens the prescription form. Two tasks may run in parallel: writing the medicine prescription (drug name, dosage, frequency, duration) and, if applicable, entering optical parameters for an eyeglass prescription (SPH, CYL, AXIS, ADD, PD per eye). The system saves the eyeglass prescription and generates a shareable PDF for the patient.
  - Once both tasks are complete, the doctor reviews the full prescription and submits it. The system saves it and notifies the patient to decide on purchase.
  - The patient decides whether to purchase the prescribed medications. If they choose to buy, the pharmacist receives the order on the Pharmacy Dashboard, reviews the prescription lines, prepares each item, and confirms dispensing. The system updates the prescription status to Dispensed, generates a PharmacyInvoice, and notifies the receptionist to include pharmacy charges in the final bill. The patient collects the medications at the pharmacy counter, and the Patient Portal is updated accordingly.
  - If the patient chooses not to purchase medications, the system marks the prescription as Skipped and notifies the receptionist that only examination fees apply for billing.
- **End State**: The prescription is either Dispensed or Skipped; the appropriate invoice components are ready. Hands off to BP-4.

**1.2.4. Payment Processing & Invoice Generation**
- **Actors**: Receptionist, Patient, System
- **Objective**: Consolidate all charges from the visit into a single invoice, process payment through the patient's chosen method, issue an electronic receipt, and officially close the visit.
- **Process Summary**: After the patient has completed examination and received medications (if applicable), the receptionist opens the invoice screen for the visit. The system automatically aggregates all applicable charges: service/examination fee, lab fees (if any), and pharmacy fees (if dispensed), then displays an itemized breakdown. The receptionist reviews the breakdown, applies any discounts or insurance adjustments, and confirms invoice creation. The system creates an Unpaid invoice and displays the total.
  - The receptionist informs the patient of the total amount and asks for the preferred payment method. For cash payment, the patient pays at the counter, the receptionist records it, and the system marks the invoice as Paid. For online payment (VietQR / bank QR transfer), the patient completes the transaction and the system waits for a callback from the payment gateway: on success, the invoice is marked Paid and the patient is notified; on failure or timeout, the status is set to Payment Failed and the patient is prompted to retry.
  - Once payment is confirmed, two actions run in parallel: the system generates and sends an e-invoice PDF to the patient's email and Portal while also recording the revenue data for reporting; and the receptionist prints a paper invoice if requested. Finally, the system updates the appointment status to Completed and writes the full event chain to the Audit Log.
- **End State**: Invoice issued, payment recorded, visit closed with status Completed.

**1.2.5. System Administration & RBAC Configuration**
- **Actors**: Admin, New Staff, System
- **Objective**: Allow the system administrator to create staff accounts, assign roles, configure access permissions via Role-Based Access Control (RBAC), and ensure new staff can log in securely and land on the correct dashboard for their role.
- **Process Summary**: The admin creates a new staff account by entering the employee's name, email, role, and department. The system validates that the email is not already registered, creates the account in an Inactive state, and generates a temporary password.
  - The admin then opens the Roles & Permissions screen to review the default permission matrix for the assigned role. If custom permissions are needed, the admin adjusts the permission matrix; the system writes the changes (admin ID, timestamp, specific permissions modified) to the Audit Log.
  - The admin activates the account. The system sets it to Active and sends a welcome email containing the temporary password and login instructions.
  - The new staff member logs in with the temporary password, is forced to change it on first login, and sets a new password compliant with the security policy. The system invalidates the temporary password, issues a JWT and refresh token, redirects the user to their role-specific dashboard, and records both the first login and the password change event to the Audit Log.
- **End State**: The staff account is fully active with correct RBAC configuration; the staff member is authenticated and working within their designated dashboard.

#### 1.3. User Requirements

##### 1.3.1. Actors

| # | Actor | Description |
|---|---|---|
| 1 | Guest | Unauthenticated visitor |
| 2 | User | Base role for any authenticated account |
| 3 | Patient | Books appointments, views own EMR/prescriptions |
| 4 | Receptionist | Manages appointments, check-in, billing |
| 5 | Doctor | Manages EMR, prescriptions, lab orders |
| 6 | Lab Technician | Performs tests, submits results, fabricates eyeglasses |
| 7 | Pharmacist | Dispenses medication, issues pharmacy invoices |
| 8 | Nurse | Delivers care sessions (wellness services) |
| 9 | Clinic Manager | Reports, staff performance, service packages, payroll |
| 10 | Admin | User accounts, system configuration, audit log |

##### 1.3.2. Use Cases

**1. Authentication & Account Management**

| UC ID | Use Case | Actors |
|---|---|---|
| UC-01 | Register User Account | Guest |
| UC-02 | View Home Page | Guest |
| UC-03 | View Blog List | Guest |
| UC-04 | Log In to System | User, Patient, Receptionist, Lab Technician, Doctor, Pharmacist, Clinic Manager, Admin |
| UC-05 | Log Out of System | User, Patient, Receptionist, Lab Technician, Doctor, Pharmacist, Clinic Manager, Admin |
| UC-06 | Reset Forgotten Password | User |
| UC-07 | Change Account Password | User, Patient, Receptionist, Lab Technician, Doctor, Pharmacist, Clinic Manager, Admin |
| UC-08 | Manage Personal Profile | User, Patient, Receptionist, Lab Technician, Doctor, Pharmacist, Clinic Manager, Admin |
| UC-09 | Receive System Notification | User, Patient, Receptionist, Doctor, Pharmacist, Lab Technician, Clinic Manager |
| UC-10 | Interact with AI Chatbot (ECMS-Bot) | Patient |

**2. Reception & Scheduling**

| UC ID | Use Case | Actors |
|---|---|---|
| UC-11 | Book Appointment Online | Patient |
| UC-12 | Manage Appointment | Patient, Receptionist |
| UC-12a | Reschedule/Cancel Appointment | Patient, Receptionist |
| UC-13 | Send Appointment Reminder Notification | Receptionist |
| UC-14 | Register Walk-in Patient | Receptionist |
| UC-15 | Check-in Patient | Receptionist |
| UC-16 | Confirm Appointment | Receptionist |
| UC-17 | View Daily Appointment Schedule | Receptionist, Clinic Manager |
| UC-18 | Reassign Appointment | Clinic Manager |
| UC-19 | Assign Nurse to Care Session | Clinic Manager |
| UC-20 | Check-out Care Session | Receptionist |
| UC-21 | Confirm Eyeglass Pickup | Receptionist |
| UC-22 | Process Payment | Receptionist |
| UC-23 | Deliver Invoice | Receptionist |

**3. EMR & Clinical**

| UC ID | Use Case | Actors |
|---|---|---|
| UC-24 | View Doctor Dashboard | Doctor |
| UC-25 | Manage Electronic Medical Record (EMR) | Doctor |
| UC-25a | Initiate Patient Examination | Doctor |
| UC-25b | Save & Modify EMR Draft | Doctor |
| UC-25c | Finalize EMR Visit Record | Doctor |
| UC-25d | Delete Electronic Medical Record (EMR) | Doctor |
| UC-26 | View Patient Medical History | Patient, Doctor |
| UC-27 | Issue Drug Prescription | Doctor |
| UC-28 | Issue Eyeglass Prescription | Doctor |
| UC-29 | Issue Lab/Imaging Order | Doctor |
| UC-30 | View Lab Results | Patient, Doctor |
| UC-31 | View Care Queue | Nurse |
| UC-32 | Deliver Care Session | Nurse |

**4. LIS & Imaging**

| UC ID | Use Case | Actors |
|---|---|---|
| UC-33 | View Lab Queue | Lab Technician |
| UC-34 | Submit Lab/Test Results | Lab Technician |
| UC-35 | Review Submitted Lab Results | Doctor |
| UC-36 | Fabricate Eyeglasses | Lab Technician |

**5. Pharmacy**

| UC ID | Use Case | Actors |
|---|---|---|
| UC-37 | Dispense Drug | Pharmacist |
| UC-38 | Issue Electronic Invoice | Pharmacist |

**6. Service Package & Eyeglass Sales**

| UC ID | Use Case | Actors |
|---|---|---|
| UC-39 | Purchase Service Package | Guest, Patient |
| UC-40 | Book Care Session | Patient |
| UC-41 | Order Eyeglasses from Clinic | Patient |
| UC-42 | Manage Service Packages | Clinic Manager |
| UC-43 | Manage Discount Campaigns | Clinic Manager |

**7. Patient Portal**

| UC ID | Use Case | Actors |
|---|---|---|
| UC-44 | View Prescriptions | Patient |
| UC-45 | View Diagnostic Results | Patient |
| UC-46 | Register for Eye Care Services | Patient |
| UC-47 | Generate Feedback | Patient |

**8. Administration & Analytics**

| UC ID | Use Case | Actors |
|---|---|---|
| UC-48 | View Real-time Operational Analytics Dashboard | Clinic Manager |
| UC-49 | Generate Revenue Report | Clinic Manager |
| UC-50 | View Patient Volume Statistics and Trends | Clinic Manager |
| UC-51 | Monitor Staff Performance Dashboard | Clinic Manager |
| UC-52 | Generate Feedback Report | Clinic Manager |
| UC-53 | Approve Payroll | Clinic Manager |
| UC-54 | Manage Lab Test Catalogue | Clinic Manager |

**9. System Admin & Security**

| UC ID | Use Case | Actors |
|---|---|---|
| UC-55 | Manage User Account | Admin |
| UC-56 | Configure System and Data | Admin |
| UC-57 | Manage System Audit Log | Admin |

##### 1.3.3. Use Case Diagrams (narrative descriptions; original diagrams are images in the source DOCX)

- **1.3.3.1. UCs for Guest** — Guest covers unauthenticated public interactions: viewing informational content and registering for an account. Two `«extend»` relationships reflect optional behaviors: viewing a blog post's detail, or looking up a specific doctor's information.
- **1.3.3.2. UCs for User** — User covers Login/Logout, Register, Change password, Manage personal profile, Receive notifications. `User` generalizes from `Guest`. Resetting a forgotten password `«extend»`s from the login process; changing password / updating profile details `«extend»` the profile management process.
- **1.3.3.3. UCs for Patient** — `Patient` generalizes from `User`, adding: Book appointment online, View medical history, Interact with chatbot. From "Manage patient's appointment", the Patient may optionally View appointment detail or Rebook/cancel appointment (`«extend»`). "View Lab result" extends from "View examination results", which also extends to View Prescriptions and View diagnosis result. From "View Invoice list", the Patient may view Invoice detail, which triggers Pay invoice.
- **1.3.3.3. UCs for Doctor** — `Doctor` generalizes from `User`, adding: Manage EMR, Issue Drug/Glass Prescription, View lab result, View Patient Medical Information, View personal schedule. EMR management `«extend»`s to Create new EMR / Update existing EMR. Issuing a prescription `«include»`s Record Clinical Diagnosis and Notes, and `«extend»`s to Record and Submit Visual Acuity Test Results / View lab result. View lab result `«include»`s Order Lab Test. Viewing Patient Medical Information `«extend»`s to Update patient medical information / View Patient Medical History. From personal schedule, the Doctor may Reschedule/cancel schedule.
- **1.3.3.4. UCs for Receptionist** — `Receptionist` generalizes from `User`, adding: Manage patient's appointment, Register walk-in patient, View appointment schedule, Process Payment, Send Appointment Reminder Notification. Appointment management `«extend»`s to View appointment detail / Rebook-cancel appointment / Confirm appointment. View appointment schedule `«extend»`s to Reschedule/cancel schedule. Process Payment `«extend»`s to Deliver Invoice. Send Appointment Reminder Notification `«include»`s Book appointment.
- **1.3.3.5. UCs for Lab technician** — `Lab technician` generalizes from `User`, adding: Submit lab result, View lab queue. Submit lab result `«include»`s View doctor's order and Record lab result; `«extend»`s to Update lab result. View lab queue `«extend»`s to Filter/search patient.
- **1.3.3.6. UCs for Pharmacist** — `Pharmacist` generalizes from `User`, adding: Dispense Drug, Issue Electronic Invoice. Dispense Drug `«include»`s View drug prescription; `«extend»`s to View patient requirement, which `«extend»`s to Approve/Decline drug prescription. Issue Electronic Invoice `«extend»`s to Pay invoice.
- **1.3.3.7. UCs for Clinic Manager** — `Clinic manager` generalizes from `User`, adding: Generate Revenue Report, Monitor Staff Performance Dashboard, View Real-time Operational Analytics Dashboard, View Daily Appointment Schedule, Generate feedback report. Generate Revenue Report `«include»`s View number of service package subscriptions, View Patient Volume Statistics and Trends, View Inventory and Pharmacy Consumption Report. View Daily Appointment Schedule `«extend»`s to Reschedule/Cancelled schedule. Generate feedback report `«include»`s View patient's feedback.
- **1.3.3.8. UCs for Admin** — `Admin` generalizes from `User`, adding: Manage User Account, Configure System and Data, Manage System Audit Log. Manage User Account `«include»`s Modify Role-Based Permissions (RBAC); `«extend»`s to Deactivate account. Configure System and Data `«extend»`s to Restore System Data from Backup. Manage System Audit Log `«extend»`s to Configure Automated Backup Schedule.

#### 1.4. System Functionalities

##### 1.4.1. Screens Flow

> The following subsections contain screen-flow diagrams (images) in the source DOCX with no extractable text: 1.4.1.1 Screen flow for Patient, 1.4.1.2 Screen flow for Receptionist, 1.4.1.3 Screen flow for Doctor, 1.4.1.4 Screen flow for Lab Technician, 1.4.1.5 Screen flow for Clinic Manager, 1.4.1.6 Screen flow for Pharmacist, 1.4.1.7 Screen flow for Admin. Refer to the original DOCX for these diagrams.

##### 1.4.2. Screen Authorization

Legend: `X` = Full access | `✓(view)` = view only | `✓(personal)` = personal data only | blank = no access

| Screen | Patient | Receptionist | Doctor | Lab Tech | Pharmacist | Manager | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Login / Register | X | X | X | X | X | X | X |
| Forgot password | X | X | X | X | X | X | X |
| Home page | X | X | X | X | X | X | X |
| Dashboard | X | X | X | X | X | X | X |
| Personal Profile | X | X | X | X | X | X | X |
| Change Password | X | X | X | X | X | X | X |
| Booking Appointment | X | X | | | | | |
| Appointment Detail | X | X | ✓(view) | | | ✓(view) | |
| View Medical History | X | | X | | | | |
| Interact with Chatbot | X | | | | | | |
| Electronic Medical Report (EMR) | ✓(view) | | X | ✓(view) | ✓(view) | ✓(view) | |
| Prescription & Eyeglasses | ✓(view) | | X | ✓(view) | X | | |
| Examination & Diagnosis | ✓(view) | | X | X | | | |
| Billing & Invoicing | ✓(view) | X | | | X | ✓(view) | |
| Reporting & Analysis | | | | | | X | |
| Staff & Schedule Management | | X | ✓(personal) | ✓(personal) | | X | X |
| System Configuration & RBAC | | | | | | | X |
| Audit Logs | | | | | | | ✓(view) |

##### 1.4.3. Non-UI Functions

| STT | Module | Function | Description | Trigger |
|---|---|---|---|---|
| 1 | Appointment | Auto Reminder Job | The cron job runs every hour, automatically sending appointment reminder emails to patients 24 hours in advance. | Per Hour |
| 3 | Billing | Invoice PDF Generator | Generates a PDF electronic invoice and sends it to the patient via email immediately after payment. | On-demand |
| 4 | Auth | Token Refresh Service | Receives a Refresh Token, verifies its validity, and returns a new Access Token (TTL 60 minutes). | On-demand |
| 5 | Reports | Monthly Report Generator | Compiles the previous month's report (revenue, number of visits) and saves it to the database. | Beginning of the month |

#### 1.5. Entity Relationship Diagram

> Diagram image in source DOCX — refer to the original file, or `ecms_schema.sql` / `ECMS_Database_Table_SQLServer.pdf` for the authoritative schema.

---

## 2. Use Case Specifications

### 2.1 Business Rules

The following Business Rules must be enforced at both layers: Frontend validation (UX) and Backend service layer (correctness). Some BRs also need to be checked at the Database level (constraints/triggers).

| BR ID | Class | Rule Name | Rule Description |
|---|---|---|---|
| BR-01 | Security & Authentication | Password Policy | Passwords must be at least 8 characters long, including uppercase letters, lowercase letters, and numbers; hashed using bcrypt (cost ≥ 12) before saving. Related: UC-01, UC-04, UC-06, UC-07. |
| BR-02 | Security & Authentication | Account Locking | After 5 incorrect login attempts within 30 minutes, the account is locked for 30 minutes. Related: UC-04. |
| BR-03 | Scheduling | Max Appointments per Day | Each doctor is limited to 30 appointments per workday. Related: UC-11, UC-12, UC-14, UC-15, UC-18, UC-46. |
| BR-04 | Scheduling | Advance Booking | Appointments must be booked at least **2 hours** in advance. Related: UC-11, UC-12, UC-18, UC-46. |
| BR-05 | Scheduling | Cancellation Deadline | Cancellations are allowed at least 1 hour before the scheduled time. Related: UC-12, UC-16. |
| BR-06 | Clinical / EMR | Prescription Authority | Only licensed doctors can create prescriptions. Related: UC-27, UC-28. |
| BR-07 | Pharmacy | Dispensing | Medication dispensing. Related: UC-37. |
| BR-08 | Data Privacy & Security | EMR Confidentiality | Records accessible only by the assigned doctor and patient. Related: UC-25, UC-26, UC-30, UC-44, UC-45. |
| BR-09 | Data Integrity | No Hard Delete | Soft-delete/deactivate only for business records. Related: UC-25, UC-27, UC-36, UC-42, UC-53, UC-55, UC-56. |
| BR-10 | Billing & Payment | Invoice Insurance | Invoice status only changes to PAID upon full payment. Related: UC-16, UC-20, UC-21, UC-22, UC-38. |
| BR-11 | Billing & Payment | Invoice Calculation | Total bill = Examination fee + Lab fee + Medicine fee − Discount. Related: UC-16, UC-20, UC-22, UC-43. |
| BR-12 | Scheduling / Queue | Queue Uniqueness | Queue number is unique per (doctor, work day), assigned in arrival order. Related: UC-15, UC-17. |
| BR-13 | Scheduling | Reassignment Lock | Cannot reschedule appointments once IN_PROGRESS or COMPLETED. Related: UC-18. |
| BR-14 | Service Package | Subscription Consumption | Each CareSession booking deducts 1 session from the subscription. Related: UC-40. |
| BR-15 | Billing / Promotion | Discount Stacking | Only one discount program per invoice, unless explicitly combinable. Related: UC-43. |
| BR-16 | Scheduling | Care Session Capacity | Max daily sessions per nurse configured by Clinic Manager. Related: UC-19. |
| BR-17 | Administration / Payroll | Payroll Authority | Only Clinic Manager can approve payroll. Related: UC-53. |
| BR-18 | Billing / Fulfillment | Eyeglass Pickup | Cannot confirm delivery if invoice is UNPAID. Related: UC-21. |
| BR-19 | Service Package | Subscription Validity | Package is valid from date of payment confirmation. Related: UC-39, UC-40. |
| BR-20 | Sales / Clinical | Eyeglass Order | Requires ISSUED prescription; warning if > 24 months old. Related: UC-41. |
| BR-21 | Patient Experience | One Feedback | Maximum one feedback per appointment. Related: UC-47. |
| BR-22 | Scheduling | Reschedule Restriction | Only PENDING or CONFIRMED appointments can be rescheduled. Related: UC-12a. |
| BR-23 | Scheduling | Reschedule Reset | Rescheduled appointments reset status to PENDING. Related: UC-12a. |

> ✅ **Implementation note (2026-06-28):** `BOOKING_LEAD_TIME_MINUTES` in `AppointmentServiceImpl` is set to 120 minutes, matching BR-04 exactly.

---

### 2.2 — Authentication & Account Management

#### UC-01: Register User Account
- **Primary Actor:** Guest
- **Secondary Actors:** System (email verification service)
- **Trigger:** Guest clicks the 'Register' button on the Login/Register screen.
- **Description:** A Guest fills in the registration form with personal details (full name, email, password, phone number, date of birth). The system creates a new Patient account with status = PENDING_VERIFICATION and sends an email verification link to activate the account.
- **Preconditions:** PRE-1: The guest accesses the public Login/Register screen. PRE-2: The email address provided is not already registered.
- **Postconditions:** POST-1: A new record is created in `users` with role = PATIENT and status = PENDING_VERIFICATION. POST-2: The patient receives an email with a time-limited activation link. POST-3: After clicking the link, account status transitions to ACTIVE.
- **Normal Flow:**
  1. Guest navigates to the Login/Register screen and selects 'Register'.
  2. Guest fills in: full name, email, password, confirm password, phone number, date of birth.
  3. System validates all required fields and format rules (E1, E2).
  4. System hashes the password using bcrypt (cost ≥ 12) and creates the account record.
  5. System sends a verification email with a one-time activation link (valid 24 hours).
  6. Guest opens the email and clicks the activation link.
  7. System verifies the token, sets account status = ACTIVE.
  8. System redirects the guest to the Login screen with a success message.
- **Exceptions:**
  - E1 — Email already registered: 'This email is already registered. Please log in.' Redirected to Login.
  - E2 — Password does not meet policy (BR-01): highlights field, 'Password must be at least 8 characters, including uppercase, lowercase, and a digit.'
  - E3 — Activation link expired: 'This activation link has expired. Request a new one?'
- **Priority:** Must Have | **Frequency:** Low; primarily during initial onboarding
- **Business Rules:** BR-01 (Password Policy)
- **Assumptions:** Guest has a valid email address. SMTP service is available.

#### UC-02: View Home Page
- **Primary Actor:** Guest
- **Trigger:** User navigates to the root URL of ECMS or clicks the clinic logo/Home link.
- **Description:** Any visitor (authenticated or unauthenticated) can access the public home page, which displays clinic information, featured services, announcements, quick-access links (Book Appointment, Login, Register), and the AI chatbot entry point.
- **Preconditions:** PRE-1: The ECMS web application is running and reachable.
- **Postconditions:** POST-1: The home page is rendered successfully with up-to-date clinic content.
- **Normal Flow:**
  1. User opens the browser and navigates to the ECMS root URL.
  2. System loads the home page: clinic name, address, contact details, service highlights, news/announcements, quick-action buttons.
  3. Authenticated users additionally see a personalised greeting and a link to their dashboard.
  4. Guest sees 'Book Appointment', 'Login', and 'Register' CTAs.
- **Alternative Flows:** ALT-1 — Authenticated user lands on home page: role-appropriate greeting + redirect to dashboard on click.
- **Exceptions:** E1 — Server unavailable: generic browser error page.
- **Priority:** Must Have | **Frequency:** High; every visitor session
- **Assumptions:** Home page content is managed by Admin via System Configuration.

#### UC-03: View Blog List
- **Primary Actor:** Guest
- **Trigger:** User clicks 'Blog' or 'Eye Care Articles' in the navigation menu.
- **Description:** Any visitor can browse a paginated list of published eye care articles and clinic news. Each entry shows a title, summary, publication date, and category tag. Clicking an article opens its full content.
- **Preconditions:** PRE-1: At least one published blog post exists.
- **Postconditions:** POST-1: Blog list displayed with current published articles.
- **Normal Flow:**
  1. User clicks 'Blog'.
  2. System retrieves published posts, displayed as cards sorted newest-first.
  3. Each card shows title, category, thumbnail, date, short excerpt.
  4. User may filter by category.
  5. User clicks a card to read the full article.
- **Alternative Flows:** ALT-1 — No posts published yet: 'No articles available yet. Check back soon.'
- **Priority:** Should Have | **Frequency:** Moderate
- **Assumptions:** Blog content is created/published by Admin or a content manager role.

#### UC-04: Log In to System
- **Primary Actor:** User, Patient, Receptionist, Lab Technician, Doctor, Pharmacist, Clinic Manager, Admin
- **Secondary Actors:** Google Identity Platform (OAuth login)
- **Trigger:** User navigates to the Login screen, or the system redirects an unauthenticated request to Login.
- **Description:** Any registered user logs in with email/password or Google OAuth 2.0. The system authenticates credentials, enforces account-lock policy, issues a JWT Access Token and Refresh Token, and redirects the user to their role-specific dashboard.
- **Preconditions:** PRE-1: Account exists with status = ACTIVE. PRE-2: Email has been verified.
- **Postconditions:** POST-1: JWT Access Token (TTL 60 min) + Refresh Token (TTL 7 days) issued. POST-2: Refresh Token stored in HttpOnly cookie. POST-3: User redirected to role dashboard. POST-4: Login event recorded in Audit Log.
- **Normal Flow:**
  1. User enters email/password.
  2. System validates against bcrypt hash (E1, E2, E3).
  3. System issues JWT Access Token + Refresh Token.
  4. System records the login event.
  5. System redirects by role: Patient → Patient Portal; Doctor → EMR Dashboard; Receptionist → Appointment Management; Lab Technician → Lab Queue; Pharmacist → Dispensing Dashboard; Clinic Manager → Reports Dashboard; Admin → Admin Panel.
- **Alternative Flows:** ALT-1 — Google OAuth Login (Should Have): redirect to Google Identity Platform → ID token callback → map to local account by email → proceed from step 3, or pre-fill registration if no match.
- **Exceptions:**
  - E1 — Incorrect password: increments `login_fail_count`; 5 fails within 30 min locks account 30 min (BR-02).
  - E2 — Account locked: 'Account locked. Try again in X minutes, or contact support.'
  - E3 — Email not verified: 'Please verify your email first.' + resend option.
- **Priority:** Must Have | **Frequency:** Very high
- **Business Rules:** BR-01, BR-02
- **Assumptions:** SMTP available for re-send verification emails. Google OAuth credentials configured for Should Have scope.

#### UC-05: Log Out of System
- **Primary Actor:** User, Patient, Receptionist, Lab Technician, Doctor, Pharmacist, Clinic Manager, Admin
- **Trigger:** Authenticated user clicks 'Log Out'.
- **Description:** The user explicitly terminates their session. The system revokes the Refresh Token, clears the client-side JWT, and redirects to Login.
- **Preconditions:** PRE-1: User has an active authenticated session.
- **Postconditions:** POST-1: Refresh Token invalidated server-side. POST-2: HttpOnly cookie cleared. POST-3: Redirect to Login. POST-4: Logout event logged.
- **Normal Flow:**
  1. User clicks 'Log Out'.
  2. Client sends Refresh Token to logout endpoint.
  3. System invalidates the Refresh Token.
  4. System clears the HttpOnly cookie.
  5. System records the logout event.
  6. System redirects to Login.
- **Alternative Flows:** ALT-1 — Session expired: client detects 401 → auto-renew via Refresh Token → retry; if Refresh Token expired/revoked, force logout.
- **Priority:** Must Have | **Frequency:** Once per session

#### UC-06: Reset Forgotten Password
- **Primary Actor:** User
- **Secondary Actors:** System (email service)
- **Trigger:** User clicks 'Forgot Password?' on Login.
- **Description:** A user who has forgotten their password requests a reset. The system sends a one-time reset link to the registered email. The user sets a new compliant password, and all existing sessions are invalidated.
- **Preconditions:** PRE-1: An account with the provided email exists and is ACTIVE.
- **Postconditions:** POST-1: New bcrypt-hashed password replaces the previous one. POST-2: All Refresh Tokens for the account are revoked. POST-3: Event logged.
- **Normal Flow:**
  1. User clicks 'Forgot Password?'.
  2. System shows email input.
  3. User enters registered email.
  4. System generates a one-time reset token (valid 15 min).
  5. System emails the reset link.
  6. User clicks the link; system validates token (E2).
  7. System shows New Password form.
  8. User enters/confirms new password.
  9. System validates against BR-01 (E3).
  10. System hashes/saves the new password.
  11. System revokes all existing Refresh Tokens.
  12. System shows success and redirects to Login.
- **Exceptions:**
  - E1 — Email not found: generic 'If this email is registered, a reset link has been sent.' (prevents enumeration)
  - E2 — Token expired/invalid: 'This link has expired or is invalid. Please request a new one.'
  - E3 — New password fails policy: inline BR-01 requirements.
- **Priority:** Must Have | **Frequency:** Low
- **Business Rules:** BR-01
- **Assumptions:** SMTP operational. Token TTL = 15 minutes.

#### UC-07: Change Account Password
- **Primary Actor:** User, Patient, Receptionist, Lab Technician, Doctor, Pharmacist, Clinic Manager, Admin
- **Trigger:** User navigates to Profile Settings → 'Change Password'; or system forces a change on first login with a temporary password.
- **Description:** An authenticated user changes their current password, supplying the existing password for verification before setting a new one meeting the security policy.
- **Preconditions:** PRE-1: User is authenticated. PRE-2: User knows their current password (or is in forced-change mode).
- **Postconditions:** POST-1: New bcrypt-hashed password stored. POST-2: All other active Refresh Tokens (other devices) invalidated. POST-3: Event logged.
- **Normal Flow:**
  1. User navigates to Profile Settings → Change Password.
  2. System shows: Current Password, New Password, Confirm New Password.
  3. User fills in all fields.
  4. System verifies Current Password (E1).
  5. System validates New Password against BR-01 (E2).
  6. System hashes/stores the new password.
  7. System invalidates other sessions for this account.
  8. System displays: 'Password changed successfully.'
- **Alternative Flows:** ALT-1 — Forced change on first login: redirect to Change Password before dashboard access; clears `first_login_flag` after success.
- **Exceptions:** E1 — Current password incorrect. E2 — New password fails policy (BR-01).
- **Priority:** Must Have | **Frequency:** Low
- **Business Rules:** BR-01

#### UC-08: Manage Personal Profile
- **Primary Actor:** User, Patient, Receptionist, Lab Technician, Doctor, Pharmacist, Clinic Manager, Admin
- **Trigger:** User clicks their avatar or 'Profile' in the navigation menu.
- **Description:** Any authenticated user views and updates their personal profile (full name, phone, date of birth, address, profile photo). Email and role fields are read-only and can only be modified by Admin.
- **Preconditions:** PRE-1: User is authenticated.
- **Postconditions:** POST-1: Updated profile data persisted to `users` (and the relevant role-specific table, e.g., `patients` or `doctors`).
- **Normal Flow:**
  1. User navigates to the Profile page.
  2. System displays current profile info in an editable form.
  3. User modifies editable fields.
  4. User clicks 'Save Changes'.
  5. System validates inputs.
  6. System saves and shows a success notification.
- **Exceptions:** E1 — Validation failure: highlights invalid fields; changes not saved until resolved.
- **Priority:** Must Have | **Frequency:** Occasional
- **Assumptions:** Email and role changes require Admin access.

#### UC-09: Receive System Notification
- **Primary Actor:** User, Patient, Receptionist, Doctor, Pharmacist, Lab Technician, Clinic Manager
- **Secondary Actors:** System (notification engine, email service)
- **Trigger:** A system event occurs that generates a notification (appointment confirmed, prescription ready, lab result uploaded, invoice issued, etc.).
- **Description:** The system automatically delivers in-app notifications and email alerts to relevant actors when key workflow events occur. Users can view their notification history and mark notifications as read.
- **Preconditions:** PRE-1: Recipient is a registered, ACTIVE user. PRE-2: A triggering event has occurred.
- **Postconditions:** POST-1: Notification record created and linked to the recipient. POST-2: In-app badge count increments in real time. POST-3: Email dispatched if the event qualifies.
- **Normal Flow:**
  1. A workflow event triggers notification creation.
  2. System creates a notification record for the target user.
  3. System pushes the notification via WebSocket.
  4. System sends an email for qualifying events.
  5. User clicks the notification bell.
  6. System lists notifications (unread/read) with timestamps.
  7. User clicks a notification to navigate to the relevant screen.
  8. System marks the notification as read.
- **Alternative Flows:** ALT-1 — Mark all as read.
- **Exceptions:** E1 — Email delivery failure: logged, retried up to 3 times at 5-min intervals; in-app delivery is unaffected.
- **Priority:** Must Have | **Frequency:** Multiple times/day per active user
- **Assumptions:** Real-time delivery uses WebSocket or SSE. Email via Gmail SMTP / SendGrid.

#### UC-10: Interact with AI Chatbot (ECMS-Bot)
- **Primary Actor:** Patient
- **Trigger:** Patient clicks the chatbot icon on the Patient Portal.
- **Description:** The Patient uses the ECMS-Bot to ask about clinic services, check or book appointments, review FAQs on eye care, or get basic guidance. The bot handles common intents autonomously and escalates complex or sensitive queries to a human Receptionist.
- **Preconditions:** PRE-1: Patient is authenticated on the Patient Portal.
- **Postconditions:** POST-1: Conversation session logged. POST-2: If the bot assists with booking, an appointment record is created (delegates to UC-11). POST-3: If escalated, a support request notification is sent to the Receptionist.
- **Normal Flow:**
  1. Patient clicks the chatbot icon.
  2. Bot greets and presents quick-reply options.
  3. Patient selects an option or types a free-text query.
  4. System generates a contextual response.
  5. If booking intent, delegates to UC-11.
  6. Patient continues or closes the panel.
  7. System logs the conversation.
- **Alternative Flows:** ALT-1 — Escalate to human Receptionist when the bot cannot resolve a query with sufficient confidence.
- **Exceptions:** E1 — AI service unavailable: 'Our chat assistant is temporarily unavailable. Please call our hotline or send us an email.'
- **Priority:** Should Have
- **Assumptions:** Chatbot NLP backend integrated via REST API; confidence threshold configurable by Admin.

---

### 2.3 — Reception & Scheduling

#### UC-11: Book Appointment Online
- **Primary Actor:** Patient
- **Secondary Actors:** System (email confirmation service)
- **Trigger:** Patient clicks 'Book Appointment' on the Patient Portal or Home Page.
- **Description:** An authenticated Patient selects a doctor by specialty, chooses an available date and time slot, and confirms an online booking. The system creates an appointment record with status = PENDING and sends an email confirmation.
- **Preconditions:** PRE-1: Patient is logged in. PRE-2: Patient has a valid email address.
- **Postconditions:** POST-1: Appointment record saved with status = PENDING and the selected doctor assigned. POST-2: Patient receives a booking confirmation email. POST-3: Receptionist receives a notification of the new pending appointment.
- **Normal Flow:**
  1. Patient navigates to the Appointment Booking screen.
  2. Patient selects a medical specialty, then a doctor from the filtered list.
  3. System displays the doctor's availability calendar for the next 30 days.
  4. Patient selects a date; system displays available time slots for that date.
  5. Patient selects a time slot (E1, E2).
  6. System displays a booking summary (doctor name, specialty, date, time, patient name).
  7. Patient reviews and confirms.
  8. System creates the appointment record (status = PENDING).
  9. System sends a confirmation email.
  10. System redirects the patient to 'My Appointments'.
- **Alternative Flows:** ALT-1 — Book on behalf of a family member: Patient selects 'Book for someone else' and enters the family member's name and phone number; system continues from step 3 of the Normal Flow, **linking the appointment to the logged-in patient account** (i.e., the appointment's `patient_id` stays the account holder's; the family member's details are captured as supplementary info, not a separate Patient record).
- **Exceptions:**
  - E1 — No available slots on selected date: 'No slots available for this doctor on the selected date.'
  - E2 — Booking too close to appointment time: 'Appointments must be booked at least 2 hours in advance.'
- **Priority:** Must Have | **Frequency:** Estimated 50–200 bookings/day; peak 07:00–09:00 and 14:00–16:00
- **Business Rules:** BR-03 (Max Appointments/Day), BR-04 (Advance Booking — see implementation note in §2.1)
- **Assumptions:** Patient has an active account.

> **Note on the "family member" Alternative Flow:** This is the authoritative confirmation that booking on behalf of a relative is *intended* to remain linked to the booking account, not to create a separate `Patient` record. The current implementation (storing the relative's name/phone as a text note on the appointment) matches this spec.

#### UC-12: Manage Appointment
- **Primary Actor:** Patient, Receptionist
- **Secondary Actors:** System (notification emails)
- **Trigger:** Patient accesses 'My Appointments'; or Receptionist opens the Appointment Management screen.
- **Description:** Patients can view, reschedule (if within policy), and cancel their upcoming appointments. Receptionists can view, reschedule, add notes to, and cancel any appointment on behalf of patients.
- **Preconditions:** PRE-1: The appointment record exists. PRE-2: Actor is authenticated with the appropriate role.
- **Postconditions:** POST-1: If cancelled — status = CANCELLED; time slot freed; notification sent. POST-2: If rescheduled — updated date/time; notification sent to all parties. POST-3: All actions recorded in the Audit Log.
- **Normal Flow:**
  1. Patient navigates to 'My Appointments'.
  2. System displays upcoming/past appointments with status indicators.
  3. Patient selects an upcoming appointment and clicks 'Cancel'.
  4. System validates the cancellation deadline (E1 — BR-05).
  5. System prompts for an optional cancellation reason.
  6. System updates status = CANCELLED and frees the time slot.
  7. System sends a cancellation notification to the assigned doctor.
- **Alternative Flows:** ALT-1 — Reschedule by Receptionist: open detail → 'Reschedule' → new date/time → validate BR-03/BR-04 → update → notify patient and doctor.
- **Exceptions:** E1 — Patient cancels within 1 hour of appointment (BR-05): 'Appointments can only be cancelled at least 1 hour before the scheduled time. Please contact the clinic directly.'
- **Priority:** Must Have | **Frequency:** Multiple times/day for Receptionist; occasional for Patients
- **Business Rules:** BR-03, BR-04, BR-05
- **Assumptions:** System clock is synchronised to the clinic's local timezone (UTC+7).

#### UC-12a: Reschedule / Cancel Appointment
- **Primary Actor:** Patient
- **Secondary Actors:** Receptionist (acts on behalf of any patient, without the patient-only time restriction)
- **Trigger:** Patient accesses 'My Appointments'; or Receptionist opens the Appointment Management screen.
- **Description:** Patients can view, reschedule (if within policy), and cancel their upcoming appointments. Receptionists can do the same for any appointment.
- **Preconditions:** PRE-01: Actor is authenticated. PRE-02: Target appointment exists with status PENDING or CONFIRMED. PRE-03: For a Patient actor, the appointment must belong to that patient.
- **Postconditions:** POST-01 (Cancel): `status = CANCELLED`; `cancelReason`, `cancelledAt`, `cancelledBy` recorded. POST-02 (Reschedule): `appointmentTime`/`timeSlot` updated and status resets to PENDING (requires re-confirmation).
- **Normal Flow:**
  1. Actor opens their appointment list and selects an appointment.
  2a. Cancel: clicks "Hủy", enters a reason, confirms.
  2b. Reschedule: clicks "Đổi giờ", picks new date/time, confirms.
  3. For a Patient actor only, the server enforces BR-05 (≥ 1 hour before the scheduled time) before applying the change.
  4. For Reschedule, if a doctor is already assigned, the server checks that doctor's daily capacity (max 30) on the new date before applying.
  5. On success, the appointment list refreshes to reflect the new status/time.
- **Alternative Flows:** A1/A2 — Receptionist override: may Cancel/Reschedule any appointment, including one < 1 hour away; the server does not enforce the patient-only 1-hour rule for Receptionist.
- **Exceptions:**
  - EX-01 (Already final): cancelling/rescheduling a CANCELLED/COMPLETED appointment → 400.
  - EX-02 (1-hour window, cancel): Patient cancels within 1 hour → 400 "Lịch hẹn chỉ có thể hủy trước giờ khám ít nhất 1 giờ. Vui lòng liên hệ trực tiếp phòng khám."
  - EX-03 (1-hour window, reschedule): same window for reschedule → 400 "Lịch hẹn chỉ có thể đổi giờ trước giờ khám ít nhất 1 giờ. Vui lòng liên hệ trực tiếp phòng khám."
  - EX-04 (Missing new time): reschedule without `newAppointmentTime` → 400 "Thời gian khám mới không được để trống".
  - EX-05 (Doctor over capacity): assigned doctor already has 30 appointments on the new date → 400 "Bác sĩ đã đủ 30 lịch hẹn trong ngày".
- **Priority:** Must Have | **Frequency:** Multiple times/day for Receptionist; occasional for Patients
- **Business Rules:** BR-05 (1-hour rule, Patient-only), BR-22 (only PENDING/CONFIRMED may be rescheduled), BR-23 (successful reschedule always resets to PENDING)
- **Assumptions:** System clock synchronised to UTC+7.

#### UC-13: Send Appointment Reminder Notification
- **Primary Actor:** System (`AppointmentReminderScheduler`), Receptionist (manual trigger)
- **Secondary Actors:** Patient (recipient)
- **Trigger:** Automated: cron job runs every hour. Manual: Receptionist triggers a reminder for a specific appointment.
- **Description:** The system automatically sends an in-app reminder notification to patients 24 hours before their confirmed appointment (no email channel is wired in the current build — see Business Rules). Receptionists can also send an ad-hoc manual reminder at any time.
- **Preconditions:** PRE-01: An appointment exists with status CONFIRMED. PRE-02 (automated): scheduler running and `appointmentTime` falls within [now+24h, now+25h] and `reminderSent = false`. PRE-03 (manual): Receptionist authenticated, viewing the appointment in `/receptionist/appointments`.
- **Postconditions:** POST-01: An in-app notification is created for the patient (only if linked to a User account). POST-02: A role-broadcast notification is created for RECEPTIONIST. POST-03: `appointment.reminderSent = true` to guard against duplicate sends.
- **Normal Flow:**
  1. (Automated) Every hour, `AppointmentReminderScheduler` queries CONFIRMED appointments in the [now+24h, now+25h] window with `reminderSent = false`.
  1'. (Manual) Receptionist clicks "Nhắc lịch" on a CONFIRMED row.
  2. `AppointmentService.sendReminder(id)` creates a per-patient notification (if a user account exists), plus a RECEPTIONIST broadcast notification.
  3. The notification bell (Header.jsx for all logged-in users; Receptionist sidebar) polls every 30 seconds and updates its unread badge.
  4. Recipient opens the dropdown, clicks the notification → marked read → navigated (Patient → `/patient/appointments`; staff → `AppointmentDetailModal` via `GET /api/v1/appointments/{id}`).
- **Alternative Flows:** A1/A2 — Patient has no linked user account: per-patient notification is skipped, but the RECEPTIONIST broadcast is still created.
- **Exceptions:**
  - EX-01 (Duplicate prevention): if `reminderSent` already true, scheduler skips on subsequent runs.
  - EX-02 (No eligible appointments): no action that cycle.
- **Priority:** Should Have | **Frequency:** Automated hourly; manual as needed
- **Business Rules:** Reminders only for CONFIRMED appointments; sent at most once per appointment (`reminderSent` flag); role-broadcast notifications share a single read-state across the role (no per-user tracking); no email channel is currently wired into this flow — `EmailService` exists for future use, but reminders today are **in-app only**.
- **Assumptions:** Cron job configured with Spring `@Scheduled`.

#### UC-14: Register Walk-in Patient
- **Primary Actor:** Receptionist
- **Secondary Actors:** System (sends account credentials via email)
- **Trigger:** A patient arrives at the reception counter without a prior online appointment.
- **Description:** The Receptionist registers a walk-in visit. If the patient has an existing account, the Receptionist retrieves it. If not, the Receptionist creates a new account on the patient's behalf; the system emails temporary login credentials. A CONFIRMED appointment is created immediately — bypassing the PENDING/approval step.
- **Preconditions:** PRE-1: Receptionist is authenticated.
- **Postconditions:** POST-1: Patient has an ACTIVE account. POST-2: Appointment created with status = CONFIRMED and a doctor assigned. POST-3: Patient is added to the assigned doctor's Patient Queue.
- **Normal Flow:**
  1. Receptionist opens the Walk-in Registration screen.
  2. System creates the account (status = ACTIVE, role = PATIENT) and emails temporary credentials.
  3a. If patient found by name/phone: confirms the existing profile.
  3b. If not found: enters new patient details (full name, DOB, phone, email, gender, address) and creates the account.
  4. Receptionist selects a doctor and an available time slot.
  5. System creates the appointment (status = CONFIRMED, doctor assigned).
  6. Patient entry appears in the assigned doctor's Patient Queue.
- **Exceptions:** E1 — Email already registered: warns and loads the existing profile for confirmation.
- **Priority:** Must Have | **Frequency:** Estimated 10–30 walk-ins/day
- **Business Rules:** BR-03
- **Assumptions:** Walk-in appointments are confirmed directly, without a Pending/approval step.

#### UC-15: Check-in Patient
- **Primary Actor:** Receptionist
- **Secondary Actors:** System (queue notification), Doctor (queue display)
- **Trigger:** Patient arrives for a CONFIRMED appointment (or a walk-in just registered via UC-14), and Receptionist clicks 'Check-in'.
- **Description:** Receptionist confirms the patient's identity, marks the appointment as arrived, and assigns a sequential queue number for the assigned doctor.
- **Preconditions:** PRE-1: Receptionist authenticated. PRE-2: Appointment exists with status = CONFIRMED for today, or a walk-in record has just been created. PRE-3: The assigned doctor has an active schedule slot.
- **Postconditions:** POST-1: `check_in_time` set, `check_in_by` recorded. POST-2: `queue_number` assigned (next sequential for that doctor/work date). POST-3: Appointment visible on the Doctor's Patient Queue and daily schedule. POST-4: Event logged.
- **Normal Flow:**
  1. Receptionist searches by name, phone, or appointment code.
  2. System displays today's appointment(s) with status.
  3. Receptionist verifies identity.
  4. Receptionist clicks 'Check-in'.
  5. System validates the appointment is for today and not already checked in.
  6. System sets `check_in_time`/`check_in_by`, computes the next `queue_number` for the assigned doctor.
  7. System displays the queue number to the Receptionist, who informs the patient.
  8. The entry appears immediately on the assigned Doctor's Patient Queue.
- **Alternative Flows:** ALT-1 — Same-day walk-in check-in continues from step 4. ALT-2 — Reassign doctor at check-in delegates to UC-18.
- **Exceptions:**
  - E-1 — No matching appointment for today: offers walk-in registration.
  - E-2 — Already checked in: blocks duplicate check-in.
  - E-3 — Doctor's daily quota reached (BR-03): warns and offers reassignment.
- **Priority:** Must Have | **Frequency:** Continuous throughout the clinical day
- **Business Rules:** BR-03; BR-12 (Queue Uniqueness — unique per doctor/work date, arrival order)
- **Relations to other UCs:** Triggers View Patient Queue; may delegate to UC-18 under E-3/ALT-2; depends on UC-16.

#### UC-16: Confirm Appointment
- **Primary Actor:** Receptionist
- **Secondary Actors:** System (status notification emails)
- **Trigger:** Receptionist opens Appointment Management and processes appointments with status = PENDING.
- **Description:** The Receptionist reviews pending online booking requests, verifies doctor availability, and either confirms or rejects each request.
- **Preconditions:** PRE-1: Receptionist authenticated. PRE-2: At least one PENDING appointment exists.
- **Postconditions:** POST-1: Status updated to CONFIRMED or CANCELLED. POST-2: Patient receives an email notification. POST-3: Action recorded in the Audit Log.
- **Normal Flow:**
  1. Receptionist filters by status = PENDING.
  2. System displays the pending list.
  3. Receptionist reviews details.
  4. Receptionist clicks 'Confirm'.
  5. System sets status = CONFIRMED.
  6. System sends a confirmation email.
  7. System records the confirmation.
- **Alternative Flows:**
  - ALT-1 — Reject: enters reason → status = CANCELLED with reason stored → rejection email → frees the time slot.
  - ALT-2 — Reassign doctor (emergency absence): select different doctor of same specialty → update `doctor_id` → notify patient.
- **Exceptions:** E1 — Selected doctor fully booked (BR-03): 'This doctor has reached the maximum of 30 appointments today.'
- **Priority:** Must Have | **Frequency:** Multiple times/day
- **Business Rules:** BR-03, BR-05
- **Assumptions:** SMTP service operational.

#### UC-17: View Daily Appointment Schedule
- **Primary Actor:** Receptionist, Clinic Manager
- **Trigger:** Actor navigates to the Schedule or Dashboard screen.
- **Description:** Actors view the clinic's appointment schedule for the current day or a selected date. Doctors see only their own queue; Receptionists and Managers see all appointments across all doctors, with filter and search.
- **Preconditions:** PRE-1: Actor authenticated with an appropriate role.
- **Postconditions:** POST-1: Schedule displayed with real-time status.
- **Normal Flow:**
  1. Actor navigates to the Schedule/Dashboard screen.
  2. System defaults to the current day's schedule.
  3. System displays appointments grouped by time slot with patient name, status badge, doctor name.
  4. Actor may filter by doctor, status, or search by patient name.
  5. Actor clicks an appointment for detail (read-only unless edit permissions).
- **Alternative Flows:** ALT-1 — View another date via calendar widget.
- **Priority:** Must Have | **Frequency:** Continuous during clinic hours
- **Assumptions:** Doctors only see their own schedule; Manager view is read-only.

#### UC-18: Reassign Appointment
- **Primary Actor:** Clinic Manager
- **Secondary Actors:** Receptionist, Doctor
- **Trigger:** Manager (or a Receptionist escalating to the Manager) needs to move an appointment to a different doctor and/or time slot — doctor sick leave, schedule conflict, or daily quota overflow (BR-03).
- **Description:** The Clinic Manager reassigns appointment(s) from their originally booked doctor/slot to a different doctor and/or time slot, preserving booking history and notifying all affected parties.
- **Preconditions:** PRE-01: Manager authenticated. PRE-02: Appointment with status in {PENDING, CONFIRMED, WAITING, IN_PROGRESS} visible on the selected date in `/manager/reassign-appointment`. PRE-03: If a new doctor is supplied, that doctor exists and has capacity (< 30) on the resulting date.
- **Postconditions:** POST-01: `doctor` and/or `appointmentTime`/`timeSlot` updated per supplied fields. POST-02: Reassignment reason appended to `notes` (existing notes preserved). POST-03: Notifications (email + in-app, best-effort) sent to the patient, old doctor (if changed), and new doctor.
- **Normal Flow:**
  1. Manager opens `/manager/reassign-appointment`, selects a date, views `GET /api/v1/appointments/daily-schedule`.
  2. Manager clicks "Chuyển lịch" on an appointment, opening a modal: doctor dropdown (optional), new date/time picker (optional), reason field (optional).
  3. Manager fills the doctor and/or new time (at least one expected) and an optional reason, saves → `PATCH /api/v1/appointments/{id}/reassign {doctorId, newAppointmentTime, reason}`.
  4. Server verifies the appointment is not COMPLETED/CANCELLED, records the old doctor/time, applies the supplied fields.
  5. If a doctor is supplied, the server validates existence and checks capacity on the resulting date.
  6. Server appends the reason to existing notes (history-preserving) and saves.
  7. Server sends notifications (try-catch isolated — failures don't roll back the reassignment).
  8. UI shows "Chuyển lịch hẹn thành công!" and refreshes the list.
- **Alternative Flows:**
  - A — Time-only change: doctor field left empty, only date/time changed; the unchanged doctor still receives a notification of the new time.
  - B — Doctor-only change: date/time left empty, only doctor changed; both old and new doctor notified; patient notified of the new doctor.
- **Exceptions:**
  - EX-01 (Non-reassignable state): COMPLETED/CANCELLED → 400 "Không thể chuyển lịch hẹn đã hoàn thành hoặc đã huỷ".
  - EX-02 (Doctor not found): → 400 "Bác sĩ không tồn tại".
  - EX-03 (Doctor over capacity): → 400 "Bác sĩ đã đủ 30 lịch hẹn trong ngày".
  - EX-04 (Notification failure): isolated in try-catch; reassignment still commits.
- **Priority:** Should Have | **Frequency:** Occasional; spikes during doctor absences or schedule conflicts
- **Business Rules:** Both old and new doctor must be notified whenever the assigned doctor changes; the reassignment reason is appended to existing notes, not overwritten; doctor daily capacity (30) is enforced on reassignment exactly as on patient-initiated reschedule (UC-12).
- **Assumptions:** Doctor schedule capacity is kept in sync with appointment bookings.

#### UC-19: Assign Nurse to Care Session
- **Primary Actor:** Clinic Manager
- **Secondary Actors:** Nurse (notified), System
- **Trigger:** Clinic Manager opens the 'Unassigned Care Sessions' list to staff each scheduled session with a Nurse.
- **Description:** The Clinic Manager reviews BOOKED care sessions for a given day and assigns each to an available Nurse, ensuring even distribution and adherence to per-nurse daily capacity.
- **Preconditions:** PRE-1: Manager authenticated. PRE-2: At least one CareSession with status = BOOKED and no nurse exists. PRE-3: At least one Nurse is rostered for that day.
- **Postconditions:** POST-1: `CareSession.nurse_id` and `assigned_at` set. POST-2: Nurse notified; session appears on their Care Queue (UC-31). POST-3: Event logged.
- **Normal Flow:**
  1. Manager opens 'Unassigned Care Sessions' for the selected date.
  2. System lists sessions sorted by time, with current nurse workload counts.
  3. Manager selects a session and assigns it to a rostered, available Nurse.
  4. System validates the nurse's daily session count is below configured capacity.
  5. Manager confirms; system sets `nurse_id`/`assigned_at`.
  6. System notifies the assigned Nurse; the session appears on their Care Queue.
- **Alternative Flows:** ALT-1 — Auto-assign remaining sessions evenly by current load (Manager reviews before confirming). ALT-2 — Reassign to a different nurse.
- **Exceptions:** E-1 — No nurse rostered: 'No nurse available. Please update the duty roster.' E-2 — Selected nurse at capacity: warns but allows override.
- **Priority:** Should Have | **Frequency:** Daily, once or twice per shift
- **Business Rules:** BR-16 (Care Session Capacity)
- **Assumptions:** Requires the 'Nurse' role in RBAC (extends the original 7-role model).

#### UC-20: Check-out Care Session
- **Primary Actor:** Receptionist
- **Secondary Actors:** System (invoice generation)
- **Trigger:** Receptionist is notified that a CareSession is COMPLETED and the patient approaches the desk to leave.
- **Description:** The Receptionist finalises the visit for a care session: confirms it was satisfactory and, for standalone (non-subscription) sessions, collects payment and issues an invoice. Subscription-based sessions need no further payment (prepaid at purchase).
- **Preconditions:** PRE-1: CareSession status = COMPLETED. PRE-2: Receptionist authenticated.
- **Postconditions:** POST-1: Status = CHECKED_OUT. POST-2 (standalone only): Invoice generated and payment collected. POST-3: Patient receives a receipt/confirmation.
- **Normal Flow:**
  1. Receptionist opens the completed session from the day's list.
  2. System displays whether it is subscription-covered or standalone.
  3. [Subscription] confirms checkout; no payment step. Status → CHECKED_OUT.
  4. [Standalone] computes the fee, applies discount, generates an invoice.
  5. Receptionist confirms payment; invoice marked PAID.
  6. System sets status = CHECKED_OUT and prints/emails the receipt.
- **Alternative Flows:** ALT-1 — Patient disputes the session: escalate to Clinic Manager; session stays COMPLETED.
- **Exceptions:** E-1 — Standalone payment fails/declined: invoice stays UNPAID; retry or alternate settlement.
- **Priority:** Should Have | **Frequency:** One per completed care session
- **Business Rules:** BR-10 (Invoice Issuance), BR-11 (Invoice Calculation)
- **Assumptions:** Subscription-covered sessions don't generate a new invoice line per visit.

#### UC-21: Confirm Eyeglass Pickup
- **Primary Actor:** Receptionist
- **Secondary Actors:** Patient, System
- **Trigger:** Patient arrives to collect a completed eyeglass order (status = READY) and approaches the desk.
- **Description:** The Receptionist verifies the patient's identity and payment status, hands over the finished eyeglasses, and marks the order as picked up.
- **Preconditions:** PRE-1: `glasses_orders.status = READY`. PRE-2: Associated invoice `payment_status = PAID`. PRE-3: Receptionist authenticated.
- **Postconditions:** POST-1: Status = DISPENSED, `dispensed_by`/`dispensed_at` recorded. POST-2: Patient receives pickup confirmation. POST-3: Event logged.
- **Normal Flow:**
  1. Receptionist searches by patient name or order ID.
  2. System displays the order, status = READY, and linked invoice status.
  3. Receptionist verifies identity.
  4. Receptionist confirms the invoice is PAID.
  5. Receptionist hands over the glasses, clicks 'Confirm Pickup'.
  6. System sets status = DISPENSED, records timestamps, generates confirmation.
  7. System sends the confirmation and closes the order.
- **Alternative Flows:** ALT-1 — Pickup by an authorised representative: records name/relationship before proceeding.
- **Exceptions:**
  - E-1 — Invoice still UNPAID: blocks pickup ("Payment must be completed before pickup.").
  - E-2 — Order not READY: blocks ("This order is not yet ready for pickup.").
- **Priority:** Should Have | **Frequency:** One per completed order
- **Business Rules:** BR-10; BR-18 (Eyeglass Pickup — cannot confirm delivery if invoice is UNPAID)

#### UC-22: Process Payment
- **Primary Actor:** Receptionist
- **Secondary Actors:** Patient, System (invoice PDF generator, payment gateway)
- **Trigger:** The visit's EMR status = COMPLETED. Receptionist opens Invoice & Payment for that visit.
- **Description:** Receptionist reviews the auto-generated itemised fee breakdown, confirms the total with the patient, records payment (cash or QR), and the system issues a digital invoice.
- **Preconditions:** PRE-1: Visit EMR status = COMPLETED. PRE-2: Receptionist authenticated.
- **Postconditions:** POST-1: Invoice saved with status = PAID. POST-2: Patient receives e-invoice PDF via email. POST-3: Appointment status updated to COMPLETED/PAID. POST-4: Revenue transaction recorded.
- **Normal Flow:**
  1. Receptionist opens Invoice & Payment for the completed visit.
  2. System aggregates charges: examination fee + lab fees (if any) + pharmacy fees (if dispensed), per BR-11.
  3. System displays an itemised breakdown.
  4. Receptionist confirms the total with the patient.
  5. Patient selects payment method (cash or QR — ALT-1/ALT-2).
  6. System creates the invoice with status = PAID.
  7. System generates and emails the e-invoice PDF.
  8. System logs the revenue transaction.
- **Alternative Flows:**
  - ALT-1 — Cash: patient pays at counter → Receptionist confirms → continue from step 6.
  - ALT-2 — QR/Bank Transfer: displays VietQR code → patient transfers → awaits gateway callback (timeout 5 min) → success: PAID, continue step 7; failure/timeout: PAYMENT_FAILED, prompt retry.
- **Exceptions:**
  - E1 — Duplicate invoice: loads the existing invoice instead of creating a duplicate.
  - E2 — Partial payment (BR-10): status stays PENDING_PAYMENT until full payment received.
- **Priority:** Must Have | **Frequency:** Once per completed visit; estimated 30–100/day
- **Business Rules:** BR-10, BR-11
- **Assumptions:** Service pricing fully configured by Admin in the `services` table.

#### UC-23: Deliver Invoice
- **Primary Actor:** Receptionist
- **Secondary Actors:** System (PDF generator, email service)
- **Trigger:** Invoice status = PAID. Receptionist clicks 'Print' or 'Send Email'; or Patient downloads from the Patient Portal.
- **Description:** The Receptionist prints a physical copy of a paid invoice on patient request, or the system automatically sends the e-invoice PDF by email. Patients can independently download their invoices.
- **Preconditions:** PRE-1: Invoice exists with status = PAID.
- **Postconditions:** POST-1: PDF invoice generated and printed/emailed. POST-2: Print/download action logged.
- **Normal Flow:** 1. System automatically sends the e-invoice PDF upon payment confirmation.
- **Alternative Flows:**
  - ALT-1 — Print Invoice (on patient request): open paid invoice → 'Print Invoice' → print-ready PDF preview → print.
  - ALT-2 — Patient downloads from Portal: 'Payment History' → select a paid invoice → 'Download PDF'.
- **Exceptions:** E1 — Email delivery failure: logged, retried up to 3 times; Receptionist notified to manually send/print.
- **Priority:** Must Have | **Frequency:** Once per paid visit
- **Business Rules:** BR-10
- **Assumptions:** PDF generation service (iText / JasperReports) is running.

---

### 2.4 — EMR & Clinical

#### UC-24: View Doctor Dashboard
- **Primary Actor:** Doctor
- **Trigger:** Doctor opens the 'Doctor Dashboard' screen for the current day.
- **Description:** Displays the real-time, ordered list of checked-in patients waiting to be seen by a given doctor, sorted by queue number. The Doctor calls the next patient, transitioning the appointment to IN_PROGRESS and opening the EMR (UC-25).
- **Preconditions:** PRE-1: Authenticated as Doctor or Receptionist. PRE-2: At least one appointment has a check-in time set for today.
- **Postconditions:** POST-1: Queue displayed and refreshed in real time. POST-2 (on 'Call Next'): status set to IN_PROGRESS.
- **Normal Flow:**
  1. Doctor opens 'Patient Queue' (or Receptionist opens it for a selected doctor).
  2. System lists today's checked-in appointments, ordered by queue number ascending.
  3. Each row shows queue number, patient name, appointment type, waiting time elapsed.
  4. Doctor clicks 'Call Next' (or selects out of order).
  5. System sets status to IN_PROGRESS and opens the EMR (delegates to UC-25).
  6. The called patient is removed from the waiting list, shown as 'In Consultation'.
  7. The queue re-sorts and refreshes for remaining patients.
- **Exceptions:** E-1 — Out-of-order call: confirmation required. E-2 — No patients waiting: 'No patients currently waiting.'
- **Priority:** Must Have | **Frequency:** Continuous throughout the clinical day
- **Business Rules:** BR-12 (Queue Uniqueness)
- **Assumptions:** Queue refreshes in real time via WebSocket or polling.

#### UC-25: Manage Electronic Medical Record (EMR)
- **Primary Actor:** Doctor
- **Description:** Encapsulates the entire lifecycle of managing a patient's EMR during a clinical visit. Decomposed into sub-use-cases for detailed implementation:
  - **UC-25a:** Initiate Patient Examination (Create / Session initialization)
  - **UC-25b:** Save & Modify EMR Draft (Update for active drafts)
  - **UC-25c:** Finalize EMR Visit Record (Close & Lock to Read-Only)
  - **UC-25d:** Delete Electronic Medical Record (abandon mid-session)

#### UC-25a: Initiate a New Electronic Medical Record (EMR)
- **Primary Actor:** Doctor
- **Trigger:** Doctor clicks "Bắt đầu khám" (Start Examination) for a patient in the queue.
- **Description:** The Doctor initiates a new clinical visit session. The system updates the patient status and opens a new blank EMR form.
- **Preconditions:** PRE-1: Doctor logged in. PRE-2: Patient present in today's queue with "Waiting" status.
- **Postconditions:** POST-1: Patient queue status → "In Progress". POST-2: A new active EMR form is initialized.
- **Normal Flow:**
  1. Doctor views today's patient queue.
  2. Doctor selects a patient with "Waiting" status.
  3. Doctor clicks "Bắt đầu khám".
  4. System changes status from "Đang chờ" to "Đang khám" in real time.
  5. System generates a new active EMR record and loads the form.
  6. Doctor inputs initial clinical info (symptoms, diagnosis, eye measurements, etc.).
- **Priority:** Must Have

#### UC-25b: Save & Update EMR Draft
- **Primary Actor:** Doctor
- **Trigger:** Doctor clicks "Lưu nháp" (Save Draft) on the active EMR form.
- **Description:** The Doctor temporarily saves current examination notes/inputs, allowing future modifications during the active session.
- **Preconditions:** PRE-1: EMR session active, patient status = "In Progress".
- **Postconditions:** POST-1: Current data saved as a draft. POST-2: Patient status remains "In Progress".
- **Normal Flow:**
  1. Doctor fills in partial data.
  2. Doctor clicks "Lưu nháp".
  3. System saves with a draft flag.
  4. System shows "Lưu nháp thành công."
  5. Doctor re-opens the draft later and modifies any field.
- **Exceptions:** E1 — Connection lost mid-entry: auto-saves every 2 minutes; restores the last draft on reconnect.
- **Priority:** Must Have

#### UC-25c: Finalize Electronic Medical Record (EMR)
- **Primary Actor:** Doctor
- **Trigger:** Doctor clicks "Hoàn thành khám" (Complete Examination).
- **Description:** The Doctor closes the examination session. The system validates all clinical fields, saves the final EMR, updates queue status to "Completed", and locks the form to read-only.
- **Preconditions:** PRE-1: EMR session active, patient status = "Đang khám".
- **Postconditions:** POST-1: Status → "Đã hoàn thành". POST-2: EMR finalized and locked to Read-Only.
- **Normal Flow:**
  1. Doctor enters all necessary clinical information including final diagnosis/notes.
  2. Doctor clicks "Hoàn thành khám".
  3. System saves the data, sets EMR status "Completed", updates queue status to "Completed".
  4. System displays "Examination completed successfully."
  5. System disables all input controls — strict Read-Only.
- **Alternative Flows:** ALT-1 — Direct finalization bypassing Save Draft entirely.
- **Exceptions:** E1 — Connection lost mid-entry: auto-saves every 2 minutes; restores on reconnect.
- **Priority:** Must Have

#### UC-25d: Delete Electronic Medical Record (EMR)
- **Primary Actor:** Doctor
- **Trigger:** Doctor clicks "Xóa HSBA" (Delete EMR) when a patient decides to stop the examination halfway.
- **Description:** The Doctor deletes the current EMR when the patient decides not to proceed. Releases the patient from "In Progress" and updates the queue status accordingly.
- **Preconditions:** PRE-1: Doctor logged in. PRE-2: Patient in an active session ("In Progress"). PRE-3: The current EMR form has not been finalized.
- **Postconditions:** POST-1: The EMR form is removed from the list. POST-2: Appointment status updated to "CANCELLED". POST-3: Screen redirects to today's patient queue.
- **Normal Flow:**
  1. Doctor is viewing the EMR form of a patient with status "IN_PROGRESS".
  2. Patient requests to stop mid-way.
  3. Doctor clicks "Xóa HSBA".
  4. System shows a confirmation dialog.
  5. Doctor selects "Confirm".
  6. System deletes the draft data, updates queue status to "CANCELLED" in real time.
  7. System redirects the Doctor back to the Patient Queue.
- **Alternative Flows:** 3a — Doctor clicks accidentally: selecting "Cancel" on the dialog keeps the EMR and "IN_PROGRESS" status unchanged.
- **Priority:** Must Have

#### UC-26: View Patient Medical History
- **Primary Actor:** Doctor, Patient
- **Trigger:** Doctor opens the EMR History tab; Patient navigates to 'My Medical Records'.
- **Description:** Authorised actors view a chronological list of all past EMRs for a patient. Doctors see the full clinical record; Patients see a patient-friendly summary. All access events are logged.
- **Preconditions:** PRE-1: Actor authenticated. PRE-2: For Doctor: the patient has at least one past EMR and the Doctor is the assigned treating physician (BR-08). PRE-3: For Patient: access limited strictly to their own records.
- **Postconditions:** POST-1: Access event logged (BR-08).
- **Normal Flow:**
  1. Actor navigates to the Medical History screen.
  2. System retrieves all EMRs, sorted newest-first.
  3. System displays summary cards: visit date, doctor name, primary diagnosis.
  4. Actor clicks a card to expand full details (VA, diagnosis, prescriptions, lab results).
  5. System logs the access event.
- **Exceptions:** E1 — Unauthorised access attempt: HTTP 403, logged as a violation.
- **Priority:** Must Have | **Frequency:** Multiple times/day for Doctors; occasional for Patients
- **Business Rules:** BR-08, BR-09
- **Assumptions:** Access control enforced at the backend service layer.

#### UC-27: Issue Drug Prescription
*(See UC-28 for the formalised Eyeglass Prescription flow; UC-27's drug-prescription detail mirrors UC-28's structure within the same EMR tab set.)*

#### UC-28: Issue Eyeglass Prescription
- **Primary Actor:** Doctor
- **Secondary Actors:** Patient (notified), System
- **Trigger:** Within an open EMR (UC-25), after refraction findings are recorded, the Doctor switches to the 'Eyeglass Prescription' tab.
- **Description:** Formalises eyeglass prescriptions as a standalone, top-level use case — a primary clinical deliverable feeding directly into the eyeglass ordering/fabrication pipeline.
- **Preconditions:** PRE-1: EMR open and IN_PROGRESS. PRE-2: Doctor has a valid `license_number`. PRE-3: Refraction/visual acuity findings recorded for this visit.
- **Postconditions:** POST-1: An eyeglass prescription created (status = ISSUED), capturing SPH/CYL/AXIS/ADD per eye (OD/OS) and PD. POST-2: Prescription visible to the Patient and orderable. POST-3: Event logged.
- **Normal Flow:**
  1. Doctor switches to the 'Eyeglass Prescription' tab.
  2. Doctor enters SPH, CYL, AXIS, ADD per eye (OD/OS) and pupillary distance (PD).
  3. Doctor specifies lens type and clinical recommendation notes.
  4. System validates entered ranges are clinically plausible.
  5. Doctor saves; system sets status = ISSUED and timestamps it.
  6. System notifies the Patient that a new prescription is available and orderable.
- **Alternative Flows:** ALT-1 — Doctor revises a prescription within the same still-open EMR (before finalisation): overwrites previous values; once finalised, becomes read-only.
- **Exceptions:** E-1 — Out-of-range value (e.g., AXIS outside 0–180°): blocks save until corrected.
- **Priority:** Must Have | **Frequency:** Issued for a meaningful share of visits; one per qualifying visit
- **Business Rules:** BR-06
- **Relations to other UCs:** Consumed by UC-44 (View Prescriptions) and UC-41 (Order Eyeglasses), which drives UC-36 (Fabricate Eyeglasses) and UC-21 (Confirm Pickup).

#### UC-29: Issue Lab/Imaging Order
- **Primary Actor:** Doctor
- **Secondary Actors:** Lab Technician (notified)
- **Trigger:** Within an open EMR (UC-25), the Doctor determines additional diagnostic testing is needed and clicks 'Order Lab/Imaging Test'.
- **Description:** The Doctor selects one or more test types from the lab/imaging catalogue (UC-54), specifies priority, and submits the order, routed to the Lab Technician's queue (UC-33).
- **Preconditions:** PRE-1: EMR open and IN_PROGRESS. PRE-2: At least one active lab/imaging test exists in the catalogue.
- **Postconditions:** POST-1: `lab_orders` record created (status = PENDING), `ordered_by = doctor`. POST-2: One `lab_order_items` row per selected test (status = PENDING). POST-3: Order appears on the Lab Queue. POST-4: Event logged.
- **Normal Flow:**
  1. Doctor clicks 'Order Lab/Imaging Test'.
  2. System displays the catalogue (name, category, turnaround time, price).
  3. Doctor selects one or more tests and sets priority (NORMAL/URGENT).
  4. Doctor adds optional clinical notes for the technician.
  5. Doctor submits.
  6. System creates `lab_orders` + one `lab_order_items` per test.
  7. System notifies the Lab Technician; order appears on the Lab Queue, sorted by order time and priority.
  8. Doctor continues the EMR flow awaiting results (returned via UC-35).
- **Alternative Flows:** ALT-1 — Cancel a pending order before testing begins.
- **Exceptions:**
  - E-1 — No test selected: 'Select at least one test.'
  - E-2 — Catalogue entry went inactive since the EMR was opened: excluded from selection; flags previously-selected inactive tests for removal.
- **Priority:** Must Have | **Frequency:** Multiple per day
- **Assumptions:** Test catalogue is maintained by the Clinic Manager (UC-54), not the Admin.

#### UC-30: View Lab Results
- **Primary Actor:** Patient, Doctor
- **Trigger:** Patient navigates to 'My Test Results'; Doctor opens the Lab Results tab in the EMR.
- **Description:** Authorised actors view completed lab/imaging results for a specific visit. Doctors see full clinical data with annotations; Patients see a simplified view.
- **Preconditions:** PRE-1: `lab_result` exists with status = COMPLETED. PRE-2: Access validated per BR-08.
- **Postconditions:** POST-1: Access event logged.
- **Normal Flow:**
  1. Actor navigates to the lab results view.
  2. System retrieves results authorised for the actor.
  3. System displays: test type, measured values, reference ranges, attached images, doctor annotations.
  4. Patient may download results as PDF.
  5. System logs the access event.
- **Exceptions:** E1 — Results not yet available: 'Results are pending. You will be notified when they are ready.'
- **Priority:** Must Have | **Frequency:** Multiple times/day for Doctors; occasional for Patients
- **Business Rules:** BR-08

#### UC-31: View Care Queue
- **Primary Actor:** Nurse
- **Trigger:** Nurse logs in or opens the 'Care Queue' screen.
- **Description:** The Nurse views all CareSessions assigned to them for the day, ordered by scheduled time, and selects the next patient to begin a session. Parallels the Lab Technician's queue and Doctor's patient queue for the wellness-care workflow.
- **Preconditions:** PRE-1: Nurse authenticated. PRE-2: At least one CareSession assigned to this nurse with status = BOOKED today.
- **Postconditions:** POST-1: Queue displayed, refreshed in real time.
- **Normal Flow:**
  1. Nurse opens 'Care Queue'.
  2. System displays all BOOKED CareSessions for this nurse today, ordered by scheduled time.
  3. Each row shows patient name, session type, scheduled time, package/subscription reference.
  4. Nurse selects a session, clicks 'Start Session' (delegates to UC-32).
- **Exceptions:** E-1 — No sessions assigned: "No care sessions assigned to you today."
- **Priority:** Should Have | **Frequency:** Continuous throughout the nurse's shift
- **Relations to other UCs:** Populated by UC-19; leads into UC-32.

#### UC-32: Deliver Care Session
- **Primary Actor:** Nurse
- **Secondary Actors:** System (notification to Receptionist for checkout)
- **Trigger:** Nurse clicks 'Start Session' on a queued CareSession (from UC-31).
- **Description:** The Nurse conducts the wellness/care session, records brief session notes and any observed issues, and marks the session complete, triggering checkout.
- **Preconditions:** PRE-1: CareSession status = BOOKED, assigned to this nurse. PRE-2: Nurse authenticated.
- **Postconditions:** POST-1: Status IN_PROGRESS → COMPLETED, with timestamps. POST-2: Session notes saved. POST-3: Receptionist notified for checkout.
- **Normal Flow:**
  1. Nurse clicks 'Start Session'; status → IN_PROGRESS.
  2. Nurse performs the session.
  3. Nurse records notes and duration.
  4. Nurse clicks 'Complete Session'.
  5. System validates notes saved, sets status = COMPLETED.
  6. System notifies the Receptionist for checkout.
- **Alternative Flows:** ALT-1 — Patient reports discomfort/adverse reaction: Nurse flags 'Incident' with a mandatory note; system notifies the Clinic Manager and, if needed, escalates to a Doctor.
- **Exceptions:** E-1 — Attempt to complete without notes: requires at least a brief note.
- **Priority:** Should Have | **Frequency:** One per scheduled care session; several per nurse per day
- **Assumptions:** Care session notes are non-clinical and distinct from the EMR; incidents may be escalated but don't themselves constitute a medical record.
- **Relations to other UCs:** Completion triggers UC-20.

---

### 2.5 — LIS & Imaging

#### UC-33: View Lab Queue
*(Lab Technician's queue screen, parallel in structure to UC-24/UC-31 — see UC-34 for the detailed submission flow it leads into.)*

#### UC-34: Submit Lab/Test Result
- **Primary Actor:** Lab Technician
- **Trigger:** Lab Technician opens the Lab Queue and selects a pending lab order; or Doctor directly records basic VA measurements.
- **Description:** The Lab Technician performs ophthalmological tests (refraction, OCT, fundus photography, IOP measurement) ordered by the Doctor and submits the results. Results are automatically linked to the EMR in real time (< 5 seconds).
- **Preconditions:** PRE-1: A `lab_order` with status = PENDING exists. PRE-2: Lab Technician authenticated.
- **Postconditions:** POST-1: `lab_result` created and linked to the `lab_order`. POST-2: `lab_order` status = COMPLETED. POST-3: Results appear in the Doctor's EMR within 5 seconds.
- **Normal Flow:**
  1. Lab Technician opens the Lab Order & Results screen.
  2. System displays PENDING orders, oldest first.
  3. Lab Technician selects an order and reviews requested tests.
  4. Lab Technician performs tests and enters results: Refraction (SPH/CYL/AXIS per eye), IOP (mmHg per eye), OCT/fundus images (file upload).
  5. Lab Technician clicks 'Submit Results'.
  6. System creates `lab_result`, marks `lab_order` COMPLETED.
  7. System pushes results to the Doctor's EMR in real time (< 5 seconds).
  8. System notifies the Doctor: 'Lab results ready for [Patient Name]'.
- **Exceptions:** E1 — Image upload failure: 'Image upload failed. Please retry.' Numerical results may be saved first, images uploaded separately.
- **Priority:** Must Have | **Frequency:** Multiple times/day
- **Business Rules:** BR-08
- **Assumptions:** File storage configured (local disk or cloud S3). NFR: sync < 5 seconds.

#### UC-35: Review Submitted Lab Results
- **Primary Actor:** Doctor
- **Secondary Actors:** System (real-time push to EMR)
- **Trigger:** Lab Technician submits lab results (UC-34); system pushes a real-time notification to the Doctor.
- **Description:** The Doctor receives a real-time notification when lab results are ready. The Doctor reviews the findings, adds clinical annotations, and updates the EMR diagnosis if warranted.
- **Preconditions:** PRE-1: `lab_result` exists with status = COMPLETED. PRE-2: Doctor is the treating physician assigned to this appointment.
- **Postconditions:** POST-1: Doctor annotation saved to the `lab_result`. POST-2: EMR diagnosis updated if required. POST-3: Access event logged.
- **Normal Flow:**
  1. Doctor receives a notification: 'Lab results ready for [Patient Name]'.
  2. Doctor opens the result via notification link or the EMR Lab Results tab.
  3. Doctor reviews all result data and attached images.
  4. Doctor types a clinical annotation/interpretation.
  5. Doctor updates the EMR diagnosis if warranted.
  6. Doctor clicks 'Save Annotation'.
  7. System saves and logs the event.
- **Priority:** Must Have | **Frequency:** Per lab order; follows UC-34
- **Business Rules:** BR-08
- **Assumptions:** Real-time push via WebSocket.

#### UC-36: Fabricate Eyeglasses
- **Primary Actor:** Lab Technician
- **Secondary Actors:** Receptionist (notified on completion)
- **Trigger:** Lab Technician opens the 'Glasses Production Queue' and sees an order with status = PENDING or IN_PRODUCTION (created via UC-41).
- **Description:** The Lab Technician (optical workshop) processes an eyeglass order: fits lenses into the selected frame per the locked prescription, updates production status, and marks the pair ready for pickup.
- **Preconditions:** PRE-1: `glasses_orders` exists with status = PENDING (payment confirmed per UC-41). PRE-2: Lab Technician authenticated.
- **Postconditions:** POST-1: Status progresses PENDING → IN_PRODUCTION → READY. POST-2: `dispensed_by` and timestamps recorded at each stage. POST-3: Receptionist/Patient notified when status = READY.
- **Normal Flow:**
  1. Lab Technician opens the 'Glasses Production Queue', sorted by order date, filtered to PENDING/IN_PRODUCTION.
  2. Lab Technician selects an order; system displays frame, lens type/coating, locked prescription values (read-only).
  3. Lab Technician clicks 'Start Production'; status = IN_PRODUCTION.
  4. Lab Technician performs lens cutting and frame fitting.
  5. Lab Technician clicks 'Mark Ready'; system validates the order isn't cancelled, sets status = READY.
  6. System notifies the Receptionist and Patient (delegates to UC-21).
- **Alternative Flows:** ALT-1 — Quality issue mid-production: flags 'Rework Needed', logs a note, restarts from step 3 with a new lens batch (original retained, no hard delete — BR-09).
- **Exceptions:** E-1 — Order cancelled before production completed: blocks further steps, "This order has been cancelled."
- **Priority:** Should Have | **Frequency:** Several orders per week, tied to UC-41 volume
- **Business Rules:** BR-09
- **Assumptions:** Frame inventory availability was already confirmed at order time (UC-41); this UC covers fabrication only.

---

### 2.6 — Pharmacy

#### UC-37: Dispense Drug (Receive & Dispense Drug Prescription)
- **Primary Actor:** Pharmacist
- **Secondary Actors:** System (inventory update, notification to Receptionist)
- **Trigger:** Pharmacist opens the Dispensing Dashboard and sees a prescription with status = PENDING.
- **Description:** The Pharmacist receives the electronic prescription routed from the Doctor, reviews lines, prepares each medication, and confirms dispensing. The system updates inventory and prescription status to DISPENSED.
- **Preconditions:** PRE-1: `prescription` with status = PENDING exists. PRE-2: Pharmacist authenticated.
- **Postconditions:** POST-1: Status = DISPENSED. POST-2: Dispensing log recorded (pharmacist, timestamp, batch IDs). POST-3: Receptionist notified to include pharmacy charges in the final invoice.
- **Normal Flow:**
  1. Pharmacist opens the Dispensing Dashboard.
  2. System displays PENDING prescriptions sorted by creation time.
  3. Pharmacist selects a prescription, reviews each line item.
  4. System displays medicine name, dosage form, quantity, unit price per line.
  5. Pharmacist reviews each line, confirms availability.
  6. Pharmacist clicks 'Confirm Dispensed'.
  7. System records dispensed items/quantities.
  8. System updates prescription status = DISPENSED.
  9. System generates a pharmacy invoice for the dispensed items.
  10. System notifies the Receptionist: 'Pharmacy charges ready for [Patient Name]'.
- **Alternative Flows:** ALT-1 — Patient declines to purchase: Pharmacist marks 'Skipped'; status = SKIPPED; Receptionist notified only examination fees apply.
- **Exceptions:** E1 — Medicine not available: pharmacist presses "Skip" to set status = SKIPPED.
- **Priority:** Must Have | **Frequency:** Multiple per day

#### UC-38: Issue Electronic Invoice (Pharmacy)
- **Primary Actor:** Pharmacist
- **Secondary Actors:** System (notifies Receptionist)
- **Trigger:** Pharmacist completes dispensing (prescription status = DISPENSED).
- **Description:** After dispensing, the Pharmacist issues an electronic pharmacy invoice, linked to the visit's billing record; the Receptionist is notified to consolidate it into the final payment.
- **Preconditions:** PRE-1: Prescription status = DISPENSED. PRE-2: Pharmacist authenticated.
- **Postconditions:** POST-1: `PharmacyInvoice` created and linked to the parent invoice. POST-2: Receptionist notified. POST-3: Invoice line items populated from the `medicines` table.
- **Normal Flow:**
  1. After dispensing (UC-37), Pharmacist clicks 'Issue Invoice'.
  2. System auto-populates the invoice with dispensed items/quantities/unit prices from `medicines`.
  3. Pharmacist reviews and confirms.
  4. System creates the `PharmacyInvoice`, linked to the visit's parent `invoice_id`.
  5. System notifies the Receptionist: 'Pharmacy invoice ready for [Patient Name]'.
- **Exceptions:** E1 — Price discrepancy: Pharmacist flags it; system notifies Admin to correct the `medicines` price table.
- **Priority:** Must Have | **Frequency:** Per dispensed prescription
- **Business Rules:** BR-10
- **Assumptions:** Pricing for medicines is current in the `medicines` table.

---

### 2.7 — Service Package & Eyeglass Sales

#### UC-39: Purchase Service Package
- **Primary Actor:** Guest (browse only), Patient (purchase & register)
- **Secondary Actors:** Receptionist (registers a package on behalf of a patient)
- **Trigger:** User navigates to the 'Service Packages' section on the Home Page or Patient Portal.
- **Description:** Any visitor (Guest) can view the published wellness/service package catalogue (e.g., eye massage, eye meditation, care bundles) — name, description, general benefits — without login. Prices and the registration action are visible only to authenticated Patients. An authenticated Patient can select and purchase a package; upon confirmation the package is activated and linked to their account as a `ServiceSubscription`. Patients then book individual sessions via UC-11/UC-40.
- **Preconditions:** PRE-01: `ClinicService` catalogue (`GET /api/v1/services`) has at least one ACTIVE service, tagged CLINICAL ("khám lâm sàng") or CARE ("gói chăm sóc"). PRE-02: `/services` is public — reachable without authentication.
- **Postconditions:** POST-01 (CARE, Patient): a `ServiceRegistration` row created with status PENDING, linking the patient and service; appears under "Dịch vụ đã đăng ký tư vấn" in UC-46. POST-02 (CARE, Receptionist on behalf): same, with `patientId`/notes supplied by the Receptionist. POST-03 (CLINICAL, Patient): no registration created; the Patient is redirected into the appointment Booking flow with the service pre-selected.
- **Normal Flow:**
  1. Actor opens `/services`.
  2. System calls `GET /api/v1/services`, renders ACTIVE services as cards: name, type tag, description, duration/sessions, price, thumbnail.
  3. Actor may search by keyword or switch grid/list layouts.
  4. Actor clicks a card to open the detail modal (adds free-text "Chi tiết liệu trình" content).
  5. If unauthenticated, the action button reads "Đăng nhập để đặt lịch/đăng ký" and routes to `/login`.
  6. If authenticated Patient + CARE package: "Đăng ký ngay" opens a confirmation modal → `POST /api/v1/services/register {serviceId}` → success message.
  7. If authenticated Patient + CLINICAL service: "Đặt lịch khám" navigates to `/patient/booking` with the service pre-filled (no registration created).
  8. If authenticated Receptionist + CARE package: "Đăng ký cho BN" opens a modal to search/select a patient, add optional notes, then "Xác nhận đăng ký" → `POST /api/v1/services/register {serviceId, patientId, notes}`.
- **Alternative Flows:** A1/A2 — Already-pending registration for the same service (detected via `GET /api/v1/services/my-registrations`): the action button is disabled, shows "Đang chờ tư vấn" instead of "Đăng ký ngay".
- **Exceptions:**
  - EX-01 (Registration fails): shows backend message or generic "Đăng ký thất bại, vui lòng thử lại"; modal stays open for retry.
  - EX-02 (No patient selected, Receptionist flow): "Xác nhận đăng ký" stays disabled until a patient is selected.
  - EX-03 (Catalogue empty / no search matches): "Hiện chưa có dịch vụ nào" or "Không tìm thấy dịch vụ nào khớp".
- **Priority:** Should Have | **Frequency:** Occasional; expected spike during promotional campaigns
- **Business Rules:** Browsing requires no authentication; registering/booking requires PATIENT role (or RECEPTIONIST acting on a patient's behalf). `serviceType` determines the action: CLINICAL always routes into appointment booking, CARE always goes through the registration/consultation funnel — no direct online payment step in the current build. A Receptionist registering on behalf of a patient must first locate that patient via search; no new patient can be created from this screen.
- **Assumptions:** Catalogue is maintained by Admin. Payment gateway (VietQR) is configured (DE-4). Guest sees package info only; price and register action require login.
- **Non-Functional Requirements:** NFR-01: catalogue list loads within < 2s at P95 for a public, unauthenticated visitor. NFR-02: catalogue is publicly cacheable (no auth required); registration/booking actions enforce role checks server-side regardless of UI button state.

#### UC-40: Book Care Session
- **Primary Actor:** Patient
- **Secondary Actors:** Receptionist (books on behalf of a patient)
- **Trigger:** Patient selects 'Book a Session' from an active service-package subscription on 'My Packages' (UC-46), or selects a single non-medical care service directly from the catalogue.
- **Description:** A Patient with an active service-package subscription (or purchasing a standalone session) schedules a date/time for a wellness/care session. Unlike a doctor appointment, the session does not require a doctor and is later staffed by a Nurse.
- **Preconditions:** PRE-01: Patient (or the patient the Receptionist acts for) holds a `PatientServiceSubscription` with status ACTIVE and `remainingSessions > 0`. PRE-02: The subscription's `expiryDate`, if set, is not in the past.
- **Postconditions:** POST-01: A `CareSession` created with status BOOKED, the next `sessionNumber` for that subscription, the chosen `scheduledDateTime`, optional notes. POST-02: The subscription's `usedSessions` incremented / `remainingSessions` decremented immediately at booking time (not delivery time). POST-03: If `remainingSessions` reaches 0, the subscription auto-transitions to DEPLETED. POST-04: An in-app notification confirms the booking.
- **Normal Flow:**
  1. Patient opens `/patient/book-session`, optionally pre-filled with a `subscriptionId`.
  2. System lists the Patient's subscriptions filtered to ACTIVE with `remainingSessions > 0`.
  3. Patient selects a subscription, picks a future date/time, optionally enters notes.
  4. Patient submits → `POST /api/v1/care-sessions {subscriptionId, scheduledDateTime, notes}`.
  5. System validates the subscription is ACTIVE, not expired, has remaining sessions; validates `scheduledDateTime` is in the future.
  6. System creates the `CareSession` (status = BOOKED), deducts one session, marks DEPLETED if it just reached 0.
  7. System creates a confirmation notification, returns 201.
  8. UI shows "Đặt buổi khám thành công!" and redirects to `/patient/care-sessions`.
- **Alternative Flows:** A1/A2 — Receptionist books on behalf of a patient; same validation/deduction rules apply.
- **Exceptions:**
  - EX-01 (Missing subscription): → 400 "Vui lòng chọn gói đăng ký".
  - EX-02 (Missing date/time): → 400 "Vui lòng chọn ngày giờ".
  - EX-03 (Past date/time): → 400 "Thời gian đặt lịch phải trong tương lai".
  - EX-04 (Subscription not ACTIVE): → 400 "Gói đăng ký không còn hiệu lực".
  - EX-05 (Subscription expired): → 400 "Gói đăng ký đã hết hạn"; subscription concurrently marked EXPIRED.
  - EX-06 (No remaining sessions): → 400 "Gói đăng ký đã hết buổi".
  - EX-07 (Ownership mismatch): → 400 "Gói đăng ký không thuộc bệnh nhân này".
- **Priority:** Should Have | **Frequency:** Occasional; tied to active subscription volume
- **Business Rules:** BR-14 (Subscription Consumption — sessions deducted at booking time, not delivery time, to prevent overbooking past the purchased balance); `sessionNumber` = count of existing active sessions for that subscription + 1; ACTIVE → DEPLETED automatically once `remainingSessions` hits 0; ACTIVE → EXPIRED the first time a booking attempt is made past `expiryDate`.
- **Assumptions:** Care-session capacity per time slot is configured by the Clinic Manager; nurse staffing is resolved afterward, not at booking time.
- **Non-Functional Requirements:** NFR-01: validation + creation complete within < 2s at P95. NFR-02: the session-deduction check and `CareSession` insert should be one atomic unit to avoid a double-booking race against the same balance.

#### UC-41: Order Eyeglasses from Clinic
- **Primary Actor:** Patient
- **Secondary Actors:** Receptionist (fulfillment & walk-in alt flow), System (notification, invoice generation)
- **Trigger:** Patient clicks 'Order Glasses' from their Eyeglass Prescription detail screen, OR Receptionist initiates an order on behalf of the Patient at the counter.
- **Description:** After a Doctor issues an eyeglass prescription, the Patient can place a glasses order with the clinic: browsing the frame catalogue, selecting a frame, optionally adding coating preferences, and confirming the order. The system creates an `EyeglassOrder`, generates an invoice, notifies staff, and tracks the order through fulfilment to pickup.
- **Preconditions:** PRE-1: Patient authenticated. PRE-2: A finalized eyeglass prescription (status = ISSUED) linked to the patient's visit. PRE-3: At least one frame is available in the catalogue.
- **Postconditions:** POST-1: `EyeglassOrder` created (status = PENDING), linked to the prescription and patient. POST-2: Receptionist/Optical staff notified. POST-3: `EyeglassInvoice` generated (status = UNPAID), linked to the patient's account. POST-4: Order status progresses IN_PROGRESS → READY_FOR_PICKUP → COMPLETED upon fulfilment.
- **Normal Flow:**
  1. Patient navigates to 'My Prescriptions', selects an eyeglass prescription.
  2. System displays SPH, CYL, AXIS, ADD (OD/OS), PD, lens type.
  3. Patient clicks 'Order Glasses at Clinic' (E2).
  4. System displays the frame catalogue (name, brand, material, color, price); filterable by price/material/style (E1).
  5. Patient browses and selects a frame.
  6. System displays an order summary: frame, locked lens parameters, lens type, optional coating add-ons, estimated total price.
  7. Patient may add optional notes/coating preferences (anti-blue, photochromic) — clinical parameters remain locked.
  8. Patient reviews and confirms.
  9. System creates the `EyeglassOrder` (status = PENDING).
  10. System notifies Receptionist/Optical staff.
  11. System generates an `EyeglassInvoice` (status = UNPAID), displays it to the Patient.
  12. Patient pays at the counter or online (VietQR); on confirmation: order → IN_PROGRESS, invoice → PAID.
  13. Staff processes the order (cutting, fitting); marks → READY_FOR_PICKUP when ready.
  14. System notifies the Patient.
  15. Staff hands off the glasses; order → COMPLETED.
- **Alternative Flows:**
  - ALT-1 — Walk-in order at the counter: Receptionist opens 'New Glasses Order', searches the patient, selects their prescription, picks a frame on the Patient's behalf; continues from step 6.
  - ALT-2 — Patient adjusts optional preferences (coating); SPH/CYL/AXIS/ADD remain locked to the issued prescription.
- **Exceptions:**
  - E1 — Frame catalogue empty: 'No frames currently available. Please contact the clinic directly.' Flow cancelled.
  - E2 — Prescription expired (> 24 months from issue): warning, non-blocking; Patient may acknowledge and proceed or cancel.
  - E3 — Payment timeout (online, > 10 min): order stays PENDING; Patient notified with a retry link; staff not notified until payment confirmed.
- **Priority:** Should Have | **Frequency:** Several orders per week; peaks after high-volume examination days
- **Business Rules:** Eyeglass prescription parameters are read-only from the issued prescription — Patient cannot modify clinical values (BR-08 variant). An order cannot be placed without a valid ISSUED prescription. Expiry warning at > 24 months from issue date (non-blocking).
- **Assumptions:** Frame catalogue maintained by Admin (UC-56). Lens type pre-filled from the prescription; coating preferences are Patient-editable add-ons. Payment gateway (VietQR) configured (DE-4).
- **Relations to other UCs:** Triggered from UC-44 (View Prescriptions). Prescription source: UC-28. Frame catalogue maintenance: UC-56.

#### UC-42: Manage Service Packages
- **Primary Actor:** Clinic Manager
- **Trigger:** Clinic Manager navigates to 'Service Package Management'.
- **Description:** The Clinic Manager creates and maintains the catalogue of sellable wellness/care service packages (name, description, included services, session count, validity period, price), distinct from clinical services and lab tests, which require business/pricing judgement rather than purely technical configuration.
- **Preconditions:** PRE-01: Manager authenticated, has access to `/manager/service-packages`. PRE-02: The live database's `services` table has NVARCHAR (not VARCHAR) columns for `description`/`badge`/`price_label`, otherwise Vietnamese text is corrupted to '?' on save.
- **Postconditions:** POST-01 (Create): a new `ClinicService` row inserted with status ACTIVE, visible on the public `/services` catalogue. POST-02 (Edit): the targeted row updated in place. POST-03 (Stop selling / Resell): the active/visible flag toggled; hidden packages excluded from `/services` until restored.
- **Normal Flow:**
  1. Manager opens `/manager/service-packages`, sees the list of packages (filterable to include hidden ones).
  2. Manager clicks "Thêm gói mới" or "Sửa" on an existing package, opening the create/edit form.
  3. Manager fills in name, description, price (> 0), duration in minutes (> 0), sessions included (≥ 1), validity in days (optional — blank means "Không giới hạn"), uploads a thumbnail (drag-and-drop supported).
  4. On upload, the UI calls `POST /api/v1/files/upload` (multipart, MANAGER/ADMIN only); the backend stores the file under `backend/uploads/`, serves it at `/api/uploads/**`; the returned URL is set as `thumbnailUrl`.
  5. Manager saves → `POST /api/v1/services/packages` (create) or `PUT /api/v1/services/packages/{id}` (edit).
  6. The package list refreshes; for ACTIVE packages, the change is immediately reflected on `/services`.
- **Alternative Flows:** A1/A2 — Stop selling / resell: "Ngừng bán" on an ACTIVE package → `PATCH /api/v1/services/packages/{id}/toggle` marks it inactive (disappears from `/services`); "Hiện gói đã ẩn" filter + "Bán lại" reactivates via the same endpoint.
- **Exceptions:**
  - EX-01 (Validation failure): name/description empty, price ≤ 0, duration ≤ 0, sessionsIncluded < 1, or no image → field-specific errors.
  - EX-02 (Encoding regression): if a live-DB column is still VARCHAR instead of NVARCHAR, Vietnamese diacritics silently become '?' on save — a **schema issue, not an application bug**; check this first if '?' reappears.
- **Priority:** Should Have | **Frequency:** Occasional; during catalogue planning or seasonal promotions
- **Business Rules:** Required fields: name, description, price > 0, duration > 0, sessionsIncluded ≥ 1, thumbnail image; `validityDays` is optional (null = unlimited) and, when set, determines the subscription's `expiryDate` at purchase time. Only MANAGER/ADMIN may call the image-upload or package CRUD endpoints. Hidden (inactive) packages remain editable/listable to the Manager but excluded from the patient-facing catalogue until reactivated.
- **Assumptions:** Distinguished from general system/medicine/service config (Admin-owned) by being a Manager-owned, business/pricing-focused catalogue specific to wellness packages.
- **Non-Functional Requirements:** NFR-01: list/catalogue refresh < 2s at P95. NFR-02: image uploads restricted to MANAGER/ADMIN; backend must be restarted after upload-handling code changes for new routes to take effect.

#### UC-43: Manage Discount Campaigns
- **Primary Actor:** Clinic Manager
- **Secondary Actors:** System (applies discount at checkout)
- **Trigger:** Clinic Manager navigates to 'Discount Campaigns' to create a promotional offer.
- **Description:** The Clinic Manager defines time-bound discount campaigns (percentage or fixed amount) applicable to service packages, eyeglasses, or specific services, with optional usage limits and a promo code. At checkout, the system applies the best eligible discount to the invoice's discount amount.
- **Preconditions:** PRE-1: Manager authenticated.
- **Postconditions:** POST-1: Discount campaign record created (status = SCHEDULED/ACTIVE/EXPIRED). POST-2: Discount applied automatically (or via promo code) at qualifying checkouts within the validity window. POST-3: Event logged.
- **Normal Flow:**
  1. Manager navigates to 'Discount Campaigns', clicks 'Create Campaign'.
  2. Manager enters name, discount type (percentage/fixed), value, applicable scope, start/end date, usage limit, optional promo code.
  3. System validates the date range and discount value.
  4. Manager saves; system creates the campaign with status = SCHEDULED (or ACTIVE if start date is today).
  5. On the start date, status auto-transitions to ACTIVE; on the end date, to EXPIRED.
  6. During checkout, the system checks eligible active campaigns matching the order scope and applies the discount automatically or validates the entered promo code.
- **Alternative Flows:**
  - ALT-1 — Manually deactivate a running campaign (budget exhausted): status = INACTIVE; stops applying immediately.
  - ALT-2 — View campaign performance: usage count and total discount value granted, feeding into UC-49.
- **Exceptions:**
  - E-1 — Invalid date range/value: blocks save, highlights field.
  - E-2 — Promo code not found/expired: "Invalid or expired promo code."
  - E-3 — Usage limit reached: "This promotion has reached its usage limit."
- **Priority:** Could Have | **Frequency:** Occasional; aligned with the marketing/promotional calendar
- **Business Rules:** BR-15 (Discount Stacking — at most one campaign per invoice/order unless explicitly marked combinable; the system always applies the single best-value eligible discount)
- **Assumptions:** Discount value is reflected in the invoice's discount fields per BR-11.
- **Relations to other UCs:** Consumed by UC-22; performance feeds UC-49.

---

### 2.8 — Patient Portal

#### UC-44: View Prescriptions
- **Primary Actor:** Patient
- **Trigger:** Patient navigates to 'My Prescriptions' in the Patient Portal.
- **Description:** The Patient views all drug prescriptions and eyeglass prescriptions ("toa kính") issued by Doctors across past visits. Patients can download the eyeglass prescription PDF to share with optical shops.
- **Preconditions:** PRE-1: Patient authenticated. PRE-2: At least one prescription is linked to the patient's visits.
- **Postconditions:** POST-1: Access event logged.
- **Normal Flow:**
  1. Patient navigates to 'My Prescriptions'.
  2. System retrieves all prescriptions linked to the patient's visits.
  3. System displays a list grouped by visit date, drug vs. eyeglass prescriptions separately.
  4. Patient expands a record for details: medicine names, dosage, lens parameters.
  5. For eyeglass prescriptions, Patient clicks 'Download PDF'.
  6. System generates and downloads the PDF.
- **Priority:** Must Have | **Frequency:** Occasional per patient
- **Business Rules:** BR-08
- **Assumptions:** PDF generation available for eyeglass prescriptions.

#### UC-45: View Diagnostic Results
- **Primary Actor:** Patient
- **Trigger:** Patient navigates to 'My Test Results' in the Patient Portal.
- **Description:** The Patient views their completed lab and imaging results from all past visits, along with the Doctor's annotations. A simplified view is shown for non-clinical audiences.
- **Preconditions:** PRE-1: Patient authenticated. PRE-2: At least one completed `lab_result` linked to the patient exists.
- **Postconditions:** POST-1: Access event logged.
- **Normal Flow:**
  1. Patient navigates to 'My Test Results'.
  2. System retrieves all `lab_results` for the patient's visits.
  3. System displays results grouped by visit date: test type, key values, doctor annotations.
  4. Patient may download results as PDF.
- **Priority:** Must Have | **Frequency:** Occasional per patient
- **Business Rules:** BR-08

#### UC-46: Register for Eye Care Services
- **Primary Actor:** Patient
- **Secondary Actors:** Receptionist
- **Trigger:** Patient browses 'Eye Care Services' on the Patient Portal and selects a service to register for.
- **Description:** The Patient browses the clinic's published service catalogue, selects a service or care package, and initiates a booking request pre-linked to that service. Delegates to the appointment booking flow (UC-11) with the service pre-selected.
- **Preconditions:** PRE-01: Patient authenticated with an active account. PRE-02: At least one CARE-type ("gói chăm sóc") service package exists and is visible on `/services`. PRE-03: Reached either directly via `/patient/subscriptions` ("Dịch vụ của tôi") or after registering interest in a package from UC-39.
- **Postconditions:** POST-01: For a new registration, a `ServiceRegistration` created with status PENDING (no payment, no session balance yet). POST-02: Once the clinic confirms the registration and the patient's `PatientServiceSubscription` becomes ACTIVE (Receptionist follow-up, currently outside this screen), the Patient sees a subscription card with session balance and an entry point into UC-40. POST-03: Cancelling a not-yet-used subscription sets its status to CANCELLED.
- **Normal Flow:**
  1. Patient navigates to "Dịch vụ của tôi" (`/patient/subscriptions`).
  2. System calls `GET /api/v1/subscriptions/my` and `GET /api/v1/services/my-registrations`, renders two sections: "Dịch vụ đã đăng ký tư vấn" (pending/confirmed registrations) and "Gói dịch vụ đã mua" (active/expired/depleted subscriptions).
  3. For each ACTIVE subscription with `remainingSessions > 0`, shows a "Đặt buổi khám" button leading into UC-40.
  4. For each ACTIVE subscription with `usedSessions = 0`, shows a "Hủy gói" button.
  5. If the Patient wants a new package, they follow "+ Mua gói mới" to `/services` (UC-39).
- **Alternative Flows:** A1–A4 — Cancel an unused subscription: clicks "Hủy gói" on a subscription with `usedSessions = 0` → confirmation dialog → `PATCH /api/v1/subscriptions/{id}/cancel` → status CANCELLED, list refreshes.
- **Exceptions:**
  - EX-01 (No registrations/subscriptions): empty state with a CTA linking to `/services`.
  - EX-02 (Cancel rejected by server): backend error message shown via alert; list unchanged.
- **Priority:** Should Have | **Frequency:** Occasional
- **Business Rules:** A subscription can only be cancelled by its owning Patient, and only while `usedSessions = 0` (the "Hủy gói" action is hidden once any session has been consumed). A PENDING `ServiceRegistration` carries no session balance; the Patient cannot book a Care Session (UC-40) until an ACTIVE `PatientServiceSubscription` exists. **Registration → subscription conversion (wired, iter 2):** the Receptionist works the registration on `/receptionist/...` — "Đã liên hệ" moves PENDING → CONFIRMED, then "Đặt buổi đến khám" calls `POST /api/v1/services/registrations/{id}/schedule`, which (in `ClinicServiceServiceImpl.scheduleClinicVisit`) creates the `PatientServiceSubscription` via `POST /subscriptions` (purchase on the patient's behalf), books the first `CareSession`, and marks the registration COMPLETED. From then the Patient sees the ACTIVE subscription under `/patient/subscriptions` and can self-book further sessions (UC-40).
- **Non-Functional Requirements:** NFR-01: `/patient/subscriptions` loads both registrations and subscriptions within < 2s at P95. NFR-02: cancellation is a single PATCH call; no partial state should remain if it fails.

#### UC-47: Generate Feedback
- **Primary Actor:** Patient
- **Trigger:** Patient clicks 'Leave Feedback' on the Patient Portal after an appointment is marked COMPLETED.
- **Description:** After the appointment is completed, the system sends a feedback request to the patient via the Portal and email. The patient may optionally rate the service quality (1–5 stars) and leave a written comment. The feedback is submitted, saved with status PENDING, and the Clinic Manager is notified for review.
- **Preconditions:** PRE-1: Patient authenticated. PRE-2: The linked appointment is COMPLETED. PRE-3: Patient has not already submitted feedback for this appointment.
- **Postconditions:** POST-1: A new `feedbacks` record created with status = PENDING. POST-2: Clinic Manager receives an in-app notification.
- **Normal Flow:**
  1. System automatically sends a feedback request via Portal and email after COMPLETED.
  2. Patient opens the feedback form, selects a star rating (1–5).
  3. Patient optionally types a written comment.
  4. Patient clicks 'Submit'; system validates the rating is provided.
  5. System saves the record (status = PENDING), notifies the Clinic Manager.
  6. System confirms submission with a success message.
- **Alternative Flows:** ALT-1 — Patient skips feedback by closing the form; no record created.
- **Exceptions:** E1 — No rating selected: 'Please select a star rating before submitting.'
- **Priority:** Should Have
- **Business Rules:** BR-21 (One Feedback — system prevents duplicate submissions per appointment)

---

### 2.9 — Administration & Analytics

#### UC-48: View Real-time Operational Analytics Dashboard
- **Primary Actor:** Clinic Manager
- **Trigger:** Clinic Manager opens the Dashboard from the main navigation.
- **Description:** The Clinic Manager views a live operational dashboard showing today's appointment progress, current queue lengths per doctor, pending prescriptions, outstanding invoices, and active lab orders. Auto-refreshes every 60 seconds.
- **Preconditions:** PRE-1: Clinic Manager authenticated.
- **Postconditions:** POST-1: Live operational widgets displayed with auto-refresh.
- **Normal Flow:**
  1. Manager opens the main Dashboard.
  2. System displays real-time widgets: today's total appointments vs. completed; queue lengths per doctor; PENDING prescriptions awaiting dispensing; outstanding (unpaid) invoices; lab orders currently IN_PROGRESS.
  3. Dashboard auto-refreshes every 60 seconds.
- **Priority:** Must Have | **Frequency:** Continuous during clinic hours
- **Assumptions:** Backend APIs respond with sub-second latency for dashboard widgets.

#### UC-49: Generate Revenue Report
- **Primary Actor:** Clinic Manager
- **Trigger:** Clinic Manager navigates to Reports → Revenue Report and selects a time range.
- **Description:** The Clinic Manager generates a revenue report for a selected period (day, week, month, or year), broken down by service type, doctor, and payment method. Exportable to Excel.
- **Preconditions:** PRE-1: Clinic Manager authenticated. PRE-2: Paid invoice records exist within the selected period.
- **Postconditions:** POST-1: Revenue data rendered on-screen. POST-2: Excel file generated and downloaded if export is requested.
- **Normal Flow:**
  1. Manager navigates to Reports → Revenue Report.
  2. Manager selects a time range (day, week, month, custom).
  3. System queries all PAID invoices within the range.
  4. System displays: total revenue, breakdown by service category, breakdown by doctor, payment method split (cash vs. QR).
  5. Manager clicks 'Export to Excel'.
  6. System generates and downloads the `.xlsx` file.
- **Exceptions:** E1 — No data for the selected period: 'No revenue data found for the selected period.'
- **Priority:** Must Have | **Frequency:** Daily and monthly by Clinic Manager
- **Assumptions:** All invoice records are correctly linked to service types and doctors.

#### UC-50: View Patient Volume Statistics and Trends
- **Primary Actor:** Clinic Manager
- **Trigger:** Clinic Manager navigates to Reports → Patient Statistics.
- **Description:** The Clinic Manager views patient volume analytics: total visits per period, new vs. returning patients, top diagnoses, and appointment status distribution, presented as charts and tables.
- **Preconditions:** PRE-1: Clinic Manager authenticated.
- **Postconditions:** POST-1: Statistics displayed on screen.
- **Normal Flow:**
  1. Manager navigates to Patient Statistics.
  2. Manager selects a time range.
  3. System calculates and displays: total appointments by status; new vs. returning patients; top 5 diagnoses (ICD codes); appointments per doctor.
  4. Data is visualised as bar/line charts and can be exported to Excel.
- **Priority:** Should Have | **Frequency:** Weekly / monthly

#### UC-51: Monitor Staff Performance Dashboard
- **Primary Actor:** Clinic Manager
- **Trigger:** Clinic Manager navigates to the Staff Performance section.
- **Description:** The Clinic Manager views performance KPIs for Doctors and clinical staff: patients seen, average consultation time, prescription volume, and on-time rate.
- **Preconditions:** PRE-1: Clinic Manager authenticated.
- **Postconditions:** POST-1: Staff KPIs displayed.
- **Normal Flow:**
  1. Manager navigates to Staff Performance.
  2. Manager selects a time range and optionally a specific staff member.
  3. System aggregates metrics from appointments and EMR timestamps.
  4. System displays: patients seen per doctor, average appointment duration, prescription volume, on-time start rate.
- **Priority:** Should Have | **Frequency:** Weekly / monthly
- **Assumptions:** Appointment start and end timestamps are recorded.

#### UC-52: Generate Feedback Report
- **Primary Actor:** Clinic Manager
- **Trigger:** Clinic Manager navigates to Reports → Feedback Report and selects a time range.
- **Description:** The Clinic Manager views aggregated patient feedback collected after visits: average ratings per doctor, common feedback themes, response rates.
- **Preconditions:** PRE-1: Clinic Manager authenticated. PRE-2: At least one feedback record exists for the selected period.
- **Postconditions:** POST-1: Feedback analytics displayed. POST-2: Exportable to Excel if requested.
- **Normal Flow:**
  1. Manager navigates to Reports → Feedback Report.
  2. Manager selects a time range.
  3. System retrieves all submitted feedback within the range.
  4. System displays: average star ratings per doctor, total responses, response rate %, most common comment themes.
  5. Manager may export the detailed feedback list to Excel.
- **Exceptions:** E1 — No feedback for the selected period: 'No feedback collected for this period.'
- **Priority:** Should Have | **Frequency:** Monthly by Clinic Manager
- **Assumptions:** Patient feedback is collected automatically after each finalised EMR.

#### UC-53: Approve Payroll
- **Primary Actor:** Clinic Manager
- **Secondary Actors:** Admin/Accounting (export), System
- **Trigger:** Clinic Manager opens 'Payroll' at the end of a pay period (e.g., monthly).
- **Description:** The Clinic Manager reviews the system-generated payroll summary for all staff — based on attendance, shifts, and performance-linked items (e.g., consultations completed, care sessions delivered) — adjusts line items if necessary, and approves the payroll run for processing/export to accounting.
- **Preconditions:** PRE-1: Manager authenticated. PRE-2: The pay period has ended and attendance/activity data for all staff is finalised.
- **Postconditions:** POST-1: `PayrollPeriod` record created/updated with status = APPROVED. POST-2: Individual `PayrollItem` records locked against further edits once approved. POST-3: Approved payroll exported/available for Accounting/Admin. POST-4: Event logged.
- **Normal Flow:**
  1. Manager navigates to 'Payroll', selects the pay period.
  2. System generates a draft payroll summary per staff member: base rate, hours/shifts attended, performance-linked components, deductions, net pay.
  3. Manager reviews each line item; may adjust amounts with a justification note.
  4. Manager clicks 'Approve Payroll' for the period.
  5. System validates no line item is missing required data, sets status = APPROVED, locks all `PayrollItem` records.
  6. System makes the approved payroll available for export to Accounting/Admin.
  7. Event logged with the approving manager and timestamp.
- **Alternative Flows:** ALT-1 — Reject and recalculate (status stays DRAFT). ALT-2 — Export only (no system disbursement; the fund transfer happens outside ECMS via the clinic's banking process).
- **Exceptions:**
  - E-1 — Manual adjustment exceeds a configured variance threshold: requires a mandatory justification note.
  - E-2 — Missing attendance/activity data for a staff member: blocks approval for that line, flags for review.
- **Priority:** Should Have | **Frequency:** Periodic (monthly), once per pay cycle
- **Business Rules:** BR-17 (Payroll Authority — only the Clinic Manager may approve a payroll period; once APPROVED, line items cannot be edited or hard-deleted, BR-09)
- **Assumptions:** ECMS computes payroll figures from attendance/activity data already captured; it does not execute the actual bank transfer.

#### UC-54: Manage Lab Test Catalogue
- **Primary Actor:** Clinic Manager
- **Secondary Actors:** Admin (shared infrastructure), Lab Technician (read-only consumer)
- **Trigger:** Clinic Manager navigates to 'Lab/Imaging Test Catalogue'.
- **Description:** The Clinic Manager maintains the catalogue of lab and imaging test types offered (e.g., OCT scan, fundus photography, refraction test) — name, category, price, estimated turnaround time — used when Doctors issue lab/imaging orders. Distinguished from Admin's general system/medicine/service configuration by being a Manager-owned, clinically-oriented catalogue requiring operational judgement about pricing and turnaround commitments.
- **Preconditions:** PRE-1: Manager authenticated.
- **Postconditions:** POST-1: Test catalogue entry created/updated (a `services` row with `is_lab_service = 1`). POST-2: Change immediately available for selection in UC-29. POST-3: Event logged.
- **Normal Flow:**
  1. Manager navigates to 'Lab/Imaging Test Catalogue'.
  2. System lists existing test types with status, price, average turnaround time.
  3. Manager clicks 'Add New Test' (or selects an existing entry to edit).
  4. Manager enters test name, category, price, duration/turnaround estimate, equipment/resource notes.
  5. System validates required fields and price > 0.
  6. Manager saves; system creates/updates the entry with `is_lab_service = 1`.
  7. The updated entry is immediately available for selection in UC-29.
- **Alternative Flows:** ALT-1 — Deactivate a test type: status = INACTIVE; existing pending orders unaffected, hidden from new selection.
- **Exceptions:** E-1 — Invalid price or duplicate test name: blocks save, highlights field.
- **Priority:** Should Have | **Frequency:** Occasional; during service-line planning or equipment changes
- **Business Rules:** BR-09
- **Assumptions:** Reuses the existing `services` table (`is_lab_service` flag) rather than a separate schema; ownership shifted from Admin (UC-56) to Clinic Manager for this catalogue subset.
- **Relations to other UCs:** Consumed by UC-29; complements UC-56 and UC-42.

---

### 2.10 — System Administration & Security

#### UC-55: Manage User Account
- **Primary Actor:** Admin
- **Secondary Actors:** System (sends account emails to new staff)
- **Trigger:** Admin navigates to the User Management screen.
- **Description:** The Admin creates, views, edits, activates, and deactivates staff accounts (Doctor, Receptionist, Lab Technician, Pharmacist, Manager). For Patient accounts — created via self-registration or walk-in registration — the Admin has read access plus the ability to activate/deactivate (e.g., on patient request, suspected fraud, or duplicate-account cleanup). **Admin cannot create a Patient account directly through this use case.** Hard deletion is prohibited for all account types (BR-09).
- **Preconditions:** PRE-1: Admin authenticated.
- **Postconditions:** POST-1: Account changes persisted. POST-2: New staff account email sent if a new staff account was created. POST-3: Event recorded. POST-4: If a Patient account is deactivated, all active sessions/tokens are invalidated; pending appointments remain unaffected unless separately cancelled.
- **Normal Flow:**
  1. Admin navigates to User Management.
  2. Admin selects account type filter: Staff or Patient.
  3. (Staff path) Admin clicks 'Add New User', enters full name, email, role, department.
  4. System validates the email is not already registered (E1).
  5. System creates the account (status = INACTIVE) with a temporary password.
  6. Admin reviews the default RBAC permissions for the assigned role.
  7. Admin clicks 'Activate Account'.
  8. System sets status = ACTIVE, sends a welcome email with temporary credentials.
  9. Event recorded.
- **Alternative Flows:**
  - ALT-1 — Deactivate Account (Staff or Patient): sets INACTIVE, invalidates all tokens.
  - ALT-2 — Edit Account Details (Staff only): name, role, department.
  - ALT-3 — Search and View Patient Account: filter "Patient", search by name/phone/patient code; read-only details only — clinical/EMR data editing remains governed by BR-08.
  - ALT-4 — Reactivate Patient Account: sets ACTIVE; optional notification email.
- **Exceptions:**
  - E1 — Email already registered: blocks creation.
  - E2 — Attempt to create a Patient account via Admin UI: "Patient accounts must be created via self-registration or walk-in check-in" — blocked.
- **Priority:** Must Have | **Frequency:** Occasional; during staff onboarding/offboarding
- **Business Rules:** BR-09
- **Assumptions:** Patient accounts are created only via UC-01 (self-registration) or UC-14 (walk-in registration); this UC governs only their status (active/inactive) and read access, not creation or clinical data editing.

#### UC-56: Configure System and Data
- **Primary Actor:** Admin
- **Trigger:** Admin navigates to System Configuration.
- **Description:** The Admin configures system-wide reference data: service catalogue and pricing, medicine catalogue, clinic information, and notification message templates. All changes take effect immediately and are logged.
- **Preconditions:** PRE-1: Admin authenticated.
- **Postconditions:** POST-1: Configuration changes saved and immediately reflected across the system. POST-2: Changes logged.
- **Normal Flow:**
  1. Admin navigates to System Configuration.
  2. Admin selects the data category: Services & Pricing / Medicines / Clinic Info / Notification Templates.
  3. Admin adds, edits, or deactivates records.
  4. System validates inputs (required fields, no duplicate names, valid price format).
  5. Admin clicks 'Save'.
  6. System applies changes and logs them.
- **Exceptions:** E1 — Delete a record with active references: prevented; 'This item is in use. Deactivate instead of deleting.' (BR-09)
- **Priority:** Must Have | **Frequency:** Occasional; during initial setup and catalogue maintenance
- **Business Rules:** BR-09
- **Assumptions:** Price changes do not retroactively affect existing PAID invoices.

#### UC-57: Manage System Audit Log
- **Primary Actor:** Admin
- **Trigger:** Admin navigates to Audit Log.
- **Description:** The Admin views the append-only audit log recording all significant system events: login/logout, EMR access, RBAC changes, prescription creation, payment transactions, and configuration changes. Read-only; cannot be modified or deleted.
- **Preconditions:** PRE-1: Admin authenticated.
- **Postconditions:** POST-1: Audit log entries displayed (no mutations allowed).
- **Normal Flow:**
  1. Admin navigates to Audit Log.
  2. System displays log entries in reverse-chronological order.
  3. Admin may filter by actor, event type, date range, affected entity ID.
  4. Admin clicks an entry for full details: actor ID, timestamp, IP address, before/after values.
  5. Admin may export the filtered log to CSV.
- **Priority:** Must Have | **Frequency:** On-demand; primarily for security review and compliance
- **Assumptions:** Audit log is implemented as an append-only table with no UPDATE/DELETE permissions for the application user.

---

## 3. Functional Requirements and Feature

### 3.1 Functional Requirement

| FR ID | Module | Description | Priority | Related BR |
|---|---|---|---|---|
| FR-01 | Authentication & Authorization | Register and log in using email and password. Password encrypted with bcrypt (cost ≥ 12). | Must | BR-01 |
| FR-02 | Authentication & Authorization | Log in via Google OAuth 2.0 for patients. | Should | — |
| FR-03 | Authentication & Authorization | RBAC has 7 roles: Admin, Manager, Doctor, Receptionist, Pharmacist, Patient, Lab Technician. | Must | — |
| FR-04 | Authentication & Authorization | Account locked after 5 consecutive failed login attempts within 30 minutes. | Must | BR-02 |
| FR-05 | Patient Management | CRUD patient record: full name, DOB, gender, address, phone number, CCCD. | Must | BR-09 |
| FR-06 | Patient Management | Search patients by name, phone number, or patient code. | Must | — |
| FR-07 | Appointment Management | Patients can book appointments online: choose doctor, date, available time slot. | Must | BR-03, BR-04 |
| FR-08 | Appointment Management | Reception staff confirm, modify, or cancel appointments; system auto-sends email/SMS notifications. | Must | BR-05 |
| FR-09 | Appointment Management | System auto-sends appointment reminders via email 24 hours in advance. | Should | — |
| FR-10 | EMR | Doctors create and update EMRs: symptoms, diagnosis, treatment plans. | Must | BR-08 |
| FR-11 | EMR | Ophthalmology EMR fields: VA, BCVA, current lens power, intraocular pressure, fundus condition. | Must | BR-08 |
| FR-12 | EMR | Electronic prescription and glasses systems, interconnected with the pharmacy warehouse. | Must | BR-06, BR-08 |
| FR-13 | Laboratory Examination | Doctor orders tests; technician enters results (refraction, OCT, fundus images). | Must | — |
| FR-14 | Laboratory Examination | Test results display directly in the EMR; doctor adds interpretive annotations. | Must | — |
| FR-15 | Prescription Dispensing | Dispense medications according to prescriptions. | Must | BR-09 |
| FR-16 | Payment Processing | Calculate the total bill: examination fee + test fee + medication/glasses fee. | Must | — |
| FR-17 | Payment Processing | Support cash payments and QR code transfers. | Must | — |
| FR-19 | Reporting | Generate daily/weekly/monthly/yearly sales reports, export to Excel. | Must | — |
| FR-20 | Reporting | Report on number of visits, new patients, and disease rates by type. | Should | — |
| FR-21 | Administration | Admin manages accounts, assigns roles, locks/unlocks accounts. | Must | — |
| FR-22 | Administration | Admin configures categories: service type, price list, medication type, clinic. | Must | — |

### 3.2 User Authentication (UI Wireframes)

> The following subsections are screen wireframes/screenshots in the source DOCX with no extractable text — refer to the original file for visuals:
> - 3.2.1 Landing Page
> - 3.2.2 Register Account
> - 3.2.3 Log In
> - 3.2.4 Reset Password
> - 3.2.5 Change Password
> - 3.2.6 User Profile

---

## 4. Non-Functional Requirements

### 4.1 External Interfaces

- **DE-1:** SMTP Service — Gmail SMTP or SendGrid, for verification emails, reminders, and invoices.
- **DE-2:** Google Identity Platform — supports Google OAuth 2.0 login for patients (FR-02, Should Have).
- **DE-3:** Cloud Infrastructure — AWS EC2 / Railway / VPS; HTTPS certificate via Let's Encrypt or ACM.
- **DE-4:** QR Code Payment — payment gateway supporting VietQR / domestic bank transfer.

### 4.2 Quality Attributes

| Quality Attribute | Requirement | Criteria (KPI) |
|---|---|---|
| Performance | API response time at P95 with 100 concurrent users | < 2 seconds (measured via JMeter or k6) |
| Performance | React First Contentful Paint on 4G | FCP < 3s; LCP < 4s; Lighthouse Score ≥ 80 |
| Performance | Minimum backend throughput | ≥ 100 RPS with the stated SLA |
| Performance | Lab/test result sync to EMR | < 5 seconds after the technician saves results |
| Security | Client-server transmission encryption | 100% HTTPS/TLS 1.2/1.3 endpoints; no plain-text HTTP |
| Security | JWT Access Token & Refresh Token | Access Token TTL = 60 minutes; Refresh Token TTL = 7 days |
| Security | Password encryption | bcrypt with salt, cost factor ≥ 12; never store plaintext |
| Security | Patient data & medical records | AES-256 encryption at rest; audit log for sensitive data access |
| Security | OWASP Top 10 | Passed OWASP ZAP scan; 0 High/Critical vulnerabilities |
| Availability | System uptime, working hours 7:00–20:00 | ≥ 99.5% / month |
| Availability | Backup & Recovery | Daily backup; RPO ≤ 24h; RTO ≤ 4h |
| Scalability | Concurrent users | ≥ 300 users with the stated performance SLA |
| Scalability | DB capacity | Query over 500,000 records in < 3 seconds with a suitable index |
| Usability | Responsive UI | No breakage in the 375px–1920px viewport |
| Usability | Appointment booking workflow | New users complete the process within < 3 minutes, unguided |
| Maintainability | Unit test coverage | ≥ 70% on the service layer (Backend) |
| Maintainability | API documentation | 100% of endpoints documented via Swagger/OpenAPI 3.0, including request/response schemas |
| Compliance | Personal data protection | Comply with Decree No. 13/2023/ND-CP; maintain a Privacy Policy; log access to sensitive data |

---

## 5. Appendix

### 5.1 Assumptions & Dependencies

- **AS-1:** The clinic has a stable internet connection to use the web-based system.
- **AS-2:** Patients have valid email addresses to receive notifications and electronic invoices.
- **AS-3:** Existing patient data will be manually entered or imported from Excel during deployment; no automatic migration in v0.
- **DE-1:** The system relies on SMTP (Gmail SMTP / SendGrid) for email sending. If SMTP is unavailable, appointment reminders and invoice sending are suspended.
- **DE-2:** Google OAuth 2.0 login depends on the Google Identity Platform (Should Have).
- **DE-3:** Cloud deployment (AWS EC2 / Railway) or VPS with HTTPS support.

### 5.2 Limitations & Exclusions

The following features are outside the scope of version 0:
- Does not integrate with the national health insurance system.
- Does not support telemedicine/remote consultations.
- Does not integrate automatic vision testing devices (electronic refractometers, automatic tonometers).
- Only supports a single clinic; does not yet support multi-branch clinic chains.
- Does not yet support private insurance payments.

### 5.3 Glossary

| Thuật ngữ | Viết tắt | Mô tả |
|---|---|---|
| Electronic Medical Record | EMR | A digital version of a patient's paper chart containing medical history, diagnoses, and treatment plans within a single healthcare practice. |
| Visual Acuity (without correction) | VA | The natural sharpness of a person's vision measured without corrective glasses or contact lenses. |
| Best Corrected Visual Acuity | BCVA | The sharpest possible vision achievable while wearing the optimal prescription glasses or contact lenses. |
| Intraocular Pressure | IOP | The pressure inside the eye, measured in millimeters of mercury (mmHg). |
| Optical Coherence Tomography | OCT | A non-invasive imaging technique that visualizes the eye's microvasculature in 3D without dye injections. |
| Role-Based Access Control | RBAC | User role-based access control. |
| First In First Out | FIFO | First-in, first-out principle for drug inventory. |
| JSON Web Token | JWT | Stateless authentication token; Access Token expires in 60 minutes, Refresh Token in 7 days. |
| Spherical / Cylindrical / Axis | SPH / CYL / AXIS | Diameter measurement parameters: spherical / cylindrical / axial. |

---

<div align="center">

**ECMS — Eyes Clinic Management System**
SWP391_2026_04 | FPT University | Hanoi, 2026

</div>

