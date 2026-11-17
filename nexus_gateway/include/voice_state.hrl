%% SPDX-License-Identifier: Nebula

-type voice_flags() :: #{
    self_mute := boolean(),
    self_deaf := boolean(),
    self_video := boolean(),
    self_stream := boolean(),
    hide_stream_preview_outside_channel => boolean(),
    is_mobile := boolean(),
    suppress := boolean()
}.
