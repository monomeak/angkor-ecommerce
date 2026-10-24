package com.angkor.commerce.user.impl;

import java.util.Map;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.common.enums.RecordStatus;
import com.angkor.commerce.common.exception.ResourceNotFoundException;
import com.angkor.commerce.common.exception.ValidationException;
import com.angkor.commerce.common.storage.ImagePurpose;
import com.angkor.commerce.common.storage.ImageReplacedEvent;
import com.angkor.commerce.common.storage.ImageStorageService;
import com.angkor.commerce.common.storage.StoredImage;
import com.angkor.commerce.user.Role;
import com.angkor.commerce.user.User;
import com.angkor.commerce.user.UserRepository;
import com.angkor.commerce.user.UserService;
import com.angkor.commerce.user.dto.request.CreateUserRequest;
import com.angkor.commerce.user.dto.request.UpdateUserRequest;
import com.angkor.commerce.user.dto.response.UserResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ImageStorageService imageStorageService;
    private final ApplicationEventPublisher eventPublisher;
    private static final String COLLECTION_KEY = "users";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> listUsers(int skip, int limit, String search) {
        int safeLimit = limit <= 0 ? 30 : limit;
        int pageNumber = safeLimit == 0 ? 0 : skip / safeLimit;
        Pageable pageable = PageRequest.of(pageNumber, safeLimit, Sort.by(Sort.Direction.ASC, "id"));
        Page<User> page;

        if (StringUtils.hasText(search)) {
            page =
                userRepository.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
                    search,
                    search,
                    search,
                    pageable
                );
        } else {
            page = userRepository.findAll(pageable);
        }

        // :: lamda syntax
        var items = page.getContent().stream().map(UserResponse::from).toList();
        return PageResponse.of(COLLECTION_KEY, items, page.getTotalElements(), skip, safeLimit); // another style by using  .of
    }

    @Override
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new ValidationException(
                "Username is already taken.",
                Map.of("username", "This username is already in use.")
            );
        }

        if (userRepository.existsByEmail(request.email())) {
            throw new ValidationException(
                "Email is already taken.",
                Map.of("email", "This email is already in use.")
            );
        }
        // instance new user objective and set the values

        User user = new User();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role()); // default role: STAFF
        user.setStatus(RecordStatus.ACTIVE);
        // repository (into database)
        userRepository.save(user);

        return UserResponse.from(user);
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request, Long actorId, Role actorRole) {
        assertActorIsAdmin(actorRole);
        User user = findUserOrThrow(id);

        assertCanManageRole(user.getRole(), actorRole, "modify a super admin account");
        if (request.role() != null) {
            assertCanManageRole(request.role(), actorRole, "grant the super admin role");
        }
        if (actorId.equals(id) && request.role() != null && request.role() != user.getRole()) {
            throw new AccessDeniedException("You cannot change your own role.");
        }

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
        if (request.role() != null) {
            user.setRole(request.role());
        }
        if (request.status() != null) {
            user.setStatus(request.status());
        }

        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Override
    @Transactional
    public UserResponse archiveUser(Long id, Long actorId, Role actorRole) {
        assertActorIsAdmin(actorRole); // filter only admin * can proceed.
        if (actorId.equals(id)) {
            throw new AccessDeniedException("You cannot archive your own account.");
        }

        User user = findUserOrThrow(id);

        assertCanManageRole(user.getRole(), actorRole, "archive a super admin account");
        if (
            user.getRole() == Role.SUPER_ADMIN &&
            userRepository.countByRoleAndStatus(Role.SUPER_ADMIN, RecordStatus.ACTIVE) <= 1
        ) {
            throw new ValidationException("Cannot archive the last active super admin.");
        }

        user.setStatus(RecordStatus.INACTIVE);
        return UserResponse.from(userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        return UserResponse.from(findUserOrThrow(id));
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("User", id));
    }

    /** Staff are view-only: only a super admin or shop admin may create, update, or archive users. */
    private void assertActorIsAdmin(Role actorRole) {
        if (actorRole != Role.SUPER_ADMIN && actorRole != Role.SHOP_ADMIN) {
            throw new AccessDeniedException("Only an admin can manage users.");
        }
    }

    /** Waterfall: only a super admin may act on a super admin account or grant the super admin role. */
    private void assertCanManageRole(Role role, Role actorRole, String action) {
        if (role == Role.SUPER_ADMIN && actorRole != Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Only a super admin can " + action + ".");
        }
    }

    @Override
    @Transactional
    public UserResponse updateImage(Long userId, MultipartFile file) {
        User user = findUserOrThrow(userId);

        String oldImage = user.getImage(); // ignore if it return null
        StoredImage newImage = this.imageStorageService.upload(file, ImagePurpose.STAFF_AVATAR, user.getId());
        user.setImage(newImage.objectKey());

        eventPublisher.publishEvent(new ImageReplacedEvent(oldImage));

        return UserResponse.from(user);
    }
}
