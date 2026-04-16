package com.smartcampus.config;

import com.smartcampus.model.Facility;
import com.smartcampus.model.FacilityStatus;
import com.smartcampus.model.FacilityType;
import com.smartcampus.repository.FacilityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final FacilityRepository facilityRepository;

    @Override
    public void run(String... args) throws Exception {
        // Collect names of facilities that already exist so we don't duplicate
        Set<String> existingNames = facilityRepository.findAll()
                .stream()
                .map(Facility::getName)
                .collect(Collectors.toSet());

        List<Facility> toSeed = new ArrayList<>();

        // ── Lecture Halls ──
        if (!existingNames.contains("Main Lecture Hall")) {
            toSeed.add(Facility.builder()
                    .name("Main Lecture Hall")
                    .type(FacilityType.LECTURE_HALL)
                    .location("Building A, Ground Floor")
                    .capacity(500)
                    .description("Large hall for events and lectures. Equipped with surround sound, dual HD projectors, and a stage for presentations.")
                    .status(FacilityStatus.ACTIVE)
                    .availabilityWindows("Mon-Fri 08:00-18:00")
                    .build());
        }

        if (!existingNames.contains("Lecture Hall B")) {
            toSeed.add(Facility.builder()
                    .name("Lecture Hall B")
                    .type(FacilityType.LECTURE_HALL)
                    .location("Building A, 1st Floor")
                    .capacity(150)
                    .description("Medium-sized lecture hall with tiered seating, interactive whiteboard, and video-conferencing support.")
                    .status(FacilityStatus.ACTIVE)
                    .availabilityWindows("Mon-Fri 08:00-17:00")
                    .build());
        }

        // ── Labs ──
        if (!existingNames.contains("Computer Lab 101")) {
            toSeed.add(Facility.builder()
                    .name("Computer Lab 101")
                    .type(FacilityType.LAB)
                    .location("Building B, 1st Floor")
                    .capacity(50)
                    .description("High-performance workstations for CS students. Features dual monitors, GPU-accelerated machines, and high-speed internet.")
                    .status(FacilityStatus.ACTIVE)
                    .availabilityWindows("Mon-Fri 08:00-20:00, Sat 09:00-14:00")
                    .build());
        }

        if (!existingNames.contains("Electronics Lab")) {
            toSeed.add(Facility.builder()
                    .name("Electronics Lab")
                    .type(FacilityType.LAB)
                    .location("Building C, 2nd Floor")
                    .capacity(35)
                    .description("Fully equipped electronics laboratory with oscilloscopes, signal generators, soldering stations, and breadboard kits.")
                    .status(FacilityStatus.ACTIVE)
                    .availabilityWindows("Mon-Fri 09:00-17:00")
                    .build());
        }

        // ── Meeting Rooms ──
        if (!existingNames.contains("Conference Room A")) {
            toSeed.add(Facility.builder()
                    .name("Conference Room A")
                    .type(FacilityType.MEETING_ROOM)
                    .location("Admin Building, 2nd Floor")
                    .capacity(20)
                    .description("Small meeting room with projector, whiteboard, and comfortable seating for team discussions.")
                    .status(FacilityStatus.ACTIVE)
                    .availabilityWindows("Mon-Fri 08:00-18:00")
                    .build());
        }

        if (!existingNames.contains("Board Room")) {
            toSeed.add(Facility.builder()
                    .name("Board Room")
                    .type(FacilityType.MEETING_ROOM)
                    .location("Admin Building, 3rd Floor")
                    .capacity(12)
                    .description("Executive board room with video conferencing, digital whiteboard, and refreshment area.")
                    .status(FacilityStatus.ACTIVE)
                    .availabilityWindows("Mon-Fri 09:00-17:00")
                    .build());
        }

        // ── Equipment ──
        if (!existingNames.contains("Projector P-01")) {
            toSeed.add(Facility.builder()
                    .name("Projector P-01")
                    .type(FacilityType.EQUIPMENT)
                    .location("AV Department")
                    .capacity(1)
                    .description("Portable HD Projector with HDMI and wireless casting support.")
                    .status(FacilityStatus.ACTIVE)
                    .availabilityWindows("Mon-Sat 08:00-18:00")
                    .build());
        }

        if (!existingNames.contains("Laptop Cart L-01")) {
            toSeed.add(Facility.builder()
                    .name("Laptop Cart L-01")
                    .type(FacilityType.EQUIPMENT)
                    .location("IT Department, Ground Floor")
                    .capacity(30)
                    .description("Mobile cart with 30 fully charged laptops for classroom use. Pre-installed with development tools and office suites.")
                    .status(FacilityStatus.ACTIVE)
                    .availabilityWindows("Mon-Fri 08:00-16:00")
                    .build());
        }

        // ── One out-of-service example ──
        if (!existingNames.contains("Robotics Lab")) {
            toSeed.add(Facility.builder()
                    .name("Robotics Lab")
                    .type(FacilityType.LAB)
                    .location("Building D, Ground Floor")
                    .capacity(25)
                    .description("Robotics and IoT lab currently under renovation. Equipped with robotic arms, 3D printers, and IoT development boards.")
                    .status(FacilityStatus.OUT_OF_SERVICE)
                    .availabilityWindows("Mon-Fri 09:00-17:00")
                    .build());
        }

        if (!toSeed.isEmpty()) {
            facilityRepository.saveAll(toSeed);
            System.out.println("✅ Seeded " + toSeed.size() + " new facilities into the database.");
        }
    }
}
