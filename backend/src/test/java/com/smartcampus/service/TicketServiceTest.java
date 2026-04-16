package com.smartcampus.service;

import com.smartcampus.model.Role;
import com.smartcampus.model.Ticket;
import com.smartcampus.model.TicketStatus;
import com.smartcampus.model.User;
import com.smartcampus.repository.TicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private TicketService ticketService;

    private Ticket ticket;
    private User admin;

    @BeforeEach
    void setUp() {
        User reporter = new User();
        reporter.setId(1L);

        admin = new User();
        admin.setId(2L);
        admin.setRole(Role.ADMIN);

        ticket = new Ticket();
        ticket.setId(10L);
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setReporter(reporter);
    }

    @Test
    void updateTicketStatus_ToInProgress_Success() {
        when(ticketRepository.findById(10L)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class))).thenReturn(ticket);

        Ticket result = ticketService.updateTicketStatus(10L, TicketStatus.IN_PROGRESS, "Looking into it");

        assertEquals(TicketStatus.IN_PROGRESS, result.getStatus());
        assertEquals("Looking into it", result.getResolutionNotes());
        verify(notificationService, times(1)).notifyUser(any(), any(), any(), any());
    }
}
