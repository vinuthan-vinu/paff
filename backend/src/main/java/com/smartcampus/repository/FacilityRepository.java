package com.smartcampus.repository;

import com.smartcampus.model.Facility;
import com.smartcampus.model.FacilityStatus;
import com.smartcampus.model.FacilityType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, Long> {

    List<Facility> findByType(FacilityType type);

    List<Facility> findByStatus(FacilityStatus status);

    List<Facility> findByLocationContainingIgnoreCase(String location);

    List<Facility> findByCapacityGreaterThanEqual(Integer capacity);

    List<Facility> findByTypeAndStatus(FacilityType type, FacilityStatus status);
}
