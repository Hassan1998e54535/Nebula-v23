// SPDX-License-Identifier: Nebula

pub use nexus_sample_pool::PCM_SLOT_SAMPLES_MAX;
pub type PcmFramePool = nexus_sample_pool::SamplePool<f32, false>;
pub type PooledPcmFrame = nexus_sample_pool::PooledSamples<f32, false>;
pub use nexus_sample_pool::PcmPoolError;
