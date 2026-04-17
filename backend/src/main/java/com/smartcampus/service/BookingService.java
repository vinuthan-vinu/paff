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

        // Validate availability windows (e.g., "Mon-Fri 08:00-18:00")
        String availability = facility.getAvailabilityWindows();
        if (availability != null && !availability.isBlank()) {
            boolean isValid = validateAvailability(dto.getBookingDate(), dto.getStartTime(), dto.getEndTime(), availability);
            if (!isValid) {
                throw new IllegalArgumentException("You cannot book at this time slot or on this day. Schedule: " + availability);
            }
        }

        // Validate capacity
        if (dto.getExpectedAttendees() != null && facility.getCapacity() != null) {
            if (dto.getExpectedAttendees() > facility.getCapacity()) {
                throw new IllegalArgumentException("Expected attendees (" + dto.getExpectedAttendees() + ") exceeds facility capacity (" + facility.getCapacity() + ")");
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
        
        // Notify Admins
        notificationService.notifyAdmins(
                "New Booking Request",
                user.getName() + " requested " + facility.getName() + " for " + dto.getBookingDate(),
                NotificationType.TICKET_UPDATE,
                "/admin"
        );
        
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

        booking.setStatus(BookingStatus.CANCELLED);
        booking = bookingRepository.save(booking);
        adminUpdateService.broadcast("BOOKING", "CANCELLED", booking.getId());
        return mapToResponse(booking);
    }

    @Transactional
    public void deleteBooking(Long id, User currentUser) {
        if (currentUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only admins can delete bookings");
        }
        Booking booking = findBookingOrThrow(id);
        bookingRepository.delete(booking);
        adminUpdateService.broadcast("BOOKING", "DELETED", id);
    }

    // --- Helper Methods ---
    
    private boolean validateAvailability(java.time.LocalDate date, java.time.LocalTime startTime, java.time.LocalTime endTime, String availability) {
        String dayOfWeek = date.getDayOfWeek().name().substring(0, 3).toUpperCase(); // e.g., "MON"
        String[] blocks = availability.split(",");
        
        for (String blockStr : blocks) {
            String block = blockStr.trim().toUpperCase();
            
            // Check day
            boolean dayMatch = false;
            if (block.contains("MON-FRI") || block.contains("WEEKDAYS")) {
                if (dayOfWeek.equals("MON") || dayOfWeek.equals("TUE") || dayOfWeek.equals("WED") || dayOfWeek.equals("THU") || dayOfWeek.equals("FRI")) dayMatch = true;
            } else if (block.contains("MON-SAT")) {
                if (!dayOfWeek.equals("SUN")) dayMatch = true;
            } else if (block.contains("WEEKENDS")) {
                if (dayOfWeek.equals("SAT") || dayOfWeek.equals("SUN")) dayMatch = true;
            } else if (block.contains(dayOfWeek)) {
                dayMatch = true;
            } else if (!block.matches(".*(MON|TUE|WED|THU|FRI|SAT|SUN).*")) {
                // If it doesn't specify any days, we assume it matches every day for this block
                dayMatch = true;
            }
            
            if (dayMatch) {
                // Check time
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d{1,2}:\\d{2})\\s*-\\s*(\\d{1,2}:\\d{2})").matcher(block);
                if (m.find()) {
                    String s1 = m.group(1);
                    String s2 = m.group(2);
                    java.time.LocalTime wStart = java.time.LocalTime.parse(s1.length() == 4 ? "0" + s1 : s1);
                    java.time.LocalTime wEnd = java.time.LocalTime.parse(s2.length() == 4 ? "0" + s2 : s2);
                    // the booking start time MUST NOT be before window start, and MUST be before window end (we assume a booking takes time).
                    // the booking end time MUST NOT be after window end.
                    if (!startTime.isBefore(wStart) && !endTime.isAfter(wEnd)) {
                        return true;
                    }
                } else {
                    return true; // No time constraints found in this block, so day match is enough
                }
            }
        }
        return false;
    }

    private Booking findBookingOrThrow(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));
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
