package com.smartcampus.controller;

import com.smartcampus.dto.BookingResponseDTO;
import com.smartcampus.model.Ticket;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.service.BookingService;
import com.smartcampus.service.TicketService;
import com.smartcampus.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final BookingService bookingService;
    private final TicketService ticketService;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/{id}/submissions")
    public ResponseEntity<Map<String, Object>> getUserSubmissions(@PathVariable Long id) {
        List<BookingResponseDTO> bookings = bookingService.getBookingsByUser(id);
        List<Ticket> tickets = ticketService.getTicketsByReporter(id);
        
        return ResponseEntity.ok(Map.of(
            "bookings", bookings,
            "tickets", tickets
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User userDetails) {
        User user = userService.getUserById(id);
        user.setName(userDetails.getName());
        user.setEmail(userDetails.getEmail());
        user.setRole(userDetails.getRole());
        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        // Disconnect assignments where this user was the admin acting on them
        jdbcTemplate.update("UPDATE ticket_status_history SET changed_by_id = NULL WHERE changed_by_id = ?", id);
        jdbcTemplate.update("UPDATE tickets SET assigned_to_id = NULL WHERE assigned_to_id = ?", id);
        
        // Delete things they created
        jdbcTemplate.update("DELETE FROM notifications WHERE user_id = ?", id);
        jdbcTemplate.update("DELETE FROM comments WHERE user_id = ?", id);
        jdbcTemplate.update("DELETE FROM ticket_attachments WHERE ticket_id IN (SELECT id FROM tickets WHERE reporter_id = ?)", id);
        jdbcTemplate.update("DELETE FROM ticket_status_history WHERE ticket_id IN (SELECT id FROM tickets WHERE reporter_id = ?)", id);
        jdbcTemplate.update("DELETE FROM comments WHERE ticket_id IN (SELECT id FROM tickets WHERE reporter_id = ?)", id);
        jdbcTemplate.update("DELETE FROM tickets WHERE reporter_id = ?", id);
        jdbcTemplate.update("DELETE FROM bookings WHERE user_id = ?", id);
        
        // Finally, nuke the user
        userRepository.deleteById(id);
        
        return ResponseEntity.noContent().build();
    }
}
