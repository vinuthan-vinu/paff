package com.smartcampus.controller;

import com.smartcampus.dto.TicketDTO;
import com.smartcampus.model.Comment;
import com.smartcampus.model.Ticket;
import com.smartcampus.model.TicketStatus;
import com.smartcampus.model.User;
import com.smartcampus.service.FileStorageService;
import com.smartcampus.service.TicketService;
import com.smartcampus.service.UserService;
import com.smartcampus.model.TicketAttachment;
import com.smartcampus.repository.TicketRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
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
    public ResponseEntity<List<Ticket>> getAllTickets() {
        return ResponseEntity.ok(ticketService.getAllTickets());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ticket> getTicketById(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
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
            @RequestParam("files") List<MultipartFile> files) {

        if (files.size() > 3) {
            throw new IllegalArgumentException("Maximum 3 attachments allowed per ticket");
        }

        Ticket ticket = ticketService.getTicketById(id);

        for (MultipartFile file : files) {
            String fileName = fileStorageService.storeFile(file);
            TicketAttachment attachment = TicketAttachment.builder()
                    .ticket(ticket)
                    .fileName(file.getOriginalFilename())
                    .fileUrl("/uploads/" + fileName)
                    .build();
            ticket.getAttachments().add(attachment);
        }

        return ResponseEntity.ok(ticket);
    }

    @PatchMapping("/{id}/assign")
    public ResponseEntity<Ticket> assignTicket(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body) {
        Long technicianId = body.get("technicianId");
        User technician = userService.getUserById(technicianId);
        return ResponseEntity.ok(ticketService.assignTicket(id, technician));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Ticket> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        TicketStatus status = TicketStatus.valueOf(body.get("status"));
        String notes = body.getOrDefault("notes", null);
        return ResponseEntity.ok(ticketService.updateTicketStatus(id, status, notes));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Comment> addComment(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {
        String content = body.get("content");
        Comment comment = ticketService.addComment(id, user, content);
        return new ResponseEntity<>(comment, HttpStatus.CREATED);
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getCommentsByTicket(id));
    }

    @DeleteMapping("/{ticketId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long ticketId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal User user) {
        ticketService.deleteComment(commentId, user);
        return ResponseEntity.noContent().build();
    }
}
