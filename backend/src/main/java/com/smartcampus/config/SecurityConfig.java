package com.smartcampus.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> writeErrorResponse(
                        response, 401, "UNAUTHORIZED", "Authentication is required"))
                .accessDeniedHandler((request, response, accessDeniedException) -> writeErrorResponse(
                        response, 403, "FORBIDDEN", "You do not have permission to perform this action")))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/facilities/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                .requestMatchers("/api/notifications/debug-all", "/api/notifications/debug-users").permitAll()
                .requestMatchers("/ws/**").permitAll()
                // Admin-only endpoints
                .requestMatchers(HttpMethod.POST, "/api/facilities/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/facilities/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/facilities/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/resources/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/resources/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/resources/**").hasRole("ADMIN")
                .requestMatchers("/api/bookings/*/approve", "/api/bookings/*/reject").hasRole("ADMIN")
                .requestMatchers("/api/users/**").hasRole("ADMIN")
                .requestMatchers("/api/tickets/*/assign").hasAnyRole("ADMIN", "TECHNICIAN")

                .requestMatchers("/api/tickets/*/status", "/api/tickets/*/reject", "/api/tickets/*/resolve")
                .hasAnyRole("ADMIN", "TECHNICIAN")
                // Everything else requires authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private void writeErrorResponse(jakarta.servlet.http.HttpServletResponse response, int status, String code, String message)
            throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        new ObjectMapper().writeValue(response.getOutputStream(), Map.of(
                "status", status,
                "code", code,
                "message", message,
                "timestamp", java.time.LocalDateTime.now().toString()
        ));
    }
}
