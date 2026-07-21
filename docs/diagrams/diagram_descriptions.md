# Diagram Descriptions

This document contains descriptions for all sequence diagrams based on the requested template structure.

### 1. UC-24: View Doctor Dashboard
**Process:** The Doctor navigates to the dashboard which triggers a GET request to `DashboardController`. The request is forwarded to `DashboardService.getDoctorDashboardData()`.
**Validation:** The system verifies the JWT token to ensure the actor has the `DOCTOR` role.
**Business Rule (BR-08):** Ensures the doctor only sees their own assigned appointments.
**Action:** The service fetches the doctor's active appointments for the day from `AppointmentRepository`, groups them by status (WAITING, IN_PROGRESS), and constructs summary DTOs.
**Integration (async):** N/A (Frontend may use a polling timer for real-time queue updates).
**Result:** The controller returns `200 OK` with the dashboard data containing patient queues.
**Continuation flow:** The Doctor selects a "WAITING" patient from the queue to start a clinical session, transitioning to UC-25a.

---

### 2. UC-25a: Initiate Electronic Medical Record (EMR)
**Process:** The Doctor selects a "Waiting" patient from the queue, triggering a POST request to `EMRController.initiateEMR()`, which forwards to `EMRService.initiateEMR()`.
**Validation:** The system validates that the appointment exists and is in "WAITING" status.
**Business Rule (BR-08):** Ensures only the assigned treating physician can initiate the record.
**Action:** `EMRService` creates a new `MedicalRecord` with status `IN_PROGRESS` via `MedicalRecordRepository`, and updates the `Appointment` status to `IN_PROGRESS`.
**Integration (async):** N/A
**Result:** The controller returns `200 OK` with the newly generated EMR form data. The Doctor's UI loads the active examination template.
**Continuation flow:** The Doctor begins entering clinical data, leading to UC-25b (Update EMR).

---

### 3. UC-25b: Update Electronic Medical Record (EMR)
**Process:** The Doctor manually triggers a save or the UI auto-saves clinical data (symptoms, notes) via a PUT request to `EMRController.updateEMRDraft()`, forwarding to `EMRService`.
**Validation:** `EMRService` verifies the `MedicalRecord` exists and the `Appointment` status is still `IN_PROGRESS`.
**Business Rule (BR-08):** The draft is strictly isolated and accessible only to the treating physician.
**Action:** `EMRService` updates the existing `MedicalRecord` entity with the new clinical findings and saves it via `MedicalRecordRepository`. The status remains `DRAFT` or `IN_PROGRESS`.
**Integration (async):** N/A
**Result:** The controller returns `200 OK` confirming the draft is saved.
**Continuation flow:** If the connection drops, the UI automatically fetches the latest draft on reconnect. Otherwise, the doctor continues drafting until finalization (UC-25c).

---

### 4. UC-25c: Finalize and Lock Electronic Medical Record (EMR)
**Process:** The Doctor completes the examination and submits a POST request to `EMRController.finalizeEMR()`, which calls `EMRService.finalizeEMR()`.
**Validation:** `EMRService` validates that all mandatory clinical data is provided. If missing, it throws a `ValidationException` and returns a `400 Bad Request`.
**Business Rule (BR-08 & BR-13):** Once finalized, the `MedicalRecord` becomes Read-Only, and the `Appointment` status is locked to `COMPLETED`.
**Action:** `EMRService` updates the `MedicalRecord` status to `COMPLETED` and the `Appointment` status to `COMPLETED`, saving both via their repositories.
**Integration (async):** N/A
**Result:** The controller returns `200 OK`. The UI reflects the locked state.
**Continuation flow:** The Doctor may issue prescriptions (UC-28) or lab orders (UC-29) based on the finalized diagnosis.

---

### 5. UC-25d: Cancel Clinical Session
**Process:** The Doctor decides to cancel the active session and sends a POST request to `EMRController.cancelSession()`, passing the appointment ID.
**Validation:** `EMRService` checks that the `MedicalRecord` is currently `IN_PROGRESS` or `DRAFT`.
**Business Rule (BR-09):** No Hard Delete. The system retains the DRAFT record instead of deleting it from the database.
**Action:** `EMRService` reverts the `Appointment` status back to `WAITING` so the patient returns to the queue. The draft record is retained for audit logs.
**Integration (async):** N/A
**Result:** The controller returns `200 OK`.
**Continuation flow:** The patient is back in the queue and can be picked up later or assigned to another doctor.

---

### 6. UC-26: View Patient Medical History
**Process:** The Doctor or Patient accesses the medical history screen, sending a GET request to `EMRController`, which forwards to `EMRService.getPatientHistory()`.
**Validation:** Controller validates the JWT. For Doctors, it checks if they are the treating physician. For Patients, it ensures they are viewing their own ID.
**Business Rule (BR-08):** Enforces strict EMR confidentiality. Access is denied (HTTP 403) and logged if unauthorized.
**Action:** `EMRService` fetches all `MedicalRecords` for the patient from `MedicalRecordRepository`, sorted descending by date, and maps them to summary DTOs.
**Integration (async):** The Controller synchronously triggers `AuditLog` to log the access event ("VIEW_EMR_DETAIL") to comply with traceability rules.
**Result:** The controller returns `200 OK` with the summarized historical EMR data.
**Continuation flow:** The actor can click a specific summary card to fetch the full EMR details via another GET request.

---

### 7. UC-28: Issue Eyeglass Prescription
**Process:** The Doctor enters eyeglass parameters (SPH, CYL, AXIS) and submits a POST request to `EyeglassPrescriptionController`, which calls `EyeglassPrescriptionService.createPrescription()`.
**Validation:** The service validates that the referenced `MedicalRecord` exists and verifies that no duplicate prescription already exists for this record.
**Business Rule (BR-08):** Only the assigned doctor can issue a prescription for this EMR.
**Action:** The service creates a new `EyeglassPrescription` entity linked to the `MedicalRecord` and saves it via `EyeglassPrescriptionRepository`.
**Integration (async):** N/A
**Result:** The controller returns `201 Created` with the prescription details.
**Continuation flow:** The patient can view the prescription in their portal, or it can be sent to the lab for glasses fabrication (UC-36).

---

### 8. UC-29: Issue Lab/Imaging Order
**Process:** The Doctor selects required tests (e.g., OCT, Refraction) and submits a POST request to `LabController`, forwarding to `LabService.createLabOrder()`.
**Validation:** The service validates that the referenced `Appointment`, `Patient`, and `Doctor` entities exist and are active.
**Business Rule (BR-08):** Lab orders must be securely linked to the active clinical session.
**Action:** The service creates a new `LabOrder` entity with status `PENDING`, linking the selected test services, and saves it via `LabOrderRepository`.
**Integration (async):** N/A
**Result:** The controller returns `201 Created`.
**Continuation flow:** The newly created order immediately appears in the Lab Technician's queue (UC-33).

---

### 9. UC-30: View Lab Results
**Process:** The Doctor or Patient navigates to the Lab Results view, sending a GET request to `LabController`, passing the medicalRecordId.
**Validation:** The controller checks BR-08 access rights (Doctor must be treating physician; Patient must own the record). Violations log an audit event and return HTTP 403.
**Business Rule (BR-08):** Role-based data presentation. Doctors see full clinical values, while Patients see a simplified summary with doctor interpretations.
**Action:** `LabService` fetches `LabOrders` and their associated `LabResults` from repositories. It maps the entities to `LabResultResponse` DTOs dynamically based on the actor's role.
**Integration (async):** The controller triggers `AuditLog` to record the "VIEW_LAB_RESULT" event.
**Result:** The controller returns `200 OK` with the appropriate result data.
**Continuation flow:** The patient can optionally click "Download as PDF" to generate a printable report.

---

### 10. UC-33: View Lab Queue
**Process:** The Lab Technician opens the queue screen, sending a GET request to `LabController`, which calls `LabService.getPendingLabOrders()`.
**Validation:** The system verifies the user has the `LAB_TECHNICIAN` role.
**Business Rule:** Queue items are strictly ordered by creation time (oldest first) to ensure fairness, unless prioritized.
**Action:** `LabService` fetches all `LabOrders` with status `PENDING` from `LabOrderRepository` and maps them to summary response DTOs.
**Integration (async):** The frontend uses polling (or WebSocket) to periodically re-fetch the queue for real-time updates.
**Result:** The controller returns `200 OK` containing the pending orders.
**Continuation flow:** The technician selects a specific order from the list, fetching its full details, and proceeds to execute the tests (UC-34).

---

### 11. UC-34: Record And Submit Lab Results
**Process:** The Lab Technician submits the completed test measurements via a POST request to `LabController`, which forwards to `LabService.submitLabResult()`.
**Validation:** The service checks if the `LabOrder` exists and is currently `IN_PROGRESS`.
**Business Rule:** Only authorized technicians can submit results, and they must provide all mandatory measurements for the ordered tests.
**Action:** `LabService` creates a new `LabResult` entity, links any uploaded images, sets its status to `COMPLETED`, and updates the parent `LabOrder` status to `COMPLETED`.
**Integration (async):** The service triggers `NotificationService` to push a real-time WebSocket alert ("Lab results ready") to the ordering Doctor.
**Result:** The controller returns `201 Created`.
**Continuation flow:** The Doctor receives the notification and clicks it to review the submitted results (UC-35).

---

### 12. UC-35: Review Submitted Lab Results
**Process:** The Doctor clicks the notification and reviews the results, then submits a PUT request to `LabController` to save clinical annotations (and optionally update the diagnosis).
**Validation:** The service checks if the `LabResult` exists and is in `COMPLETED` status.
**Business Rule (BR-08):** The Doctor must be the ordering physician to add clinical interpretations.
**Action:** `LabService` updates the `LabResult` with the doctor's notes and changes its status to `REVIEWED`. If a diagnosis update is provided, it updates the parent `MedicalRecord`.
**Integration (async):** `AuditLog` records the "REVIEW_LAB_RESULT" action.
**Result:** The controller returns `200 OK`.
**Continuation flow:** The reviewed status allows the patient to see the doctor's interpretation in their portal (UC-30).

---

### 13. UC-36: Fabricate Eyeglasses
**Process:** The Lab Technician processes a glasses order by submitting state transition requests (PUT `/start`, PUT `/ready`) to `GlassesOrderController`.
**Validation:** The service validates the current state of the order (e.g., cannot start if `CANCELLED`).
**Business Rule (BR-09):** If a rework is needed due to a defect, the system doesn't delete the order; it flags it and resets the status to `PENDING` for re-processing.
**Action:** `GlassesOrderService` updates the status from `PENDING` -> `IN_PRODUCTION` -> `READY`, recording the technician ID and timestamps at each step.
**Integration (async):** Upon marking the order as `READY`, the service triggers `NotificationService` to alert the Receptionist and Patient for pickup.
**Result:** The controller returns `200 OK` after each successful state transition.
**Continuation flow:** The patient arrives at the clinic to pick up their fabricated glasses.
