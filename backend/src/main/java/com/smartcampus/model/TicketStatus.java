package com.smartcampus.model;

/**
 * Ticket lifecycle workflow:
 * OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED
 * OPEN -> REJECTED
 * RESOLVED -> IN_PROGRESS (reopened)
 */
public enum TicketStatus {
    OPEN,
    IN_PROGRESS,
    RESOLVED,
    CLOSED,
    REJECTED
}
