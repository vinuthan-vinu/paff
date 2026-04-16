package com.smartcampus.service;

import com.smartcampus.dto.BookingRequestDTO;
import com.smartcampus.dto.BookingResponseDTO;
import com.smartcampus.exception.ConflictException;
import com.smartcampus.model.*;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.FacilityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for BookingService — covers booking conflict detection,
 * validation logic, and approval/rejection workflows.
 */
@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
public class BookingServiceTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private FacilityRepository facilityRepository;

    // We use a stub instead of mocking NotificationService (Java 25 sealed classes)
    private NotificationService notificationService;
    private BookingService bookingService;

    private User user;
    private Facility facility;
    private BookingRequestDTO bookingDTO;

    @BeforeEach
    void setUp() {
        // Create a real NotificationService with null messaging template (won't be called in the mocked flow)
        notificationService = new NotificationService(
                mock(com.smartcampus.repository.NotificationRepository.class),
                mock(org.springframework.messaging.simp.SimpMessageSendingOperations.class)
        );
        AdminUpdateService adminUpdateService = new AdminUpdateService(
                mock(org.springframework.messaging.simp.SimpMessageSendingOperations.class)
        );
        bookingService = new BookingService(
                bookingRepository,
                facilityRepository,
                notificationService,
                adminUpdateService
        );

        user = new User();
        user.setId(1L);
        user.setName("Test User");
        user.setEmail("test@test.com");

        facility = new Facility();
        facility.setId(1L);
        facility.setName("Lecture Hall A");
        facility.setStatus(FacilityStatus.ACTIVE);

        bookingDTO = new BookingRequestDTO();
        bookingDTO.setFacilityId(1L);
        bookingDTO.setBookingDate(LocalDate.now().plusDays(1));
        bookingDTO.setStartTime(LocalTime.of(10, 0));
        bookingDTO.setEndTime(LocalTime.of(12, 0));
        bookingDTO.setPurpose("Lab Session");
        bookingDTO.setExpectedAttendees(30);
    }

    @Test
    @DisplayName("Should create booking successfully when no conflicts exist")
    void createBooking_Success() {
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        when(bookingRepository.findConflictingBookings(
                eq(1L), any(LocalDate.class), any(LocalTime.class), any(LocalTime.class)))
                .thenReturn(Collections.emptyList());

        Booking savedBooking = Booking.builder()
                .id(10L).user(user).facility(facility)
                .bookingDate(bookingDTO.getBookingDate())
                .startTime(bookingDTO.getStartTime())
                .endTime(bookingDTO.getEndTime())
                .purpose("Lab Session").status(BookingStatus.PENDING).build();
        when(bookingRepository.save(any(Booking.class))).thenReturn(savedBooking);

        BookingResponseDTO result = bookingService.createBooking(user, bookingDTO);

        assertNotNull(result);
        assertEquals(10L, result.getId());
        assertEquals(BookingStatus.PENDING, result.getStatus());
        assertEquals("Lecture Hall A", result.getFacilityName());
        verify(bookingRepository, times(1)).save(any(Booking.class));
    }

    @Test
    @DisplayName("Should throw ConflictException when time slot overlaps")
    void createBooking_Conflict_ThrowsException() {
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        Booking existingBooking = new Booking();
        existingBooking.setId(5L);
        when(bookingRepository.findConflictingBookings(
                eq(1L), any(LocalDate.class), any(LocalTime.class), any(LocalTime.class)))
                .thenReturn(List.of(existingBooking));

        assertThrows(ConflictException.class, () -> bookingService.createBooking(user, bookingDTO));
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    @DisplayName("Should throw exception when end time is before start time")
    void createBooking_InvalidTimeRange_ThrowsException() {
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        bookingDTO.setStartTime(LocalTime.of(14, 0));
        bookingDTO.setEndTime(LocalTime.of(12, 0));

        assertThrows(IllegalArgumentException.class, () -> bookingService.createBooking(user, bookingDTO));
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    @DisplayName("Should throw exception when facility is OUT_OF_SERVICE")
    void createBooking_FacilityOutOfService_ThrowsException() {
        facility.setStatus(FacilityStatus.OUT_OF_SERVICE);
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));

        assertThrows(IllegalArgumentException.class, () -> bookingService.createBooking(user, bookingDTO));
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    @DisplayName("Should approve a pending booking")
    void approveBooking_Success() {
        Booking pending = Booking.builder()
                .id(1L).user(user).facility(facility).status(BookingStatus.PENDING).build();
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(pending));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingResponseDTO result = bookingService.approveBooking(1L);
        assertEquals(BookingStatus.APPROVED, result.getStatus());
    }

    @Test
    @DisplayName("Should reject a pending booking with reason")
    void rejectBooking_Success() {
        Booking pending = Booking.builder()
                .id(1L).user(user).facility(facility).status(BookingStatus.PENDING).build();
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(pending));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingResponseDTO result = bookingService.rejectBooking(1L, "Room under repair");
        assertEquals(BookingStatus.REJECTED, result.getStatus());
        assertEquals("Room under repair", result.getRejectionReason());
    }
}
