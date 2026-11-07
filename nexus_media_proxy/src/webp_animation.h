// SPDX-License-Identifier: Nebula

#pragma once

#include <stddef.h>
#include <stdint.h>
#include <webp/encode.h>

struct nexus_webp_animation_facts {
    uint32_t canvas_width;
    uint32_t canvas_height;
    uint32_t frame_count;
};

int nexus_webp_animation_preflight(
    const void *webp_data,
    size_t webp_len,
    int max_frames,
    size_t max_total_pixels,
    long long deadline_monotonic_ms,
    struct nexus_webp_animation_facts *facts
);

int nexus_configure_webp_encoder(
    WebPConfig *config,
    int quality,
    int lossless,
    int effort,
    int alpha_q,
    int smart_subsample
);

enum nexus_webp_pixel_layout {
    NEXUS_WEBP_PIXEL_LAYOUT_RGBA = 0,
    NEXUS_WEBP_PIXEL_LAYOUT_BGRA = 1
};

struct nexus_webp_animation_encoder;

struct nexus_webp_animation_encoder_settings {
    const WebPConfig *config;
    int canvas_width;
    int canvas_height;
    int loop_count;
    int full_canvas_frames;
    enum nexus_webp_pixel_layout pixel_layout;
    long long deadline_monotonic_ms;
    size_t max_output_size;
};

int nexus_webp_animation_encoder_create(
    const struct nexus_webp_animation_encoder_settings *settings,
    struct nexus_webp_animation_encoder **out_encoder
);

int nexus_webp_animation_encoder_add(
    struct nexus_webp_animation_encoder *encoder,
    const uint8_t *pixels,
    size_t stride,
    int duration_ms
);

int nexus_webp_animation_encoder_finish(
    struct nexus_webp_animation_encoder *encoder,
    void **out_buf,
    size_t *out_size
);

void nexus_webp_animation_encoder_delete(
    struct nexus_webp_animation_encoder *encoder
);
