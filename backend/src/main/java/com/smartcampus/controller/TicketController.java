package com.smartcampus.controller;

import com.smartcampus.dto.CommentUpdateDTO;
import com.smartcampus.dto.NotesRequestDTO;
import com.smartcampus.dto.ReasonRequestDTO;
import com.smartcampus.dto.TicketDTO;
import com.smartcampus.dto.TicketStatusUpdateDTO;
import com.smartcampus.model.Comment;
import com.smartcampus.model.Ticket;
import com.smartcampus.model.TicketStatus;
import com.smartcampus.model.User;
import com.smartcampus.service.FileStorageService;
import com.smartcampus.service.TicketService;
import com.smartcampus.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final UserService userService;
    private final FileStorageService fileStorageService;

    @GetMapping
    public ResponseEntity<List<Ticket>> getAllTickets(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) TicketStatus status) {
        return ResponseEntity.ok(ticketService.getTicketsForUser(user, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ticket> getTicketById(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.getTicketById(id, user));
    }

    @GetMapping("/my")
    public ResponseEntity<List<Ticket>> getMyTickets(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.getTicketsByReporter(user.getId()));
    }

    @GetMapping("/assigned")
    public ResponseEntity<List<Ticket>> getAssignedTickets(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.getTicketsByTechnician(user.getId()));
    }

    @PostMapping
    public ResponseEntity<Ticket> createTicket(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody TicketDTO dto) {
        Ticket ticket = ticketService.createTicket(user, dto);
        return new ResponseEntity<>(ticket, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/attachments")
    public ResponseEntity<Ticket> uploadAttachments(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestParam("files") List<MultipartFile> files) {
        return ResponseEntity.ok(ticketService.addAttachments(id, user, files, fileStorageService));
    }

    @RequestMapping(path = "/{id}/assign", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<Ticket> assignTicket(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Long> body) {
        Long technicianId = body.get("technicianId");
        if (technicianId == null) {
            throw new IllegalArgumentException("technicianId is required");
        }
        User technician = userService.getUserById(technicianId);
        return ResponseEntity.ok(ticketService.assignTicket(id, user, technician));
    }

    @RequestMapping(path = "/{id}/status", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<Ticket> updateStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody TicketStatusUpdateDTO request) {
        return ResponseEntity.ok(ticketService.updateTicketStatus(id, user, request.getStatus(), request.getNotes()));
    }

    @RequestMapping(path = "/{id}/reject", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<Ticket> rejectTicket(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ReasonRequestDTO request) {
        return ResponseEntity.ok(ticketService.updateTicketStatus(id, user, TicketStatus.REJECTED, request.getReason()));
    }

    @RequestMapping(path = "/{id}/resolve", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<Ticket> resolveTicket(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody NotesRequestDTO request) {
        return ResponseEntity.ok(ticketService.updateTicketStatus(id, user, TicketStatus.RESOLVED, request.getNotes()));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Comment> addComment(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CommentUpdateDTO request) {
        Comment comment = ticketService.addComment(id, user, request.getContent());
        return new ResponseEntity<>(comment, HttpStatus.CREATED);
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<Comment>> getComments(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ticketService.getCommentsByTicket(id, user));
    }

    @DeleteMapping("/{ticketId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long ticketId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal User user) {
        ticketService.deleteComment(commentId, user);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTicket(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        ticketService.deleteTicket(id, user);
        return ResponseEntity.noContent().build();
    }
}
