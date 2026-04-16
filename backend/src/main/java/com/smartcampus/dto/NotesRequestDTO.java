package com.smartcampus.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NotesRequestDTO {

    @NotBlank(message = "Notes are required")
    private String notes;
}
