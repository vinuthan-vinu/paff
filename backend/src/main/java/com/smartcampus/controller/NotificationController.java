package com.smartcampus.controller;

import com.smartcampus.model.Notification;
import com.smartcampus.model.User;
import com.smartcampus.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(@AuthenticationPrincipal User user) {
        System.out.println("Fetching notifications for user ID: " + user.getId() + " Role: " + user.getRole());
        List<Notification> notifs = notificationService.getUserNotifications(user.getId());
        System.out.println("Found " + notifs.size() + " notifications for user ID " + user.getId());
        return ResponseEntity.ok(notifs);
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.getUnreadNotifications(user.getId()));
    }

    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal User user) {
        long count = notificationService.getUnreadCount(user.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.markAsRead(id, user));
    }

    private final com.smartcampus.repository.NotificationRepository notificationRepository;

    @GetMapping("/debug-all")
    public ResponseEntity<List<Notification>> debugAll() {
        return ResponseEntity.ok(notificationRepository.findAll());
    }

    private final com.smartcampus.repository.UserRepository userRepository;

    @GetMapping("/debug-users")
    public ResponseEntity<List<Map<String, Object>>> debugUsers() {
        return ResponseEntity.ok(userRepository.findAll().stream().map(u -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", u.getId());
            map.put("name", u.getName());
            map.put("email", u.getEmail());
            map.put("role", u.getRole() != null ? u.getRole().name() : "NULL");
            return map;
        }).toList());
    }
}
