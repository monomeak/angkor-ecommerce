package com.angkor.commerce.auth.dto.request;

import com.angkor.commerce.auth.dto.StrongPassword;
import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
    @NotBlank(message = "Current password is required") String currentPassword,
    @NotBlank(message = "New password is required") @StrongPassword String newPassword
) {}
