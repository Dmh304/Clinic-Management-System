# Sequence Diagrams Descriptions

## UC-26: View Doctor Dashboard

**Process:** The Doctor accesses the dashboard to view statistics and today's appointment queue via `AppointmentController.getDashboard(date, userDetails)` and `AppointmentController.getDoctorQueue(date, userDetails)`.
**Validation:** The system resolves the `doctorId` from the authenticated `UserDetails` (JWT token) to ensure doctors can only view their own queues. Statistics are calculated using `countByDateAndDoctorId` and `countByDateAndStatusAndDoctorId`.
**Action:** `AppointmentService` fetches today's appointments from `AppointmentRepository` via `findByAppointmentDateAndDoctorIdOrderByAppointmentTimeAsc`. It counts appointments per status (PENDING, CONFIRMED, WAITING, IN_PROGRESS, COMPLETED, CANCELLED).
**Result:** The controller returns `200 OK` with an `ApiResponse` containing the `AppointmentDashboardResponse`.
**Optional:** Doctor can search patients via `AppointmentController.searchAppointments(keyword)` â€” no doctorId param, searches globally by keyword.

## UC-27a: Initiate EMR
**Process:** The Doctor selects a "Waiting" patient from the queue to start an examination, triggering `EMRController.getOrCreateByAppointmentId()`.
**Validation:** Ensures the patient is currently in the `WAITING` status.
**Action:** `EMRService` checks `MedicalRecordRepository`. Since it's the first time, it creates a new `MedicalRecord` with status `IN_PROGRESS`. It also updates the `Appointment` status in `AppointmentRepository` to `IN_PROGRESS`.
**Result:** The controller returns `200 OK` with an `ApiResponse<EMRResponse>`, loading the active EMR layout for the doctor.

## UC-27b: Update EMR Draft
**Process:** The Doctor fills out clinical data points. The system triggers auto-save or the Doctor manually clicks "Save Draft", sending data to `EMRController.saveEMR()`.
**Business Rule (BR-09):** The system updates the medical record details while strictly retaining its `DRAFT` or `IN_PROGRESS` status (no finalization occurs).
**Action:** `EMRService` retrieves the existing `MedicalRecord`, applies the updated fields, and saves it via `MedicalRecordRepository`.
**Result:** The controller returns `200 OK` with an `ApiResponse<EMRResponse>`.
**Continuation flow:** If the Doctor closes the tab and returns later, they can fetch the draft using `getById()` to resume editing seamlessly.

## UC-27c: Finalize EMR
**Process:** The Doctor finishes entering all necessary clinical information and submits the final record to `EMRController.saveEMR()`.
**Validation & Business Rule (BR-10):** The system verifies ICD-10 codes, mandatory observations, and checks that `request.status` is set to `COMPLETED`.
**Action:** `EMRService` updates the `MedicalRecord` status to `COMPLETED` (making it read-only) and updates the associated `Appointment` status to `COMPLETED` via the repositories.
**Result:** The controller returns `200 OK` with an `ApiResponse<EMRResponse>`.

## UC-27d: Cancel Clinical Session

**Process:** The Doctor decides to cancel the current in-progress examination session via the EMR interface, triggering `AppointmentController.abandonExam(appointmentId)` â€” this method does NOT receive `userDetails`.
**Logic:** `AppointmentService.abandonExam()` verifies the `Appointment.status == IN_PROGRESS`, then sets it to `CANCELLED` with a reason. It then calls `MedicalRecordRepository.findByAppointmentId()` and if a MedicalRecord exists and is not yet COMPLETED, reverts it back to `DRAFT` status (not CANCELLED â€” consistent with BR-09 soft-delete principle).
**Result:** The controller returns `200 OK` with an `ApiResponse<AppointmentResponse>`.

## UC-28: View Patient Medical History
**Process (Doctor Flow):** The Doctor requests a patient's historical medical records via `EMRController.getPatientHistory()`.
**Action (Doctor Flow):** `EMRService` queries the `MedicalRecordRepository` for all past records associated with the `patientId` where the status is `COMPLETED`.
**Result (Doctor Flow):** The controller returns `200 OK` with an `ApiResponse<List<EMRResponse>>` containing the historical data.

**Process (Patient Flow):** The Patient navigates to their medical history to view their past visits. The system first fetches their records via `EMRController.getPatientHistoryEMR()`.
**Action (Patient Flow):** `EMRService` fetches all medical records for the patient from `MedicalRecordRepository`. The patient selects a specific entry, triggering `EMRController.getByAppointment()`. `EMRService` then retrieves the `MedicalRecord` linked to that appointment.
**Result (Patient Flow):** The system displays the `EMRResponse` detailing the clinical notes for that specific visit.

## UC-31: Issue Lab/Imaging Order
**Process:** The Doctor orders specific lab tests or imaging services for the patient via `LabOrderController.createLabOrder()`.
**Validation:** Validates the selected service codes and ensures they are mapped to the correct examination context (BR-11, BR-12, BR-13, BR-16). Checks for existing active orders via `existsByMedicalRecordIdAndStatusIn` to prevent duplicates.
**Action:** `LabOrderService` instantiates a new `LabOrder` with status `PENDING`, links it to the `MedicalRecord`, and saves it to the database.
**Result:** The controller returns `200 OK` with an `ApiResponse<LabOrderResponse>`.

## UC-32: View Lab Results
**Process:** The Doctor views the completed lab results for a patient via `LabOrderController.getLabOrdersForMedicalRecord()`.
**Action:** `LabOrderService` queries the `LabOrderRepository` to fetch the findings associated with the specific `MedicalRecord`.
**Result:** The controller returns `200 OK` with an `ApiResponse<List<LabOrderResponse>>` displaying the test metrics and images.
**Process (Patient Flow):** Patient views PDF results via `LabOrderController.getLabResultsAsPdf()`.

## UC-35: View Lab Queue

**Process:** The Lab Technician accesses the dashboard to view the queue of pending tests via `LabOrderController.getLabOrderQueue(userDetails)`.
**Action:** `LabOrderService.getLabQueue(labTechnicianId)` queries `LabOrderRepository.findByLabTechnicianIdOrderByPriorityAndCreatedAt(labTechnicianId)`. This returns orders **assigned to this specific technician**, sorted first by urgency (EMERGENCY > WARNING > PRIMARY), then by `createdAt ASC` within the same priority.
**Result:** The controller returns `200 OK` with an `ApiResponse<List<LabOrderResponse>>` populating the technician's queue.

## UC-36: Process Lab Result

**Process (Start - UC-36a):** The Lab Technician selects an order via `LabOrderController.startLabOrder()`. `LabOrderService.startLabOrder()` validates status is `PENDING`, assigns the technician (`labTechnicianRepository.getReferenceById`), saves the `LabOrder` with status `IN_PROGRESS`. **No LabResult is created at this step.**
**Process (Draft - UC-36b):** The Lab Technician enters partial test findings and saves via `LabOrderController.saveDraft()`. Service validates `IN_PROGRESS` status, then calls `labResultRepository.findTopByLabOrderIdOrderByIdDesc()` â€” creates a new `LabResult` if not found, otherwise updates existing. Fields updated: `vaL`, `vaR`, `sphL/R`, `cylL/R`, `axisL/R`, `iopL/R`, `imageUrls`. **LabOrder status stays IN_PROGRESS.**
**Process (Submit - UC-36c):** The Lab Technician finalizes findings via `LabOrderController.submitResult()`. Same logic as saveDraft but additionally sets `labOrder.status = SUBMITTED` and `labOrder.completedAt = now()`. A notification is sent to the doctor.
**Result:** The controller returns `200 OK` with an `ApiResponse<LabOrderResponse>`.
**Continuation flow:** Once SUBMITTED, the lab result is available for the Doctor to review (UC-37).

## UC-37: Review Submitted Lab Results

**Process:** The Doctor reviews the technician's submitted lab results.
**View:** `LabOrderController.getLabResults(labOrderId, userDetails)` â†’ checks role (Doctor can see SUBMITTED/IN_PROGRESS/APPROVED, Patient only sees APPROVED) â†’ `labResultRepository.findTopByLabOrderIdOrderByIdDesc(labOrderId)`.
**Action (Approve):** `LabOrderController.approveLabResult(labOrderId, userDetails)` â†’ `LabOrderService.approveLabResult(labOrderId, doctorId)`. Validates `labOrder.status == SUBMITTED`. Sets `labResult.reviewedAt = now()`, saves LabResult. Then auto-fills `MedicalRecord` measurement fields (vaL, vaR, bcvaL, bcvaR, sphL/R, cylL/R, axisL/R, iopL/R, labImageUrl) from LabResult. Finally sets `labOrder.status = APPROVED`.
**Action (Retest):** `LabOrderController.requestRetest(labOrderId, request, userDetails)` â†’ validates `status == SUBMITTED` â†’ sets `previousOrder.status = REJECTED`, saves rejection reason and timestamp â†’ **creates a brand-new LabOrder** (PENDING) inheriting medicalRecord, doctor, clinicService from the rejected one.
**Result:** The controller returns `200 OK` with an `ApiResponse<LabOrderResponse>`.

## UC-38: Fabricate Eyeglasses
**Process:** The Optician views the fabrication queue to see all pending orders via `EyeglassOrderController.getFabricationQueue()`. This returns orders with status `PENDING_LAB` or `IN_PRODUCTION`.
**Action (Start):** The Optician selects a `PENDING_LAB` order and clicks start. The system calls `EyeglassOrderController.startFabrication(orderId)`. `EyeglassOrderService` updates the status to `IN_PRODUCTION`.
**Action (Complete):** Once the glasses are ready, the Optician calls `EyeglassOrderController.completeFabrication(orderId)`. `EyeglassOrderService` updates the status from `IN_PRODUCTION` to `READY`.
**Result:** The updated `EyeglassOrder` is saved via `EyeglassOrderRepository`, and the controller returns `200 OK`. The order is now ready for the patient to pick up.

## UC-46: View Diagnostic Results
**Process:** The Patient navigates to the 'My Test Results' section to view their historical lab and imaging records. The system first retrieves a summary list of all diagnostic orders via `LabOrderController.getLabOrdersForPatient()`.
**Action (List):** `LabOrderService` fetches all `LabOrder` records associated with the patient from `LabOrderRepository` via `findByMedicalRecord_PatientIdOrderByCreatedAtDesc`.
**Process (Detail):** The Patient clicks on a specific diagnostic order. The system requests the detailed results via `LabOrderController.getLabResults()`.
**Action (Detail):** `LabOrderService` validates the patient's role and fetches the corresponding `LabResult` (which contains findings, doctor's conclusions, and image links) from `LabResultRepository`.
**Result:** The controller returns `200 OK` with an `ApiResponse<LabResultResponse>` allowing the UI to render the comprehensive diagnostic findings and images.

## UC-54: Manage Lab Test Catalogue
**Process:** The Clinic Manager accesses the Lab/Imaging Test Catalogue to maintain the list of available diagnostic services (e.g., OCT scan, refraction test). The system loads the existing catalogue via `ClinicServiceController.getAllServices(type="CLINICAL")`.
**Validation:** When the Manager adds or edits a test type via `ClinicServiceController.createLabTest()`, the `ClinicServiceService` validates that the price is greater than 0 and the test name does not already exist. If validation fails, a `400 Bad Request` is returned.
**Business Rule (BR-09):** The system enforces soft deletion. If a Manager deactivates a test type via `ClinicServiceController.toggleActive()`, the `isActive` flag is toggled. The test is hidden from new selections but existing pending orders are unaffected.
**Action:** `ClinicServiceService` saves the new or updated `ClinicService` entity to the `ClinicServiceRepository` with the `serviceType` set to `"CLINICAL"`. It also logs the action in the `AuditLog`.
**Result:** The controller returns `201 Created` or `200 OK` with the `ApiResponse<ClinicServiceResponse>`, and the updated catalogue becomes immediately available for doctors to use when issuing lab orders (UC-31).

## UC-55: Manage Room Catalogue & Service Mapping
**Process:** The Clinic Manager accesses the Room Management screen to view the catalogue of physical rooms and their mapped services via `RoomController.getAllRooms()`.
**Action:** The Manager can create a new room or update an existing one via `RoomController.createRoom()` or `updateRoom()`. Each room is associated with a specific category (`CLINICAL_EXAM`, `SURGERY`, etc.) and optionally mapped to a `ClinicService`. The capacity defaults to 1.
**Business Rule (BR-09):** The system enforces soft deletion for rooms. If a Manager wishes to remove a room, they must deactivate it via `RoomController.deactivateRoom()`, which updates its status to `INACTIVE` rather than hard deleting it.
**Result:** The updated room catalogue is persisted via `RoomRepository` and immediately becomes available for room resolution in booking and routing flows (UC-11, UC-19, UC-31).

## UC-56: Manage Staff Room Roster
**Process:** The Clinic Manager opens the Room Roster for a specific day. The system fetches the roster list via `StaffRoomAssignmentController.getRoster()`, which queries `StaffRoomAssignmentRepository` for assignments effective on or before that date, or specific overrides for that date.
**Action:** The Manager assigns a Doctor, Nurse, or Lab Technician to a room via `StaffRoomAssignmentController.assignRoom()`. The Manager can specify if this is a standing assignment (effective from a date onwards) or a one-day override (valid only for a specific `workDate`).
**Business Rule (BR-24):** The system relies on this roster to resolve which room a staff member is operating in on a given day. Other use cases (e.g., patient check-in, lab orders) call `StaffRoomAssignmentController.resolveRoom()` which prioritizes one-day overrides before falling back to the most recent standing assignment.
**Result:** The assignment is saved to `StaffRoomAssignmentRepository`. The resolved room will be used by the system to direct patients appropriately for their appointments and tests.
