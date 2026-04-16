package com.smartcampus.repository;

import com.smartcampus.model.Ticket;
import com.smartcampus.model.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByReporterId(Long reporterId);

    List<Ticket> findByAssignedToId(Long technicianId);

    List<Ticket> findByStatus(TicketStatus status);

    List<Ticket> findByFacilityId(Long facilityId);
}
