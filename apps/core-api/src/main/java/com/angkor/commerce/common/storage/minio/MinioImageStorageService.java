package com.angkor.commerce.common.storage.minio;

import com.angkor.commerce.common.storage.ImageObjectKeyFactory;
import com.angkor.commerce.common.storage.ImagePurpose;
import com.angkor.commerce.common.storage.ImageStorageException;
import com.angkor.commerce.common.storage.ImageStorageService;
import com.angkor.commerce.common.storage.ImageValidator;
import com.angkor.commerce.common.storage.StoredImage;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.errors.ErrorResponseException;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Collection;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
public class MinioImageStorageService implements ImageStorageService {

    private final MinioClient minioClient;
    private final MinioProperties properties;
    private final ImageValidator validator;
    private final ImageObjectKeyFactory keyFactory;

    public MinioImageStorageService(
        MinioClient minioClient,
        MinioProperties properties,
        ImageValidator validator,
        ImageObjectKeyFactory keyFactory
    ) {
        this.minioClient = minioClient;
        this.properties = properties;
        this.validator = validator;
        this.keyFactory = keyFactory;
    }

    @Override
    public StoredImage upload(MultipartFile file, ImagePurpose purpose, Long entityId) {
        this.validator.validate(file);
        String extension = this.validator.getExtension(file);

        String objectKey = this.keyFactory.create(purpose, entityId, extension);

        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(
                PutObjectArgs.builder()
                    .bucket(properties.bucket())
                    .object(objectKey)
                    .stream(inputStream, file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build()
            );
            return new StoredImage(objectKey, file.getContentType(), file.getSize());
        } catch (Exception e) {
            throw new ImageStorageException("Failed to upload image", e);
        }
    }

    @Override
    public void delet(String objectKey) {
        if (!StringUtils.hasText(objectKey)) {
            return;
        }
        try {
            minioClient.removeObject(RemoveObjectArgs.builder().bucket(properties.bucket()).object(objectKey).build());
        } catch (Exception e) {
            throw new ImageStorageException("Failed to delete image", e);
        }
    }

    @Override
    public String resolveUrl(String objectKey) {
        if (!StringUtils.hasText(objectKey)) {
            return null;
        }
        return "%s/%s".formatted(properties.publicBaseUrl(), objectKey);
    }

    @Override
    public StoredImage uploadBytes(
        byte[] content,
        String contentType,
        String extension,
        ImagePurpose purpose,
        Long entityId
    ) {
        String objectKey = this.keyFactory.create(purpose, entityId, extension);
        try (InputStream in = new ByteArrayInputStream(content)) {
            minioClient.putObject(
                PutObjectArgs.builder()
                    .bucket(properties.bucket())
                    .object(objectKey)
                    .stream(in, content.length, -1)
                    .contentType(contentType)
                    .build()
            );
            return new StoredImage(objectKey, contentType, content.length);
        } catch (Exception e) {
            throw new ImageStorageException("Failed to upload image bytes", e);
        }
    }

    @Override
    public void deleteQuietly(Collection<String> objectKeys) {
        objectKeys
            .stream()
            .filter(StringUtils::hasText)
            .forEach(key -> {
                try {
                    delet(key);
                } catch (ImageStorageException e) {
                    log.warn("Orphaned object left in bucket: {} ({})", key, e.getMessage());
                }
            });
    }

    @Override
    public boolean exists(String objectKey) {
        try {
            minioClient.statObject(StatObjectArgs.builder().bucket(properties.bucket()).object(objectKey).build());
            return true;
        } catch (ErrorResponseException e) {
            return false;
        } catch (Exception e) {
            throw new ImageStorageException("Failed to stat object" + objectKey, e);
        }
    }
}
