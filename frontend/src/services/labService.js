/**
 * Tuấn - HE204215
 * 
 * Chứa các API call liên quan đến quản lý LabOrder
*/
import axiosClient from '../api/axiosClient'

export const labService = {

    createLabOrder: (data) =>
        axiosClient.post(`/v1/lab`, data),

    getLabOrderQueue: () =>
        axiosClient.get(`/v1/lab/queue`),

    submitResult: (id, data) =>
        axiosClient.put(`/v1/lab/${id}/result`, data),

    getLabOrdersForMedicalRecord: (medicalRecordId) =>
        axiosClient.get(`/v1/lab/emr/${medicalRecordId}`),

    getLabResults: (id) =>
        axiosClient.get(`/v1/lab/${id}/results`),

    approveLabResult: (id) =>
        axiosClient.put(`/v1/lab/${id}/approve`),

    requestRetest: (id, data) =>
        axiosClient.put(`/v1/lab/${id}/retest`, data),

    startLabOrder: (id) =>
        axiosClient.put(`/v1/lab/${id}/start`),

    getActiveLabTechnicians: () =>
        axiosClient.get(`/v1/lab/technicians`),

    getLabOrdersForDoctor: () =>
        axiosClient.get(`/v1/lab/doctor`),

    saveDraft: (id, data) =>
        axiosClient.put(`/v1/lab/${id}/draft`, data),

}