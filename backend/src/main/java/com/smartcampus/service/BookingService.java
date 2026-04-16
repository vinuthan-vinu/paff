package com.smartcampus.service;

import com.smartcampus.dto.BookingRequestDTO;
import com.smartcampus.dto.BookingResponseDTO;
import com.smartcampus.exception.ConflictException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.*;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.FacilityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final FacilityRepository facilityRepository;
    private final NotificationService notificationService;
    private final AdminUpdateService adminUpdateService;

    @Transactional
    public BookingResponseDTO createBooking(User user, BookingRequestDTO dto) {
        // Validate facility exists and is active
        Facility facility = facilityRepository.findById(dto.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Facility", "id", dto.getFacilityId()));

        if (facility.getStatus() == FacilityStatus.OUT_OF_SERVICE) {
            throw new IllegalArgumentException("Cannot book a facility that is out of service");
        }

        // Validate time range
        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        // Validate availability windows (format: "08:00-17:00")
        String availability = facility.getAvailabilityWindows();
        if (availability != null && !availability.isBlank()) {
            try {
                String[] parts = availability.split("-");
                if (parts.length == 2) {
                    java.time.LocalTime windowStart = java.time.LocalTime.parse(parts[0].trim());
                    java.time.LocalTime windowEnd = java.time.LocalTime.parse(parts[1].trim());
                    if (dto.getStartTime().isBefore(windowStart) || dto.getEndTime().isAfter(windowEnd)) {
                        throw new IllegalArgumentException("Booking time must be within facility availability window: " + availability);
                    }
                }
            } catch (Exception e) {
                // Ignore parse errors if the window string is malformed
            }
        }

        // Check for scheduling conflicts
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                dto.getFacilityId(), dto.getBookingDate(), dto.getStartTime(), dto.getEndTime());

        if (!conflicts.isEmpty()) {
            throw new ConflictException("This time slot conflicts with an existing booking");
        }

        Booking booking = Booking.builder()
                .user(user)
                .facility(facility)
                .bookingDate(dto.getBookingDate())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .purpose(dto.getPurpose())
                .expectedAttendees(dto.getExpectedAttendees())
                .status(BookingStatus.PENDING)
                .build();

        booking = bookingRepository.save(booking);
        adminUpdateService.broadcast("BOOKING", "CREATED", booking.getId());
        return mapToResponse(booking);
    }

    public List<BookingResponseDTO> getBookingsForUser(User currentUser, BookingStatus status) {
        if (currentUser.getRole() == Role.ADMIN) {
            return getAllBookings(status);
        }

        return bookingRepository.findByUserId(currentUser.getId()).stream()
                .filter(booking -> status == null || booking.getStatus() == status)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<BookingResponseDTO> getAllBookings(BookingStatus status) {
        List<Booking> bookings = status == null
                ? bookingRepository.findAll()
                : bookingRepository.findByStatus(status);

        return bookings.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<BookingResponseDTO> getBookingsByUser(Long userId) {
        return bookingRepository.findByUserId(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public BookingResponseDTO getBookingById(Long id, User currentUser) {
        Booking booking = findBookingOrThrow(id);
        validateBookingAccess(booking, currentUser);
        return mapToResponse(booking);
    }

    @Transactional
    public BookingResponseDTO approveBooking(Long id) {
        Booking booking = findBookingOrThrow(id);
        validatePendingStatus(booking);

        booking.setStatus(BookingStatus.APPROVED);
        booking = bookingRepository.save(booking);
        adminUpdateService.broadcast("BOOKING", "APPROVED", booking.getId());

        // Send notification to the user
        notificationService.createNotification(
                booking.getUser(),
                "Booking Approved",
                "Your booking for " + booking.getFacility().getName() + " on " +
                        booking.getBookingDate() + " has been approved.",
                NotificationType.BOOKING_APPROVED,
                "/bookings?booking=" + booking.getId()
        );

        return mapToResponse(booking);
    }

    @Transactional
    public BookingResponseDTO rejectBooking(Long id, String reason) {
        Booking booking = findBookingOrThrow(id);
        validatePendingStatus(booking);

        booking.setStatus(BookingStatus.REJECTED);
        booking.setRejectionReason(reason);
        booking = bookingRepository.save(booking);
        adminUpdateService.broadcast("BOOKING", "REJECTED", booking.getId());

        // Send notification
        notificationService.createNotification(
                booking.getUser(),
                "Booking Rejected",
                "Your booking for " + booking.getFacility().getName() + " has been rejected. Reason: " + reason,
                NotificationType.BOOKING_REJECTED,
                "/bookings?booking=" + booking.getId()
        );

        return mapToResponse(booking);
    }

    @Transactional
    public BookingResponseDTO cancelBooking(Long id, User currentUser) {
        Booking booking = findBookingOrThrow(id);
        validateBookingAccess(booking, currentUser);

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new IllegalArgumentException("Only approved bookings can be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking = bookingRepository.save(booking);
        adminUpdateService.broadcast("BOOKING", "CANCELLED", booking.getId());
        return mapToResponse(booking);
    }

    // --- Helper Methods ---

    private Booking findBookingOrThrow(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));
    }

    private void validatePendingStatus(Booking booking) {
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Only pending bookings can be approved or rejected");
        }
    }

    private void validateBookingAccess(Booking booking, User currentUser) {
        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }
        if (!booking.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You do not have access to this booking");
        }
    }

    private BookingResponseDTO mapToResponse(Booking booking) {
        return BookingResponseDTO.builder()
                .id(booking.getId())
                .userId(booking.getUser().getId())
                .userName(booking.getUser().getName())
                .facilityId(booking.getFacility().getId())
                .facilityName(booking.getFacility().getName())
                .bookingDate(booking.getBookingDate())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .purpose(booking.getPurpose())
                .expectedAttendees(booking.getExpectedAttendees())
                .status(booking.getStatus())
                .rejectionReason(booking.getRejectionReason())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
