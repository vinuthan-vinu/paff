package com.smartcampus.dto;

import com.smartcampus.model.FacilityStatus;
import com.smartcampus.model.FacilityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class FacilityDTO {

    private Long id;

    @NotBlank(message = "Facility name is required")
    private String name;

    @NotNull(message = "Facility type is required")
    private FacilityType type;

    @NotBlank(message = "Location is required")
    private String location;

    @Positive(message = "Capacity must be a positive number")
    private Integer capacity;

    private String description;
    private String imageUrl;
    private FacilityStatus status;
    private String availabilityWindows;
}
