package com.angkor.commerce.auth.impl;

import com.angkor.commerce.auth.CustomerAuthService;
import com.angkor.commerce.auth.CustomerRefreshToken;
import com.angkor.commerce.auth.CustomerRefreshTokenRepository;
import com.angkor.commerce.auth.dto.request.ChangePasswordRequest;
import com.angkor.commerce.auth.dto.request.CustomerLoginRequest;
import com.angkor.commerce.auth.dto.request.RegisterCustomerRequest;
import com.angkor.commerce.auth.dto.request.UpdateCustomerProfileRequest;
import com.angkor.commerce.auth.dto.response.AuthenticatedCustomerResponse;
import com.angkor.commerce.auth.dto.response.CurrentCustomerResponse;
import com.angkor.commerce.auth.dto.response.CustomerLoginResultResponse;
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
import com.angkor.commerce.customer.Customer;
import com.angkor.commerce.customer.CustomerRepository;
import com.angkor.commerce.security.JwtTokenProvider;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Deliberately doesn't go through Spring Security's {@code AuthenticationManager}/
 * {@code UserDetailsService} the way staff login does (see {@code AuthServiceImpl}) —
 * that machinery is wired to {@code User} only, and adding a second {@code UserDetailsService}
 * for customers would need its own discriminator to keep the two chains apart. Checking
 * the password hash directly keeps this flow self-contained, matching the "separate
 * identity chain" intent in CORE_API_DATA_MODEL.md decision 7.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class CustomerAuthServiceImpl implements CustomerAuthService {

    private final CustomerRepository customerRepository;
    private final CustomerRefreshTokenRepository customerRefreshTokenRepository;
    private final RefreshTokenCrypto refreshTokenCrypto;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final JwtProperties jwtProperties;
    private final ImageStorageService imageStorageService;
    private final ApplicationEventPublisher eventPublisher;
    private final StorageCleanup storageCleanup;

    @Override
    @Transactional
    public CustomerLoginResultResponse register(RegisterCustomerRequest request) {
        if (customerRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ValidationException("Email already in use", Map.of("email", "Email already in use"));
        }

        Customer customer = new Customer();
        customer.setFirstName(request.firstName());
        customer.setLastName(request.lastName());
        customer.setEmail(request.email());
        customer.setPasswordHash(passwordEncoder.encode(request.password()));
        customerRepository.save(customer);

        return issueTokens(customer);
    }

    @Override
    @Transactional
    public CustomerLoginResultResponse login(CustomerLoginRequest request) {
        Customer customer = customerRepository
            .findByEmailIgnoreCase(request.email())
            .filter(candidate -> passwordEncoder.matches(request.password(), candidate.getPasswordHash()))
            .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (customer.getStatus() != RecordStatus.ACTIVE) {
            throw new BadCredentialsException("Invalid email or password");
        }

        customer.setLastLoginAt(Instant.now());
        customerRepository.save(customer);

        return issueTokens(customer);
    }

    @Override
    @Transactional
    public CustomerLoginResultResponse refresh(String refreshToken) {
        String incomingHash = refreshTokenCrypto.hash(refreshToken);
        CustomerRefreshToken storedToken = customerRefreshTokenRepository
            .findByTokenHash(incomingHash)
            .orElseThrow(() -> new BadCredentialsException("Invalid or expired refresh token"));

        if (!storedToken.isValid()) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        // Rotate: revoke the presented token and issue a brand new pair.
        storedToken.setRevoked(true);
        customerRefreshTokenRepository.save(storedToken);
        return issueTokens(storedToken.getCustomer());
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        String incomingHash = refreshTokenCrypto.hash(refreshToken);
        customerRefreshTokenRepository.findByTokenHash(incomingHash).ifPresent(token -> {
            token.setRevoked(true);
            customerRefreshTokenRepository.save(token);
        });
    }

    @Override
    @Transactional
    public CurrentCustomerResponse getCurrentCustomer(String email) {
        Customer customer = customerRepository
            .findByEmailIgnoreCase(email)
            .orElseThrow(() -> ResourceNotFoundException.of("Customer", email));

        return toCurrentCustomerResponse(customer);
    }

    /**
     * Revokes every refresh token the customer holds, then issues a fresh pair for the caller:
     * any other signed-in device loses its session on its next refresh, this one stays signed in.
     */
    @Override
    @Transactional
    public CustomerLoginResultResponse changePassword(Long customerId, ChangePasswordRequest request) {
        Customer customer = customerRepository
            .findById(customerId)
            .orElseThrow(() -> ResourceNotFoundException.of("Customer", customerId));

        // 400 on the field, not 401: the session is fine, and a 401 would send the client
        // into its refresh-and-retry path for what is just a typo.
        if (!passwordEncoder.matches(request.currentPassword(), customer.getPasswordHash())) {
            throw new ValidationException(
                "Current password is incorrect",
                Map.of("currentPassword", "Current password is incorrect.")
            );
        }
        if (passwordEncoder.matches(request.newPassword(), customer.getPasswordHash())) {
            throw new ValidationException(
                "New password must be different",
                Map.of("newPassword", "New password must be different from the current one.")
            );
        }

        customer.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        customerRepository.save(customer);
        customerRefreshTokenRepository.revokeAllForCustomer(customer.getId());

        return issueTokens(customer);
    }

    private CustomerLoginResultResponse issueTokens(Customer customer) {
        String accessToken = jwtTokenProvider.generateCustomerAccessToken(customer.getId(), customer.getEmail());

        String rawRefreshToken = refreshTokenCrypto.generateRawToken();
        CustomerRefreshToken refreshToken = new CustomerRefreshToken();
        refreshToken.setCustomer(customer);
        refreshToken.setTokenHash(refreshTokenCrypto.hash(rawRefreshToken));
        refreshToken.setExpiresAt(Instant.now().plus(jwtProperties.refreshTokenTtlDays(), ChronoUnit.DAYS));
        customerRefreshTokenRepository.save(refreshToken);

        AuthenticatedCustomerResponse authenticatedCustomerResponse = new AuthenticatedCustomerResponse(
            customer.getId(),
            customer.getDisplayName(),
            customer.getFirstName(),
            customer.getLastName(),
            customer.getCompanyName(),
            customer.getEmail(),
            customer.getPhone()
        );

        return new CustomerLoginResultResponse(authenticatedCustomerResponse, accessToken, rawRefreshToken);
    }

    @Override
    @Transactional
    public CurrentCustomerResponse updateCurrentUser(Long customerId, UpdateCustomerProfileRequest request) {
        Customer customer = customerRepository
            .findById(customerId)
            .orElseThrow(() -> ResourceNotFoundException.of("Customer", customerId));

        if (request.email() != null && !request.email().equalsIgnoreCase(customer.getEmail())) {
            if (customerRepository.existsByEmailIgnoreCase(request.email())) {
                throw new ValidationException("Email already in use", Map.of("email", "Email already in use"));
            }
            customer.setEmail(request.email());
        }
        if (request.firstName() != null) {
            customer.setFirstName(request.firstName());
        }
        if (request.lastName() != null) {
            customer.setLastName(request.lastName());
        }
        if (request.companyName() != null) {
            customer.setCompanyName(request.companyName());
        }
        if (request.phone() != null) {
            customer.setPhone(request.phone());
        }
        if (request.image() != null) {
            customer.setImage(request.image());
        }

        customerRepository.save(customer);
        return toCurrentCustomerResponse(customer);
    }

    private CurrentCustomerResponse toCurrentCustomerResponse(Customer customer) {
        return new CurrentCustomerResponse(
            customer.getId(),
            customer.getDisplayName(),
            customer.getFirstName(),
            customer.getLastName(),
            customer.getCompanyName(),
            customer.getEmail(),
            customer.getPhone(),
            customer.getImage(),
            customer.getStatus()
        );
    }

    @Override
    public CurrentCustomerResponse updateProfleImage(Long userId, MultipartFile file) {
        Customer customer = customerRepository
            .findById(userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Customer", userId));

        String oldImage = customer.getImage();
        StoredImage result = imageStorageService.upload(file, ImagePurpose.CUSTOMER_AVATAR, userId);
        eventPublisher.publishEvent(new ImageReplacedEvent(oldImage));

        customer.setImage(result.objectKey());

        storageCleanup.onRollback(result.objectKey());
        return toCurrentCustomerResponse(customer);
    }
}
