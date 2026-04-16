package com.smartcampus.service;

import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Notification;
import com.smartcampus.model.NotificationType;
import com.smartcampus.model.User;
import com.smartcampus.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessageSendingOperations messagingTemplate;
    private final com.smartcampus.repository.UserRepository userRepository;

    public Notification createNotification(User user, String title, String message, NotificationType type) {
        return createNotification(user, title, message, type, null);
    }

    public Notification createNotification(User user, String title, String message, NotificationType type, String targetPath) {
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .isRead(false)
                .targetPath(targetPath)
                .build();

        notification = notificationRepository.save(notification);

        // Send real-time notification via WebSocket
        messagingTemplate.convertAndSendToUser(
                user.getId().toString(),
                "/queue/notifications",
                notification
        );

        return notification;
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalse(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public Notification markAsRead(Long notificationId, User currentUser) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));
        if (!notification.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You do not have access to this notification");
        }
        notification.setIsRead(true);
        return notificationRepository.save(notification);
    }

    public void notifyAdmins(String title, String message, NotificationType type, String targetPath) {
        List<User> admins = userRepository.findByRole(com.smartcampus.model.Role.ADMIN);
        for (User admin : admins) {
            createNotification(admin, title, message, type, targetPath);
        }
    }
}
