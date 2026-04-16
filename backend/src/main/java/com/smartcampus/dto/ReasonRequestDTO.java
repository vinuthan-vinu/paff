package com.smartcampus.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReasonRequestDTO {

    @NotBlank(message = "Reason is required")
    private String reason;
}
