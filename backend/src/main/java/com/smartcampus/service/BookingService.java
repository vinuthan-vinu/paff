package com.smartcampus.service;

import com.smartcampus.dto.BookingRequestDTO;
import com.smartcampus.dto.BookingResponseDTO;
import com.smartcampus.exception.ConflictException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.*;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.FacilityRepository;
import lombok.RequiredArgsConstructor;
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
        return mapToResponse(booking);
    }

    public List<BookingResponseDTO> getAllBookings() {
        return bookingRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<BookingResponseDTO> getBookingsByUser(Long userId) {
        return bookingRepository.findByUserId(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public BookingResponseDTO getBookingById(Long id) {
        Booking booking = findBookingOrThrow(id);
        return mapToResponse(booking);
    }

    @Transactional
    public BookingResponseDTO approveBooking(Long id) {
        Booking booking = findBookingOrThrow(id);
        validatePendingStatus(booking);

        booking.setStatus(BookingStatus.APPROVED);
        booking = bookingRepository.save(booking);

        // Send notification to the user
        notificationService.createNotification(
                booking.getUser(),
                "Booking Approved",
                "Your booking for " + booking.getFacility().getName() + " on " +
                        booking.getBookingDate() + " has been approved.",
                NotificationType.BOOKING_APPROVED
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

        // Send notification
        notificationService.createNotification(
                booking.getUser(),
                "Booking Rejected",
                "Your booking for " + booking.getFacility().getName() + " has been rejected. Reason: " + reason,
                NotificationType.BOOKING_REJECTED
        );

        return mapToResponse(booking);
    }

    @Transactional
    public BookingResponseDTO cancelBooking(Long id, User currentUser) {
        Booking booking = findBookingOrThrow(id);

        if (!booking.getUser().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("You can only cancel your own bookings");
        }
        if (booking.getStatus() != BookingStatus.APPROVED && booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Only pending or approved bookings can be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking = bookingRepository.save(booking);
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
