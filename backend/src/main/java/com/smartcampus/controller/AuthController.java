package com.smartcampus.controller;

import com.smartcampus.dto.AuthResponseDTO;
import com.smartcampus.dto.GoogleAuthRequest;
import com.smartcampus.dto.LoginRequestDTO;
import com.smartcampus.dto.RegisterRequestDTO;
import com.smartcampus.model.User;
import com.smartcampus.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDTO> register(@Valid @RequestBody RegisterRequestDTO request) {
        AuthResponseDTO response = userService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        AuthResponseDTO response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole().name(),
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""
        ));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponseDTO> googleLogin(@Valid @RequestBody GoogleAuthRequest request) {
        AuthResponseDTO response = userService.googleLogin(request.getIdToken());
        return ResponseEntity.ok(response);
    }
}
