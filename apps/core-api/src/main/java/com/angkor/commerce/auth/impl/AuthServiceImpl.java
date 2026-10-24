package com.angkor.commerce.auth.impl;

import com.angkor.commerce.auth.AuthService;
import com.angkor.commerce.auth.RefreshToken;
import com.angkor.commerce.auth.RefreshTokenRepository;
import com.angkor.commerce.auth.dto.request.LoginRequest;
import com.angkor.commerce.auth.dto.request.UpdateProfileRequest;
import com.angkor.commerce.auth.dto.response.AuthenticatedUserResponse;
import com.angkor.commerce.auth.dto.response.CurrentUserResponse;
import com.angkor.commerce.auth.dto.response.LoginResultResponse;
import com.angkor.commerce.auth.shared.JwtProperties;
import com.angkor.commerce.auth.shared.RefreshTokenCrypto;
import com.angkor.commerce.common.enums.RecordStatus;
import com.angkor.commerce.common.exception.ResourceNotFoundException;
import com.angkor.commerce.common.exception.ValidationException;
import com.angkor.commerce.common.storage.ImagePurpose;
import com.angkor.commerce.common.storage.ImageReplacedEvent;
import com.angkor.commerce.common.storage.ImageStorageService;
import com.angkor.commerce.common.storage.StorageCleanup;
import com.angkor.commerce.common.storage.StoredImage;
import com.angkor.commerce.security.JwtTokenProvider;
import com.angkor.commerce.user.User;
import com.angkor.commerce.user.UserRepository;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenCrypto refreshTokenCrypto;
    private final JwtTokenProvider jwtTokenProvider;
    private final ImageStorageService imageStorageService;
    private final ApplicationEventPublisher eventPublisher;
    private final JwtProperties jwtProperties;
    private final StorageCleanup storageCleanup;

    @Override
    @Transactional
    public LoginResultResponse login(LoginRequest request) {
        var username = request.username();
        var password = request.password();
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
        } catch (UsernameNotFoundException e) {
            throw new BadCredentialsException("Invalid username or password");
        }

        User user = userRepository
            .findByUsernameOrEmail(username, username)
            .orElseThrow(() -> new BadCredentialsException("Invalid Username or Password"));

        return issueTokens(user);
    }

    @Override
    @Transactional
    public LoginResultResponse refresh(String refreshToken) {
        String incomingHashToken = refreshTokenCrypto.hash(refreshToken);
        RefreshToken storedHashToken = refreshTokenRepository
            .findByTokenHash(incomingHashToken)
            .orElseThrow(() -> new BadCredentialsException("Invalid or expired refresh token"));

        if (!storedHashToken.isValid()) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }
        // Login is gated by CustomUserDetailsService, refresh is not: without this a deactivated
        // account keeps rotating tokens forever and deactivation never takes effect.
        if (storedHashToken.getUser().getStatus() != RecordStatus.ACTIVE) {
            throw new BadCredentialsException("Account is not active");
        }

        // Rotate: revoke the presented token and issue a branch new pair.
        storedHashToken.setRevoked(true);
        refreshTokenRepository.save(storedHashToken);
        return issueTokens(storedHashToken.getUser());
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        // does the revoke the token directly

        String incomingHashToken = refreshTokenCrypto.hash(refreshToken);
        refreshTokenRepository.findByTokenHash(incomingHashToken).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    @Override
    @Transactional
    public CurrentUserResponse getCurrentUser(String username) {
        User user = userRepository
            .findByUsernameOrEmail(username, username)
            .orElseThrow(() -> ResourceNotFoundException.of("User", username));

        return toUserResponse(user);
    }

    @Override
    @Transactional
    public CurrentUserResponse updateCurrentUser(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        if (request.email() != null && !request.email().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(request.email())) {
                throw new ValidationException(
                    "Email is already registered",
                    Map.of("email", "This email is already in use.")
                );
            }
            user.setEmail(request.email());
        }
        if (request.firstName() != null) {
            user.setFirstName(request.firstName());
        }
        if (request.lastName() != null) {
            user.setLastName(request.lastName());
        }
        if (request.phone() != null) {
            user.setPhone(request.phone());
        }
        if (request.image() != null) {
            user.setImage(request.image());
        }

        userRepository.save(user);
        return new CurrentUserResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getUsername(),
            user.getEmail(),
            user.getPhone(),
            user.getImage(),
            user.getRole(),
            user.getStatus()
        );
    }

    private LoginResultResponse issueTokens(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(
            user.getId(),
            user.getUsername(),
            user.getRole().name()
        );

        String rawRefreshToken = refreshTokenCrypto.generateRawToken();
        RefreshToken refreshToken = new RefreshToken();
        // set to the record
        refreshToken.setUser(user);
        refreshToken.setTokenHash(refreshTokenCrypto.hash(rawRefreshToken));
        refreshToken.setExpiresAt(Instant.now().plus(jwtProperties.refreshTokenTtlDays(), ChronoUnit.DAYS));
        refreshTokenRepository.save(refreshToken);
        AuthenticatedUserResponse authenticatedUserResponse = new AuthenticatedUserResponse(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getImage(),
            user.getRole()
        );

        return new LoginResultResponse(authenticatedUserResponse, accessToken, rawRefreshToken);
    }

    @Override
    public CurrentUserResponse updateProfleImage(Long userId, MultipartFile file) {
        User user = userRepository.findById(userId).orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        String oldImage = user.getImage();
        StoredImage result = imageStorageService.upload(file, ImagePurpose.STAFF_AVATAR, userId);
        eventPublisher.publishEvent(new ImageReplacedEvent(oldImage));

        user.setImage(result.objectKey());
        storageCleanup.onRollback(result.objectKey());
        return toUserResponse(user);
    }

    private CurrentUserResponse toUserResponse(User user) {
        return new CurrentUserResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getUsername(),
            user.getEmail(),
            user.getPhone(),
            user.getImage(),
            user.getRole(),
            user.getStatus()
        );
    }
}
