package com.smartcampus.service;

import com.smartcampus.dto.FacilityDTO;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Facility;
import com.smartcampus.model.FacilityStatus;
import com.smartcampus.model.FacilityType;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.FacilityRepository;
import com.smartcampus.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class FacilityService {

    private final FacilityRepository facilityRepository;
    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;
    private final AdminUpdateService adminUpdateService;

    public List<Facility> getAllFacilities() {
        return facilityRepository.findAll();
    }

    public Facility getFacilityById(Long id) {
        return facilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Facility", "id", id));
    }

    public List<Facility> filterFacilities(FacilityType type, FacilityStatus status, String location, Integer minCapacity) {
        String normalizedLocation = location == null ? null : location.trim().toLowerCase(Locale.ROOT);

        return facilityRepository.findAll().stream()
                .filter(facility -> type == null || facility.getType() == type)
                .filter(facility -> status == null || facility.getStatus() == status)
                .filter(facility -> normalizedLocation == null || normalizedLocation.isBlank()
                        || facility.getLocation().toLowerCase(Locale.ROOT).contains(normalizedLocation))
                .filter(facility -> minCapacity == null || facility.getCapacity() >= minCapacity)
                .toList();
    }

    public Facility createFacility(FacilityDTO dto) {
        Facility facility = Facility.builder()
                .name(dto.getName())
                .type(dto.getType())
                .location(dto.getLocation())
                .capacity(dto.getCapacity())
                .description(dto.getDescription())
                .imageUrl(dto.getImageUrl())
                .status(dto.getStatus() != null ? dto.getStatus() : FacilityStatus.ACTIVE)
                .availabilityWindows(dto.getAvailabilityWindows())
                .build();

        Facility savedFacility = facilityRepository.save(facility);
        adminUpdateService.broadcast("RESOURCE", "CREATED", savedFacility.getId());
        return savedFacility;
    }

    public Facility updateFacility(Long id, FacilityDTO dto) {
        Facility facility = getFacilityById(id);

        facility.setName(dto.getName());
        facility.setType(dto.getType());
        facility.setLocation(dto.getLocation());
        facility.setCapacity(dto.getCapacity());
        facility.setDescription(dto.getDescription());
        facility.setImageUrl(dto.getImageUrl());
        if (dto.getStatus() != null) facility.setStatus(dto.getStatus());
        facility.setAvailabilityWindows(dto.getAvailabilityWindows());

        Facility updatedFacility = facilityRepository.save(facility);
        adminUpdateService.broadcast("RESOURCE", "UPDATED", updatedFacility.getId());
        return updatedFacility;
    }

    @Transactional
    public void deleteFacility(Long id) {
        Facility facility = getFacilityById(id);
        bookingRepository.deleteAll(bookingRepository.findByFacilityId(id));
        ticketRepository.deleteAll(ticketRepository.findByFacilityId(id));
        facilityRepository.delete(facility);
        adminUpdateService.broadcast("RESOURCE", "DELETED", id);
    }
}
