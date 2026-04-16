package com.smartcampus.service;

import com.smartcampus.config.JwtTokenProvider;
import com.smartcampus.dto.AuthResponseDTO;
import com.smartcampus.dto.LoginRequestDTO;
import com.smartcampus.dto.RegisterRequestDTO;
import com.smartcampus.exception.ConflictException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Value("${spring.security.oauth2.client.registration.google.client-id:dummy-client-id}")
    private String googleClientId;

    public AuthResponseDTO register(RegisterRequestDTO request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email is already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getEmail().toLowerCase().contains("admin") ? Role.ADMIN : Role.USER)
                .build();

        user = userRepository.save(user);
        return buildAuthResponse(user);
    }

    public AuthResponseDTO login(LoginRequestDTO request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid email or password"));

        if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        return buildAuthResponse(user);
    }

    public AuthResponseDTO googleLogin(String idTokenString) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            // Mock handling for dummy tokens during development
            if (idTokenString.startsWith("mock-google-token-")) {
                String email = idTokenString.replace("mock-google-token-", "");
                return handleGoogleUserValidation(email, email.split("@")[0], "mock-id-" + email, null);
            }

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();
                return handleGoogleUserValidation(payload.getEmail(), (String) payload.get("name"), payload.getSubject(), (String) payload.get("picture"));
            } else {
                throw new IllegalArgumentException("Invalid Google ID Token");
            }
        } catch (Exception e) {
            throw new RuntimeException("Google authentication failed", e);
        }
    }

    private AuthResponseDTO handleGoogleUserValidation(String email, String name, String googleId, String avatarUrl) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = User.builder()
                    .email(email)
                    .name(name)
                    .googleId(googleId)
                    .avatarUrl(avatarUrl)
                    .role(email.toLowerCase().contains("admin") ? Role.ADMIN : Role.USER)
                    .build();
            user = userRepository.save(user);
        } else if (user.getGoogleId() == null) {
            user.setGoogleId(googleId);
            if (avatarUrl != null) user.setAvatarUrl(avatarUrl);
            user = userRepository.save(user);
        }
        return buildAuthResponse(user);
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private AuthResponseDTO buildAuthResponse(User user) {
        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return AuthResponseDTO.builder()
                .token(token)
                .type("Bearer")
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }
}
