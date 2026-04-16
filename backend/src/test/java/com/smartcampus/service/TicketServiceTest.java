package com.smartcampus.service;

import com.smartcampus.model.*;
import com.smartcampus.repository.CommentRepository;
import com.smartcampus.repository.FacilityRepository;
import com.smartcampus.repository.NotificationRepository;
import com.smartcampus.repository.TicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessageSendingOperations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TicketService — covers status transitions,
 * technician assignment, comment ownership, and notification logic.
 */
@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
public class TicketServiceTest {

    @Mock private TicketRepository ticketRepository;
    @Mock private FacilityRepository facilityRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private SimpMessageSendingOperations messagingTemplate;

    private TicketService ticketService;

    private User reporter;
    private User technician;
    private Ticket openTicket;

    @BeforeEach
    void setUp() {
        // Construct NotificationService manually to avoid Java 25 Mockito sealed-class errors
        NotificationService notificationService = new NotificationService(notificationRepository, messagingTemplate);
        ticketService = new TicketService(ticketRepository, facilityRepository, commentRepository, notificationService);

        reporter = new User();
        reporter.setId(1L);
        reporter.setName("Student A");

        technician = new User();
        technician.setId(2L);
        technician.setName("Tech B");
        technician.setRole(Role.TECHNICIAN);

        openTicket = Ticket.builder()
                .id(10L)
                .reporter(reporter)
                .category("Electrical")
                .description("Broken projector")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.HIGH)
                .build();
    }

    @Test
    @DisplayName("Should transition OPEN → IN_PROGRESS and notify reporter")
    void updateTicketStatus_OpenToInProgress_Success() {
        when(ticketRepository.findById(10L)).thenReturn(Optional.of(openTicket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        Ticket result = ticketService.updateTicketStatus(10L, TicketStatus.IN_PROGRESS, "Working on it");

        assertEquals(TicketStatus.IN_PROGRESS, result.getStatus());
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    @DisplayName("Should reject an OPEN ticket with reason")
    void updateTicketStatus_OpenToRejected_Success() {
        when(ticketRepository.findById(10L)).thenReturn(Optional.of(openTicket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        Ticket result = ticketService.updateTicketStatus(10L, TicketStatus.REJECTED, "Duplicate report");

        assertEquals(TicketStatus.REJECTED, result.getStatus());
        assertEquals("Duplicate report", result.getRejectionReason());
    }

    @Test
    @DisplayName("Should throw for invalid transition OPEN → CLOSED")
    void updateTicketStatus_InvalidTransition_ThrowsException() {
        when(ticketRepository.findById(10L)).thenReturn(Optional.of(openTicket));

        assertThrows(IllegalArgumentException.class,
                () -> ticketService.updateTicketStatus(10L, TicketStatus.CLOSED, null));
    }

    @Test
    @DisplayName("Should assign technician and set status to IN_PROGRESS")
    void assignTicket_Success() {
        when(ticketRepository.findById(10L)).thenReturn(Optional.of(openTicket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        Ticket result = ticketService.assignTicket(10L, technician);

        assertEquals(technician, result.getAssignedTo());
        assertEquals(TicketStatus.IN_PROGRESS, result.getStatus());
    }

    @Test
    @DisplayName("Should not allow non-owner to delete a comment")
    void deleteComment_NotOwner_ThrowsException() {
        User otherUser = new User();
        otherUser.setId(99L);

        Comment comment = Comment.builder()
                .id(5L).user(reporter).content("Test comment").build();

        when(commentRepository.findById(5L)).thenReturn(Optional.of(comment));

        assertThrows(IllegalArgumentException.class,
                () -> ticketService.deleteComment(5L, otherUser));
        verify(commentRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Should add comment by non-reporter and notify reporter")
    void addComment_NotifiesReporter() {
        when(ticketRepository.findById(10L)).thenReturn(Optional.of(openTicket));
        Comment saved = Comment.builder()
                .id(1L).ticket(openTicket).user(technician).content("Investigating").build();
        when(commentRepository.save(any(Comment.class))).thenReturn(saved);

        Comment result = ticketService.addComment(10L, technician, "Investigating");

        assertNotNull(result);
        assertEquals("Investigating", result.getContent());
        // technician != reporter → notification should be created
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }
}
