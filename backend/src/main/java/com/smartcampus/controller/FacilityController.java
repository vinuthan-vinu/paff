package com.smartcampus.controller;

import com.smartcampus.dto.FacilityDTO;
import com.smartcampus.model.Facility;
import com.smartcampus.model.FacilityStatus;
import com.smartcampus.model.FacilityType;
import com.smartcampus.service.FacilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/facilities")
@RequiredArgsConstructor
public class FacilityController {

    private final FacilityService facilityService;

    @GetMapping
    public ResponseEntity<List<Facility>> getAllFacilities(
            @RequestParam(required = false) FacilityType type,
            @RequestParam(required = false) FacilityStatus status,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Integer minCapacity) {

        List<Facility> facilities = facilityService.filterFacilities(type, status, location, minCapacity);
        return ResponseEntity.ok(facilities);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Facility> getFacilityById(@PathVariable Long id) {
        return ResponseEntity.ok(facilityService.getFacilityById(id));
    }

    @PostMapping
    public ResponseEntity<Facility> createFacility(@Valid @RequestBody FacilityDTO dto) {
        Facility created = facilityService.createFacility(dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Facility> updateFacility(@PathVariable Long id,
                                                    @Valid @RequestBody FacilityDTO dto) {
        return ResponseEntity.ok(facilityService.updateFacility(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFacility(@PathVariable Long id) {
        facilityService.deleteFacility(id);
        return ResponseEntity.noContent().build();
    }
}
