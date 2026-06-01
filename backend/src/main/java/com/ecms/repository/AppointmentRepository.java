package com.ecms.repository;

import com.ecms.entity.Appointment;
import com.ecms.entity.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByAppointmentDateOrderByTimeSlotAsc(LocalDate date);

    List<Appointment> findByAppointmentDateAndStatusOrderByTimeSlotAsc(LocalDate date, AppointmentStatus status);
}
