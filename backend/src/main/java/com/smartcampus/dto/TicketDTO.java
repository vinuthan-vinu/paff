package com.smartcampus.dto;

import com.smartcampus.model.TicketPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TicketDTO {

    private Long id;

    @NotNull(message = "Facility ID is required")
    private Long facilityId;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Contact details are required")
    private String contactDetails;

    private TicketPriority priority;
}
