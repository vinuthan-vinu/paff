package com.smartcampus.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AdminUpdateEventDTO {

    private String entityType;
    private String action;
    private Long recordId;
    private LocalDateTime timestamp;
}
