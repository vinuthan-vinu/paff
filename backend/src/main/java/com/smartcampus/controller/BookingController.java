package com.smartcampus.controller;

import com.smartcampus.dto.BookingRequestDTO;
import com.smartcampus.dto.BookingResponseDTO;
import com.smartcampus.dto.ReasonRequestDTO;
import com.smartcampus.model.BookingStatus;
import com.smartcampus.model.User;
import com.smartcampus.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @GetMapping
    public ResponseEntity<List<BookingResponseDTO>> getAllBookings(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) BookingStatus status) {
        return ResponseEntity.ok(bookingService.getBookingsForUser(user, status));
    }

    @GetMapping("/my")
    public ResponseEntity<List<BookingResponseDTO>> getMyBookings(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bookingService.getBookingsByUser(user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponseDTO> getBookingById(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bookingService.getBookingById(id, user));
    }

    @PostMapping
    public ResponseEntity<BookingResponseDTO> createBooking(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody BookingRequestDTO request) {
        BookingResponseDTO response = bookingService.createBooking(user, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @RequestMapping(path = "/{id}/approve", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<BookingResponseDTO> approveBooking(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.approveBooking(id));
    }

    @RequestMapping(path = "/{id}/reject", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<BookingResponseDTO> rejectBooking(
            @PathVariable Long id,
            @Valid @RequestBody ReasonRequestDTO request) {
        return ResponseEntity.ok(bookingService.rejectBooking(id, request.getReason()));
    }

    @RequestMapping(path = "/{id}/cancel", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<BookingResponseDTO> cancelBooking(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bookingService.cancelBooking(id, user));
    }
}
