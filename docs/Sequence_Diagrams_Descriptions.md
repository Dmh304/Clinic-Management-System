# Sequence Diagrams Descriptions

## UC-24: View Doctor Dashboard
**Process:** The Doctor accesses the dashboard to view statistics and today's appointment queue via `AppointmentController`.
**Validation:** The system resolves the `doctorId` from the authenticated `UserDetails` (JWT token) to ensure doctors can only view their own queues.
**Action:** `AppointmentService` fetches today's appointments from `AppointmentRepository`. It calculates statistics by grouping appointments by `AppointmentStatus` (e.g., WAITING, IN_PROGRESS) and sorts the daily queue by scheduled time.
**Result:** The controller returns `200 OK` with an `ApiResponse` containing the `AppointmentDashboardResponse` (statistics) and `List<AppointmentResponse>` (queue).
**Continuation flow:** The Doctor can search for a specific patient by name (`searchAppointments`) or select a different date to reload the dashboard and queue for that specific day.

## UC-25a: Initiate EMR
**Process:** The Doctor selects a "Waiting" patient from the queue to start an examination, triggering `EMRController.getOrCreateByAppointmentId()`.
**Validation:** Ensures the patient is currently in the `WAITING` status.
**Action:** `EMRService` checks `MedicalRecordRepository`. Since it's the first time, it creates a new `MedicalRecord` with status `IN_PROGRESS`. It also updates the `Appointment` status in `AppointmentRepository` to `IN_PROGRESS`.
**Result:** The controller returns `200 OK` with an `ApiResponse<EMRResponse>`, loading the active EMR layout for the doctor.

## UC-25b: Update EMR Draft
**Process:** The Doctor fills out clinical data points. The system triggers auto-save or the Doctor manually clicks "Save Draft", sending data to `EMRController.saveEMR()`.
**Business Rule (BR-09):** The system updates the medical record details while strictly retaining its `DRAFT` or `IN_PROGRESS` status (no finalization occurs).
**Action:** `EMRService` retrieves the existing `MedicalRecord`, applies the updated fields, and saves it via `MedicalRecordRepository`.
**Result:** The controller returns `200 OK` with an `ApiResponse<EMRResponse>`.
**Continuation flow:** If the Doctor closes the tab and returns later, they can fetch the draft using `getById()` to resume editing seamlessly.

## UC-25c: Finalize EMR
**Process:** The Doctor finishes entering all necessary clinical information and submits the final record to `EMRController.saveEMR()`.
**Validation & Business Rule (BR-10):** The system verifies ICD-10 codes, mandatory observations, and checks that `request.status` is set to `COMPLETED`.
**Action:** `EMRService` updates the `MedicalRecord` status to `COMPLETED` (making it read-only) and updates the associated `Appointment` status to `COMPLETED` via the repositories.
**Result:** The controller returns `200 OK` with an `ApiResponse<EMRResponse>`.

## UC-25d: Cancel Clinical Session
**Process:** The Doctor decides to cancel the current in-progress examination session via the EMR interface, triggering `EMRController.cancelEMR()`.
**Business Rule (BR-09 Updated):** The draft `MedicalRecord` is fully cancelled. Both the `MedicalRecord` and the associated `Appointment` are updated to `CANCELLED` status. The patient is removed from the queue entirely and must create a new appointment to be seen again.
**Action:** `EMRService` fetches the `MedicalRecord` and updates its status to `CANCELLED`, then fetches the associated `Appointment` and also sets its status to `CANCELLED`.
**Result:** The controller returns `200 OK` with an `ApiResponse<EMRResponse>`.

## UC-26: View Patient Medical History
**Process (Doctor Flow):** The Doctor requests a patient's historical medical records via `EMRController.getPatientHistory()`.
**Action (Doctor Flow):** `EMRService` queries the `MedicalRecordRepository` for all past records associated with the `patientId` where the status is `COMPLETED`.
**Result (Doctor Flow):** The controller returns `200 OK` with an `ApiResponse<List<EMRResponse>>` containing the historical data.

**Process (Patient Flow):** The Patient navigates to their medical history to view their past visits. The system first fetches their appointments via `AppointmentController.getMyAppointments()`.
**Action (Patient Flow):** `AppointmentService` fetches all appointments for the patient from `AppointmentRepository`. The patient selects a specific appointment, triggering `EMRController.getByAppointment()`. `EMRService` then retrieves the `MedicalRecord` linked to that appointment.
**Result (Patient Flow):** The system displays the `EMRResponse` detailing the clinical notes for that specific visit.

## UC-28: Issue Eyeglass Prescription
**Process:** The Doctor enters visual acuity and lens parameters to issue a prescription, sending a request to `EyeglassPrescriptionController.issuePrescription()`.
**Validation:** Ensures the current `MedicalRecord` is valid and active (`IN_PROGRESS`).
**Action:** `EyeglassPrescriptionService` creates a new `EyeglassPrescription` entity linked to the `MedicalRecord` and saves it via `EyeglassPrescriptionRepository`.
**Result:** The controller returns `200 OK` (or `201 Created`) with an `ApiResponse<EyeglassPrescriptionResponse>`.

## UC-29: Issue Lab/Imaging Order
**Process:** The Doctor orders specific lab tests or imaging services for the patient via `LabOrderController.createOrder()`.
**Validation:** Validates the selected service codes and ensures they are mapped to the correct examination context.
**Action:** `LabOrderService` instantiates a new `LabOrder` with status `PENDING`, links it to the `MedicalRecord`, and saves it to the database.
**Result:** The controller returns `200 OK` with an `ApiResponse<LabOrderResponse>`.

## UC-30: View Lab Results
**Process:** The Doctor views the completed lab results for a patient via `LabResultController.getResultsByOrderId()`.
**Action:** `LabResultService` queries the `LabResultRepository` to fetch the findings associated with the specific `LabOrder`.
**Result:** The controller returns `200 OK` with an `ApiResponse<LabResultResponse>` displaying the test metrics and images.

## UC-33: View Lab Queue
**Process:** The Lab Technician accesses the dashboard to view the queue of pending tests via `LabOrderController.getLabQueue()`.
**Action:** `LabOrderService` queries `LabOrderRepository` to retrieve orders that have a status of `PENDING` or `IN_PROGRESS`, sorted by urgency or creation time.
**Result:** The controller returns `200 OK` with an `ApiResponse<List<LabOrderResponse>>` populating the technician's queue.

## UC-34: Record and Submit Lab Results
**Process:** The Lab Technician enters the test findings and submits them via `LabResultController.submitResult()`.
**Validation:** Ensures all mandatory test metrics for the specific service type are filled out correctly.
**Action:** `LabResultService` creates/updates the `LabResult` entity and changes the `LabOrder` status to `COMPLETED`.
**Result:** The controller returns `200 OK` with an `ApiResponse<LabResultResponse>`.
**Continuation flow:** Once submitted, the lab result becomes available for the Doctor to review (UC-35).

## UC-35: Review Submitted Lab Results
**Process:** The Doctor reviews the technician's submitted lab results via `LabOrderController.reviewOrder()`.
**Action (Approve):** If the results are satisfactory, `LabOrderService` updates the `LabOrder` status to `APPROVED`.
**Action (Retest):** If the results are anomalous or unclear, the status is reverted to `PENDING` or set to `RETEST`, invalidating the current result.
**Result:** The controller returns `200 OK` with an `ApiResponse<LabOrderResponse>`.

## UC-38: Fabricate Eyeglasses
**Process:** The Optician views the fabrication queue to see all pending orders via `EyeglassOrderController.getFabricationQueue()`. This returns orders with status `PENDING_LAB` or `IN_PRODUCTION`.
**Action (Start):** The Optician selects a `PENDING_LAB` order and clicks start. The system calls `EyeglassOrderController.startFabrication(orderId)`. `EyeglassOrderService` updates the status to `IN_PRODUCTION`.
**Action (Complete):** Once the glasses are ready, the Optician calls `EyeglassOrderController.completeFabrication(orderId)`. `EyeglassOrderService` updates the status from `IN_PRODUCTION` to `READY`.
**Result:** The updated `EyeglassOrder` is saved via `EyeglassOrderRepository`, and the controller returns `200 OK`. The order is now ready for the patient to pick up.

## UC-45: View Diagnostic Results
**Process:** The Patient navigates to the 'My Test Results' section to view their historical lab and imaging records. The system first retrieves a summary list of all diagnostic orders via `LabOrderController.getPatientLabOrders()`.
**Action (List):** `LabOrderService` fetches all `LabOrder` records associated with the patient from the `LabOrderRepository`.
**Process (Detail):** The Patient clicks on a specific diagnostic order (analogous to clicking an appointment). The system requests the detailed results via `LabOrderController.getLabResults()`.
**Action (Detail):** `LabOrderService` validates the patient's role and fetches the corresponding `LabResult` (which contains findings, doctor's conclusions, and image links) from the `LabResultRepository`.
**Result:** The controller returns `200 OK` with an `ApiResponse<LabResultResponse>` allowing the UI to render the comprehensive diagnostic findings and images.

## UC-54: Manage Lab Test Catalogue
**Process:** The Clinic Manager accesses the Lab/Imaging Test Catalogue to maintain the list of available diagnostic services (e.g., OCT scan, refraction test). The system loads the existing catalogue via `ClinicServiceController.getAllServices(type="CLINICAL")`.
**Validation:** When the Manager adds or edits a test type via `ClinicServiceController.createLabTest()`, the `ClinicServiceService` validates that the price is greater than 0 and the test name does not already exist. If validation fails, a `400 Bad Request` is returned.
**Business Rule (BR-09):** The system enforces soft deletion. If a Manager deactivates a test type via `ClinicServiceController.toggleActive()`, the `isActive` flag is toggled. The test is hidden from new selections but existing pending orders are unaffected.
**Action:** `ClinicServiceService` saves the new or updated `ClinicService` entity to the `ClinicServiceRepository` with the `serviceType` set to `"CLINICAL"`. It also logs the action in the `AuditLog`.
**Result:** The controller returns `201 Created` or `200 OK` with the `ApiResponse<ClinicServiceResponse>`, and the updated catalogue becomes immediately available for doctors to use when issuing lab orders (UC-53).

## UC-55: Manage Room Catalogue & Service Mapping
**Process:** The Clinic Manager accesses the Room Management screen to view the catalogue of physical rooms and their mapped services via `RoomController.getAllRooms()`.
**Action:** The Manager can create a new room or update an existing one via `RoomController.createRoom()` or `updateRoom()`. Each room is associated with a specific category (`CLINICAL_EXAM`, `SURGERY`, etc.) and optionally mapped to a `ClinicService`. The capacity defaults to 1.
**Business Rule (BR-09):** The system enforces soft deletion for rooms. If a Manager wishes to remove a room, they must deactivate it via `RoomController.deactivateRoom()`, which updates its status to `INACTIVE` rather than hard deleting it.
**Result:** The updated room catalogue is persisted via `RoomRepository` and immediately becomes available for room resolution in booking and routing flows (UC-11, UC-19, UC-30).

## UC-56: Manage Staff Room Roster
**Process:** The Clinic Manager opens the Room Roster for a specific day. The system fetches the roster list via `StaffRoomAssignmentController.getRoster()`, which queries `StaffRoomAssignmentRepository` for assignments effective on or before that date, or specific overrides for that date.
**Action:** The Manager assigns a Doctor, Nurse, or Lab Technician to a room via `StaffRoomAssignmentController.assignRoom()`. The Manager can specify if this is a standing assignment (effective from a date onwards) or a one-day override (valid only for a specific `workDate`).
**Business Rule (BR-24):** The system relies on this roster to resolve which room a staff member is operating in on a given day. Other use cases (e.g., patient check-in, lab orders) call `StaffRoomAssignmentController.resolveRoom()` which prioritizes one-day overrides before falling back to the most recent standing assignment.
**Result:** The assignment is saved to `StaffRoomAssignmentRepository`. The resolved room will be used by the system to direct patients appropriately for their appointments and tests.
