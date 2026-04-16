package com.smartcampus.service;

import com.smartcampus.dto.TicketDTO;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.*;
import com.smartcampus.repository.CommentRepository;
import com.smartcampus.repository.FacilityRepository;
import com.smartcampus.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final FacilityRepository facilityRepository;
    private final CommentRepository commentRepository;
    private final NotificationService notificationService;
    private final AdminUpdateService adminUpdateService;

    @Transactional
    public Ticket createTicket(User reporter, TicketDTO dto) {
        Facility facility = facilityRepository.findById(dto.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Facility", "id", dto.getFacilityId()));

        Ticket ticket = Ticket.builder()
                .reporter(reporter)
                .facility(facility)
                .category(dto.getCategory())
                .description(dto.getDescription())
                .contactDetails(dto.getContactDetails())
                .priority(dto.getPriority() != null ? dto.getPriority() : TicketPriority.MEDIUM)
                .status(TicketStatus.OPEN)
                .build();

        ticket.getStatusHistory().add(buildHistoryEntry(ticket, TicketStatus.OPEN, "Ticket created", reporter));
        Ticket savedTicket = ticketRepository.save(ticket);
        
        // Notify Admins
        notificationService.notifyAdmins(
                "New Ticket Reported",
                "Ticket #" + savedTicket.getId() + " (" + savedTicket.getCategory() + ") was created by " + reporter.getName(),
                NotificationType.TICKET_UPDATE,
                "/admin"
        );
        
        adminUpdateService.broadcast("TICKET", "CREATED", savedTicket.getId());
        return savedTicket;
    }

    public List<Ticket> getTicketsForUser(User currentUser, TicketStatus status) {
        List<Ticket> tickets;
        if (currentUser.getRole() == Role.ADMIN) {
            tickets = status == null ? ticketRepository.findAll() : ticketRepository.findByStatus(status);
        } else if (currentUser.getRole() == Role.TECHNICIAN) {
            tickets = ticketRepository.findByAssignedToId(currentUser.getId());
        } else {
            tickets = ticketRepository.findByReporterId(currentUser.getId());
        }

        if (status == null || currentUser.getRole() == Role.ADMIN) {
            return tickets;
        }
        return tickets.stream()
                .filter(ticket -> ticket.getStatus() == status)
                .toList();
    }

    public Ticket getTicketById(Long id, User currentUser) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", id));
        validateTicketAccess(ticket, currentUser);
        return ticket;
    }

    public List<Ticket> getTicketsByReporter(Long userId) {
        return ticketRepository.findByReporterId(userId);
    }

    public List<Ticket> getTicketsByTechnician(Long technicianId) {
        return ticketRepository.findByAssignedToId(technicianId);
    }

    @Transactional
    public Ticket assignTicket(Long ticketId, User currentUser, User technician) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        if (currentUser.getRole() == Role.TECHNICIAN && !currentUser.getId().equals(technician.getId())) {
            throw new AccessDeniedException("Technicians can only assign tickets to themselves");
        }
        if (currentUser.getRole() != Role.ADMIN && currentUser.getRole() != Role.TECHNICIAN) {
            throw new AccessDeniedException("You do not have permission to assign tickets");
        }
        if (technician.getRole() != Role.TECHNICIAN) {
            throw new IllegalArgumentException("Assigned user must have TECHNICIAN role");
        }
        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new IllegalArgumentException("Only open tickets can be assigned");
        }
        ticket.setAssignedTo(technician);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        ticket.getStatusHistory().add(buildHistoryEntry(
                ticket,
                TicketStatus.IN_PROGRESS,
                "Assigned to " + technician.getName(),
                currentUser
        ));
        ticket = ticketRepository.save(ticket);

        notificationService.createNotification(
                technician,
                "Ticket Assigned",
                "You have been assigned ticket #" + ticketId + ": " + ticket.getCategory(),
                NotificationType.TICKET_ASSIGNED,
                "/tickets?ticket=" + ticketId
        );
        notificationService.createNotification(
                ticket.getReporter(),
                "Ticket Updated",
                "Ticket #" + ticketId + " is now IN PROGRESS.",
                NotificationType.TICKET_UPDATE,
                "/tickets?ticket=" + ticketId
        );
        adminUpdateService.broadcast("TICKET", "ASSIGNED", ticket.getId());

        return ticket;
    }

    @Transactional
    public Ticket updateTicketStatus(Long ticketId, User currentUser, TicketStatus newStatus, String notes) {
        Ticket ticket = getTicketById(ticketId, currentUser);
        validateStatusTransition(ticket.getStatus(), newStatus);
        validateStatusNotes(newStatus, notes);

        ticket.setStatus(newStatus);
        if (notes != null && !notes.isBlank()) {
            if (newStatus == TicketStatus.RESOLVED) {
                ticket.setResolutionNotes(notes);
            } else if (newStatus == TicketStatus.REJECTED) {
                ticket.setRejectionReason(notes);
            }
        }
        ticket.getStatusHistory().add(buildHistoryEntry(ticket, newStatus, notes, currentUser));
        ticket = ticketRepository.save(ticket);

        notificationService.createNotification(
                ticket.getReporter(),
                "Ticket Updated",
                "Ticket #" + ticketId + " status changed to " + newStatus,
                NotificationType.TICKET_UPDATE,
                "/tickets?ticket=" + ticketId
        );
        adminUpdateService.broadcast("TICKET", "STATUS_UPDATED", ticket.getId());

        return ticket;
    }

    @Transactional
    public Comment addComment(Long ticketId, User user, String content) {
        Ticket ticket = getTicketById(ticketId, user);

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
                    NotificationType.COMMENT_ADDED,
                    "/tickets?ticket=" + ticketId
            );
        }

        adminUpdateService.broadcast("COMMENT", "CREATED", comment.getId());

        return comment;
    }

    public List<Comment> getCommentsByTicket(Long ticketId, User currentUser) {
        getTicketById(ticketId, currentUser);
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }

    @Transactional
    public void deleteComment(Long commentId, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));

        if (!comment.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You can only delete your own comments");
        }

        commentRepository.delete(comment);
        adminUpdateService.broadcast("COMMENT", "DELETED", commentId);
    }

    @Transactional
    public Comment updateComment(Long commentId, User currentUser, String content) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));
        if (!comment.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You can only edit your own comments");
        }
        comment.setContent(content);
        Comment updatedComment = commentRepository.save(comment);
        adminUpdateService.broadcast("COMMENT", "UPDATED", updatedComment.getId());
        return updatedComment;
    }

    @Transactional
    public Ticket addAttachments(Long ticketId, User currentUser, List<MultipartFile> files, FileStorageService fileStorageService) {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("At least one image attachment is required");
        }

        Ticket ticket = getTicketById(ticketId, currentUser);
        if (ticket.getAttachments().size() + files.size() > 3) {
            throw new IllegalArgumentException("Maximum 3 attachments allowed per ticket");
        }

        for (MultipartFile file : files) {
            fileStorageService.validateImage(file);
            String fileName = fileStorageService.storeFile(file);
            ticket.getAttachments().add(TicketAttachment.builder()
                    .ticket(ticket)
                    .fileName(Objects.requireNonNullElse(file.getOriginalFilename(), fileName))
                    .fileUrl("/uploads/" + fileName)
                    .build());
        }

        Ticket updatedTicket = ticketRepository.save(ticket);
        adminUpdateService.broadcast("ATTACHMENT", "CREATED", updatedTicket.getId());
        return updatedTicket;
    }

    @Transactional
    public void deleteTicket(Long id, User currentUser) {
        if (currentUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only admins can delete tickets");
        }
        Ticket ticket = getTicketById(id, currentUser);
        ticketRepository.delete(ticket);
        adminUpdateService.broadcast("TICKET", "DELETED", id);
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

    private void validateStatusNotes(TicketStatus status, String notes) {
        if ((status == TicketStatus.RESOLVED || status == TicketStatus.REJECTED)
                && (notes == null || notes.isBlank())) {
            throw new IllegalArgumentException("Notes are required for this status change");
        }
    }

    private void validateTicketAccess(Ticket ticket, User currentUser) {
        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }
        if (currentUser.getRole() == Role.TECHNICIAN) {
            return;
        }
        if (!ticket.getReporter().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You do not have access to this ticket");
        }
    }

    private TicketStatusHistory buildHistoryEntry(Ticket ticket, TicketStatus status, String notes, User changedBy) {
        return TicketStatusHistory.builder()
                .ticket(ticket)
                .status(status)
                .notes(notes)
                .changedBy(changedBy)
                .build();
    }
}
