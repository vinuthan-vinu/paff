package com.smartcampus.service;

import com.smartcampus.dto.TicketDTO;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.*;
import com.smartcampus.repository.CommentRepository;
import com.smartcampus.repository.FacilityRepository;
import com.smartcampus.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final FacilityRepository facilityRepository;
    private final CommentRepository commentRepository;
    private final NotificationService notificationService;

    @Transactional
    public Ticket createTicket(User reporter, TicketDTO dto) {
        Facility facility = facilityRepository.findById(dto.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Facility", "id", dto.getFacilityId()));

        Ticket ticket = Ticket.builder()
                .reporter(reporter)
                .facility(facility)
                .category(dto.getCategory())
                .description(dto.getDescription())
                .priority(dto.getPriority() != null ? dto.getPriority() : TicketPriority.MEDIUM)
                .status(TicketStatus.OPEN)
                .build();

        return ticketRepository.save(ticket);
    }

    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }

    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", id));
    }

    public List<Ticket> getTicketsByReporter(Long userId) {
        return ticketRepository.findByReporterId(userId);
    }

    public List<Ticket> getTicketsByTechnician(Long technicianId) {
        return ticketRepository.findByAssignedToId(technicianId);
    }

    @Transactional
    public Ticket assignTicket(Long ticketId, User technician) {
        Ticket ticket = getTicketById(ticketId);
        ticket.setAssignedTo(technician);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        ticket = ticketRepository.save(ticket);

        // Notify the technician
        notificationService.createNotification(
                technician,
                "Ticket Assigned",
                "You have been assigned ticket #" + ticketId + ": " + ticket.getCategory(),
                NotificationType.TICKET_ASSIGNED
        );

        return ticket;
    }

    @Transactional
    public Ticket updateTicketStatus(Long ticketId, TicketStatus newStatus, String notes) {
        Ticket ticket = getTicketById(ticketId);
        validateStatusTransition(ticket.getStatus(), newStatus);

        ticket.setStatus(newStatus);
        if (notes != null) {
            if (newStatus == TicketStatus.RESOLVED) {
                ticket.setResolutionNotes(notes);
            } else if (newStatus == TicketStatus.REJECTED) {
                ticket.setRejectionReason(notes);
            }
        }
        ticket = ticketRepository.save(ticket);

        // Notify the reporter about the status change
        notificationService.createNotification(
                ticket.getReporter(),
                "Ticket Updated",
                "Ticket #" + ticketId + " status changed to " + newStatus,
                NotificationType.TICKET_UPDATE
        );

        return ticket;
    }

    @Transactional
    public Comment addComment(Long ticketId, User user, String content) {
        Ticket ticket = getTicketById(ticketId);

        Comment comment = Comment.builder()
                .ticket(ticket)
                .user(user)
                .content(content)
                .build();

        comment = commentRepository.save(comment);

        // Notify the reporter (if commenter is not the reporter)
        if (!user.getId().equals(ticket.getReporter().getId())) {
            notificationService.createNotification(
                    ticket.getReporter(),
                    "New Comment",
                    user.getName() + " commented on ticket #" + ticketId,
                    NotificationType.COMMENT_ADDED
            );
        }

        return comment;
    }

    public List<Comment> getCommentsByTicket(Long ticketId) {
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }

    @Transactional
    public void deleteComment(Long commentId, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));

        if (!comment.getUser().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("You can only delete your own comments");
        }

        commentRepository.delete(comment);
    }

    /**
     * Validates allowed ticket status transitions.
     */
    private void validateStatusTransition(TicketStatus current, TicketStatus next) {
        boolean valid = switch (current) {
            case OPEN -> next == TicketStatus.IN_PROGRESS || next == TicketStatus.REJECTED;
            case IN_PROGRESS -> next == TicketStatus.RESOLVED;
            case RESOLVED -> next == TicketStatus.CLOSED || next == TicketStatus.IN_PROGRESS;
            default -> false;
        };

        if (!valid) {
            throw new IllegalArgumentException(
                    "Invalid status transition: " + current + " → " + next);
        }
    }
}
