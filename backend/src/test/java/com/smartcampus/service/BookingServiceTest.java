package com.smartcampus.service;

import com.smartcampus.dto.BookingRequestDTO;
import com.smartcampus.exception.ConflictException;
import com.smartcampus.model.Booking;
import com.smartcampus.model.Facility;
import com.smartcampus.model.User;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.FacilityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private FacilityRepository facilityRepository;

    @InjectMocks
    private BookingService bookingService;

    private User user;
    private Facility facility;
    private BookingRequestDTO bookingDTO;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setName("Test User");

        facility = new Facility();
        facility.setId(1L);
        facility.setName("Lec Hall 1");

        bookingDTO = new BookingRequestDTO();
        bookingDTO.setFacilityId(1L);
        bookingDTO.setBookingDate(LocalDate.now());
        bookingDTO.setStartTime(LocalTime.of(10, 0));
        bookingDTO.setEndTime(LocalTime.of(12, 0));
    }

    @Test
    void createBooking_Success() {
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        when(bookingRepository.hasConflict(eq(1L), any(LocalDate.class), any(LocalTime.class), any(LocalTime.class)))
                .thenReturn(false);

        Booking savedBooking = new Booking();
        savedBooking.setId(10L);
        when(bookingRepository.save(any(Booking.class))).thenReturn(savedBooking);

        Booking result = bookingService.createBooking(user, bookingDTO);

        assertNotNull(result);
        assertEquals(10L, result.getId());
        verify(bookingRepository, times(1)).save(any(Booking.class));
    }

    @Test
    void createBooking_Conflict_ThrowsException() {
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        // Simulate a conflict overlapping time
        when(bookingRepository.hasConflict(eq(1L), any(LocalDate.class), any(LocalTime.class), any(LocalTime.class)))
                .thenReturn(true);

        assertThrows(ConflictException.class, () -> bookingService.createBooking(user, bookingDTO));
        verify(bookingRepository, never()).save(any(Booking.class));
    }
}
