package com.angkor.commerce.user.dto.request;

import com.angkor.commerce.auth.dto.StrongPassword;
import com.angkor.commerce.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
    /*
    Not Blank provide an trim first before rejects the empty string
     */
    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must be at most 100 characters")
    String firstName,

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must be at most 100 characters")
    String lastName,

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 100, message = "Username must be between 3 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_.-]+$", message = "Username may only contain letters, numbers, '.', '_' and '-'")
    String username,

    @NotBlank(message = "Email is required") @Email(message = "Email must be a valid email address") String email,

    String phone,
    @NotBlank(message = "Password is required") @StrongPassword String password,

    @NotNull(message = "Role is required") Role role
) {}
