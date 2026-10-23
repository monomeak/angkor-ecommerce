package com.angkor.commerce.common.exception;

import com.angkor.commerce.common.storage.ImageStorageException;
import com.angkor.commerce.common.storage.InvalidImageException;
import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage(), request);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException ex, HttpServletRequest request) {
        if (ex.getFieldErrors() != null && !ex.getFieldErrors().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                ErrorResponse.ofValidation(
                    400,
                    "Validation Failed",
                    ex.getMessage(),
                    request.getRequestURI(),
                    ex.getFieldErrors()
                )
            );
        }
        return build(HttpStatus.BAD_REQUEST, "Validation Failed", ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleBeanValidation(
        MethodArgumentNotValidException ex,
        HttpServletRequest request
    ) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult()
            .getFieldErrors()
            .forEach(fe -> fieldErrors.put(fe.getField(), fe.getDefaultMessage()));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse.ofValidation(
                400,
                "Validation Failed",
                "Request validation failed",
                request.getRequestURI(),
                fieldErrors
            )
        );
    }

    /**
     * Query and path parameters bind through the ConversionService, so a bad one throws here and
     * not as a MethodArgumentNotValidException. Without this it would fall to the catch-all below
     * and answer ?period=banana with a 500.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
        MethodArgumentTypeMismatchException ex,
        HttpServletRequest request
    ) {
        Class<?> target = ex.getRequiredType();
        String expected =
            target != null && target.isEnum()
                ? Arrays.stream(target.getEnumConstants())
                      .map(value -> ((Enum<?>) value).name().toLowerCase())
                      .collect(Collectors.joining(", "))
                : target == null
                  ? "a different type"
                  : target.getSimpleName();

        log.warn("Unbindable parameter on {}: {}", request.getRequestURI(), ex.getMessage());

        return build(
            HttpStatus.BAD_REQUEST,
            "Validation Failed",
            "Invalid value for '%s': expected one of %s".formatted(ex.getName(), expected),
            request
        );
    }

    /** Constraints on @RequestParam arguments of an @Validated controller land here, not above. */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(
        ConstraintViolationException ex,
        HttpServletRequest request
    ) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(violation -> fieldErrors.put(lastNode(violation), violation.getMessage()));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse.ofValidation(
                400,
                "Validation Failed",
                "Request validation failed",
                request.getRequestURI(),
                fieldErrors
            )
        );
    }

    private static String lastNode(ConstraintViolation<?> violation) {
        String path = violation.getPropertyPath().toString();
        return path.substring(path.lastIndexOf('.') + 1);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(
        DataIntegrityViolationException ex,
        HttpServletRequest request
    ) {
        log.warn("Data integrity violation on {}: {}", request.getRequestURI(), ex.getMessage());
        return build(
            HttpStatus.CONFLICT,
            "Conflict",
            "The request conflicts with an existing record (e.g. a duplicate unique field)",
            request
        );
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, "Unauthorized", "Invalid username or password", request);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, "Unauthorized", "Authentication is required", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        String message =
            ex.getMessage() != null ? ex.getMessage() : "You do not have permission to perform this action";
        return build(HttpStatus.FORBIDDEN, "Forbidden", message, request);
    }

    @ExceptionHandler(InvalidImageException.class)
    public ResponseEntity<ErrorResponse> handleInvalidImage(InvalidImageException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Validation Failed", ex.getMessage(), request);
    }

    @ExceptionHandler(ImageStorageException.class)
    public ResponseEntity<ErrorResponse> handleImageStorage(ImageStorageException ex, HttpServletRequest request) {
        log.error("Image storage failure on {}: {}", request.getRequestURI(), ex.getMessage(), ex.getCause());
        return build(HttpStatus.BAD_GATEWAY, "Bad Gateway", "Image storage is currently unavailable", request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(
        NoResourceFoundException ex,
        HttpServletRequest request
    ) {
        // Routine (source maps, favicons, ...) — a real error would come from an app
        // exception, not a missing static file. No stack trace, no ERROR-level noise.
        log.debug("Static resource not found: {}", request.getRequestURI());
        return build(HttpStatus.NOT_FOUND, "Not Found", "The requested resource was not found", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {}", request.getRequestURI(), ex);
        return build(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Internal Server Error",
            "An unexpected error occurred",
            request
        );
    }

    // common/exception/GlobalExceptionHandler.java

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadable(
        HttpMessageNotReadableException ex,
        HttpServletRequest request
    ) {
        String message = switch (ex.getCause()) {
            case InvalidFormatException ife -> "Invalid value for field '%s': expected %s".formatted(
                fieldPath(ife),
                ife.getTargetType().getSimpleName()
            );
            case MismatchedInputException mie -> "Invalid type for field '%s'".formatted(fieldPath(mie));
            case JsonParseException ignored -> "Request body is not valid JSON";
            case null, default -> "Request body is missing or malformed";
        };

        log.warn("Malformed request body on {}: {}", request.getRequestURI(), ex.getMessage());

        return build(HttpStatus.BAD_REQUEST, message, ex.getMessage(), request);
    }

    private String fieldPath(MismatchedInputException ex) {
        return ex
            .getPath()
            .stream()
            .map(ref -> ref.getFieldName() != null ? ref.getFieldName() : "[" + ref.getIndex() + "]")
            .collect(Collectors.joining("."));
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientStock(
        InsufficientStockException ex,
        HttpServletRequest request
    ) {
        return build(HttpStatus.CONFLICT, "Conflict", ex.getMessage(), request);
    }

    @ExceptionHandler(StorageException.class)
    public ResponseEntity<ErrorResponse> handleStorage(StorageException ex, HttpServletRequest request) {
        log.error("Storage failure on {}", request.getRequestURI(), ex);
        return build(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Could not process the uploaded file. Please try again.",
            ex.getMessage(),
            request
        );
    }

    // GlobalExceptionHandler — the customer sees a clean message,
    // the log gets the real cause
    @ExceptionHandler(PaymentGatewayException.class)
    public ResponseEntity<ErrorResponse> handleGateway(PaymentGatewayException ex, HttpServletRequest request) {
        log.error("Payment gateway error", ex);
        return build(
            HttpStatus.BAD_GATEWAY,
            "The payment service is unavailable. Please try again shortly.",
            null,
            request
        );
    }

    // 503, not 500: the data is fine, the renderer is not, and the client can retry.
    // JsReportRenderer has already logged jsreport's own error body.
    @ExceptionHandler(PdfGenerationException.class)
    public ResponseEntity<ErrorResponse> handlePdf(PdfGenerationException ex, HttpServletRequest request) {
        log.warn("PDF generation failed on {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable", ex.getMessage(), request);
    }

    private ResponseEntity<ErrorResponse> build(
        HttpStatus status,
        String error,
        String message,
        HttpServletRequest request
    ) {
        return ResponseEntity.status(status).body(
            ErrorResponse.of(status.value(), error, message, request.getRequestURI())
        );
    }

    @ExceptionHandler(InsufficientBalanceException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientBalance(
        InsufficientBalanceException ex,
        HttpServletRequest request
    ) {
        return build(HttpStatus.PAYMENT_REQUIRED, "Payment Required", ex.getMessage(), request);
    }

    @ExceptionHandler(AlreadyProcessedException.class)
    public ResponseEntity<ErrorResponse> handleAlreadyProcessed(
        AlreadyProcessedException ex,
        HttpServletRequest request
    ) {
        return build(HttpStatus.CONFLICT, "Conflict", ex.getMessage(), request);
    }

    @ExceptionHandler(ResourceAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleResourceAlreadyExists(
        ResourceAlreadyExistsException ex,
        HttpServletRequest request
    ) {
        return build(HttpStatus.CONFLICT, "Conflict", ex.getMessage(), request);
    }
}
