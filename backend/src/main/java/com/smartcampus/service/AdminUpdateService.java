package com.smartcampus.service;

import com.smartcampus.dto.AdminUpdateEventDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminUpdateService {

    private final SimpMessageSendingOperations messagingTemplate;

    public void broadcast(String entityType, String action, Long recordId) {
        messagingTemplate.convertAndSend("/topic/admin-updates", AdminUpdateEventDTO.builder()
                .entityType(entityType)
                .action(action)
                .recordId(recordId)
                .timestamp(LocalDateTime.now())
                .build());
    }
}
