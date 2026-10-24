package com.angkor.commerce.product;

import com.angkor.commerce.common.ApiConstants;
import com.angkor.commerce.common.dto.PageResponse;
import com.angkor.commerce.product.dto.request.CreateProductRequest;
import com.angkor.commerce.product.dto.request.CreateProductVariantRequest;
import com.angkor.commerce.product.dto.request.ProductQueryParams;
import com.angkor.commerce.product.dto.request.UpdateProductRequest;
import com.angkor.commerce.product.dto.request.UpdateProductVariantRequest;
import com.angkor.commerce.product.dto.response.ProductDeleteResponse;
import com.angkor.commerce.product.dto.response.ProductImageResponse;
import com.angkor.commerce.product.dto.response.ProductResponse;
import com.angkor.commerce.product.dto.response.ProductSummaryResponse;
import com.angkor.commerce.product.dto.response.ProductVariantResponse;
import com.angkor.commerce.security.annotation.IsShopUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.simpleframework.xml.core.Validate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping(ApiConstants.PRODUCTS_BASE)
@RequiredArgsConstructor
@Validate
@Tag(name = "Products", description = "Product catalogue management")
public class ProductController {

    ///  start here...
    private final ProductService productService;

    @PostMapping
    @Operation(summary = "Create a product with its variants")
    public ResponseEntity<ProductResponse> createProduct(@RequestBody @Valid CreateProductRequest request) {
        ProductResponse productResponse = productService.createProduct(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(productResponse.id())
            .toUri();
        return ResponseEntity.created(location).body(productResponse);
    }

    @GetMapping
    @Operation(summary = "List products with pagination, filtering and search")
    public ResponseEntity<PageResponse<ProductSummaryResponse>> getProducts(@Valid ProductQueryParams query) {
        return ResponseEntity.ok(productService.getProducts(query));
    }

    @GetMapping(ApiConstants.PATH_ID)
    @Operation(summary = "Get a single product with variants and images")
    public ResponseEntity<ProductResponse> getProduct(@PathVariable Long id) {
        ProductResponse result = productService.getProductById(id);
        return ResponseEntity.ok(result);
    }

    @PatchMapping(ApiConstants.PATH_ID)
    @Operation(summary = "Update product fields")
    public ResponseEntity<ProductResponse> updateProduct(
        @PathVariable Long id,
        @RequestBody @Valid UpdateProductRequest request
    ) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @DeleteMapping(ApiConstants.PATH_ID)
    @IsShopUser
    @Operation(summary = "Soft delete a product")
    public ResponseEntity<ProductDeleteResponse> deleteProduct(@PathVariable Long id) {
        return ResponseEntity.ok(productService.deleteProduct(id));
    }

    // ── Variants ──────────────────────────────────────────────
    @PostMapping(ApiConstants.PRODUCT_VARIANTS)
    @Operation(summary = "Add a variant to a product")
    public ResponseEntity<ProductVariantResponse> addVariant(
        @PathVariable Long id,
        @RequestBody @Valid CreateProductVariantRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.addVariant(id, request));
    }

    @PatchMapping(ApiConstants.PRODUCT_VARIANTS + "/{variantId}")
    @Operation(summary = "Update a variant")
    public ResponseEntity<ProductVariantResponse> updateVariant(
        @PathVariable Long id,
        @PathVariable Long variantId,
        @RequestBody @Valid UpdateProductVariantRequest request
    ) {
        return ResponseEntity.ok(productService.updateVariant(id, variantId, request));
    }

    @DeleteMapping(ApiConstants.PRODUCT_VARIANTS + "/{variantId}")
    @Operation(summary = "Delete a variant")
    public ResponseEntity<Void> deleteVariant(@PathVariable Long id, @PathVariable Long variantId) {
        productService.deleteVariant(id, variantId);
        return ResponseEntity.noContent().build();
    }

    // ── Images ────────────────────────────────────────────────

    @PostMapping(value = ApiConstants.PRODUCT_IMAGES, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a product image")
    public ResponseEntity<ProductImageResponse> addImage(
        @PathVariable Long id,
        @RequestPart("file") MultipartFile file,
        @RequestParam(required = false) Integer displayOrder
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.addImage(id, file, displayOrder));
    }

    @DeleteMapping(ApiConstants.PRODUCT_IMAGES + "/{imageId}")
    @Operation(summary = "Delete a product image")
    public ResponseEntity<Void> deleteImage(@PathVariable Long id, @PathVariable Long imageId) {
        productService.deleteImage(id, imageId);
        return ResponseEntity.noContent().build();
    }
}
