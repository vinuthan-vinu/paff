package com.smartcampus.controller;

import com.smartcampus.dto.CommentUpdateDTO;
import com.smartcampus.model.Comment;
import com.smartcampus.model.User;
import com.smartcampus.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final TicketService ticketService;

    @PutMapping("/{id}")
    public ResponseEntity<Comment> updateComment(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CommentUpdateDTO request) {
        return ResponseEntity.ok(ticketService.updateComment(id, user, request.getContent()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        ticketService.deleteComment(id, user);
        return ResponseEntity.noContent().build();
    }
}
