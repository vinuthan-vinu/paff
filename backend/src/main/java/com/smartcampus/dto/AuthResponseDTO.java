package com.smartcampus.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AuthResponseDTO {
    private String token;
    @Builder.Default
    private String type = "Bearer";
    private Long userId;
    private String name;
    private String email;
    private String role;
}
