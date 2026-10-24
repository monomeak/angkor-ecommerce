package com.angkor.commerce.auth;

import com.angkor.commerce.auth.dto.request.ChangePasswordRequest;
import com.angkor.commerce.auth.dto.request.CustomerLoginRequest;
import com.angkor.commerce.auth.dto.request.RegisterCustomerRequest;
import com.angkor.commerce.auth.dto.request.UpdateCustomerProfileRequest;
import com.angkor.commerce.auth.dto.response.CurrentCustomerResponse;
import com.angkor.commerce.auth.dto.response.CustomerLoginResultResponse;
import org.springframework.web.multipart.MultipartFile;

// declare contract and will be implemented later
public interface CustomerAuthService {
    CustomerLoginResultResponse register(RegisterCustomerRequest request);
    CustomerLoginResultResponse login(CustomerLoginRequest request);
    CustomerLoginResultResponse refresh(String refreshToken);
    void logout(String refreshToken);
    CurrentCustomerResponse getCurrentCustomer(String email);
    CurrentCustomerResponse updateCurrentUser(Long userId, UpdateCustomerProfileRequest request);
    CurrentCustomerResponse updateProfleImage(Long userId, MultipartFile file);
    void changePassword(Long customerId, ChangePasswordRequest request);
}
