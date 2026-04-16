package com.smartcampus.service;

import com.smartcampus.dto.FacilityDTO;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Facility;
import com.smartcampus.model.FacilityStatus;
import com.smartcampus.model.FacilityType;
import com.smartcampus.repository.FacilityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FacilityService {

    private final FacilityRepository facilityRepository;

    public List<Facility> getAllFacilities() {
        return facilityRepository.findAll();
    }

    public Facility getFacilityById(Long id) {
        return facilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Facility", "id", id));
    }

    public List<Facility> filterFacilities(FacilityType type, FacilityStatus status, String location, Integer minCapacity) {
        if (type != null && status != null) {
            return facilityRepository.findByTypeAndStatus(type, status);
        } else if (type != null) {
            return facilityRepository.findByType(type);
        } else if (status != null) {
            return facilityRepository.findByStatus(status);
        } else if (location != null) {
            return facilityRepository.findByLocationContainingIgnoreCase(location);
        } else if (minCapacity != null) {
            return facilityRepository.findByCapacityGreaterThanEqual(minCapacity);
        }
        return facilityRepository.findAll();
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

        return facilityRepository.save(facility);
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

        return facilityRepository.save(facility);
    }

    public void deleteFacility(Long id) {
        Facility facility = getFacilityById(id);
        facilityRepository.delete(facility);
    }
}
