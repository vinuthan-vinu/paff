package com.smartcampus.model;

/**
 * Booking request status workflow:
 * PENDING -> APPROVED -> (CANCELLED)
 * PENDING -> REJECTED
 */
public enum BookingStatus {
    PENDING,
    APPROVED,
    REJECTED,
    CANCELLED
}
