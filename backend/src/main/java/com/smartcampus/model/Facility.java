package com.smartcampus.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "facilities")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Facility {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Facility name is required")
    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FacilityType type;

    @NotBlank(message = "Location is required")
    private String location;

    @Positive(message = "Capacity must be positive")
    private Integer capacity;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FacilityStatus status = FacilityStatus.ACTIVE;

    /** JSON string or comma-separated availability windows, e.g. "08:00-17:00" */
    private String availabilityWindows;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
