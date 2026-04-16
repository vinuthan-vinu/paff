package com.smartcampus.dto;

import com.smartcampus.model.TicketStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TicketStatusUpdateDTO {

    @NotNull(message = "Status is required")
    private TicketStatus status;

    private String notes;
}
