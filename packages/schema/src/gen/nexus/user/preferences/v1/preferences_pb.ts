import type { GenEnum, GenFile, GenMessage } from "@bufbuild/protobuf/codegenv2";
import { enumDesc, fileDesc, messageDesc } from "@bufbuild/protobuf/codegenv2";
import type { AccessibilityOverrides, AccessibilitySettings } from "./accessibility_pb";
import { file_nexus_user_preferences_v1_accessibility } from "./accessibility_pb";
import type { EmojiPickerState, EmojiState, EmojiStickerLayoutSettings, FavoriteGifSettings, MemesPickerState, SoundSettings, StickerPickerState } from "./pickers_pb";
import { file_nexus_user_preferences_v1_pickers } from "./pickers_pb";
import type { Message } from "@bufbuild/protobuf";

/**
 * Describes the file nexus/user/preferences/v1/preferences.proto.
 */
export const file_nexus_user_preferences_v1_preferences: GenFile = /*@__PURE__*/
  fileDesc("CituZXh1cy91c2VyL3ByZWZlcmVuY2VzL3YxL3ByZWZlcmVuY2VzLnByb3RvEhluZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxIucWChFTeW5jZWRQcmVmZXJlbmNlcxJHCg1hY2Nlc3NpYmlsaXR5GAEgASgLMjAubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5BY2Nlc3NpYmlsaXR5U2V0dGluZ3MSUgoXYWNjZXNzaWJpbGl0eV9vdmVycmlkZXMYAiABKAsyMS5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLkFjY2Vzc2liaWxpdHlPdmVycmlkZXMSSgoPdGV4dHVhbF9wcmV2aWV3GAMgASgLMjEubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5UZXh0dWFsUHJldmlld1NldHRpbmdzEkEKDGVtb2ppX3BpY2tlchgUIAEoCzIrLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuRW1vamlQaWNrZXJTdGF0ZRJFCg5zdGlja2VyX3BpY2tlchgVIAEoCzItLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuU3RpY2tlclBpY2tlclN0YXRlEkEKDG1lbWVzX3BpY2tlchgWIAEoCzIrLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuTWVtZXNQaWNrZXJTdGF0ZRI0CgVlbW9qaRgXIAEoCzIlLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuRW1vamlTdGF0ZRJTChRlbW9qaV9zdGlja2VyX2xheW91dBgYIAEoCzI1Lm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuRW1vamlTdGlja2VyTGF5b3V0U2V0dGluZ3MSRQoNZmF2b3JpdGVfZ2lmcxgZIAEoCzIuLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuRmF2b3JpdGVHaWZTZXR0aW5ncxI8CglmYXZvcml0ZXMYKCABKAsyKS5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLkZhdm9yaXRlc1N0YXRlEkoKD3JlY2VudF9tZW50aW9ucxgpIAEoCzIxLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuUmVjZW50TWVudGlvbnNTZXR0aW5ncxI+CgdzaWRlYmFyGCogASgLMi0ubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5TaWRlYmFyUHJlZmVyZW5jZXMSPwoLbWVtYmVyX2xpc3QYKyABKAsyKi5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLk1lbWJlckxpc3RTdGF0ZRJHCg91bnJlYWRfY2hhbm5lbHMYLCABKAsyLi5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLlVucmVhZENoYW5uZWxzU3RhdGUSSQoQbWVudGlvbl9mcmVjZW5jeRgtIAEoCzIvLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuTWVudGlvbkZyZWNlbmN5U3RhdGUSPAoHbmFnYmFycxg8IAEoCzIrLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuTmFnYmFyRGlzbWlzc2FscxJGChFkaXNtaXNzZWRfdXBzZWxscxg9IAEoCzIrLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuRGlzbWlzc2VkVXBzZWxscxJNChVndWlsZF9uc2Z3X2FncmVlbWVudHMYPiABKAsyLi5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLkd1aWxkTnNmd0FncmVlbWVudHMSOwoJd2hhdHNfbmV3GD8gASgLMigubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5XaGF0c05ld1N0YXRlEj4KB3ByaXZhY3kYUCABKAsyLS5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLlByaXZhY3lQcmVmZXJlbmNlcxJPChRsb2NhbF9zcGFtX292ZXJyaWRlcxhRIAEoCzIxLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuTG9jYWxVc2VyU3BhbU92ZXJyaWRlcxIVCg1zYW5pdGl6ZV91cmxzGFIgASgIEjcKBXNvdW5kGGQgASgLMigubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5Tb3VuZFNldHRpbmdzEkEKCnNwZWxsY2hlY2sYZSABKAsyLS5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLlNwZWxsY2hlY2tTZXR0aW5ncxJHCg5zZWFyY2hfZW5naW5lcxhmIAEoCzIvLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuU2VhcmNoRW5naW5lU2V0dGluZ3MSTgoRcGVybWlzc2lvbl9sYXlvdXQYZyABKAsyMy5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLlBlcm1pc3Npb25MYXlvdXRTZXR0aW5ncxJRChNndWlsZF9tZW1iZXJfbGF5b3V0GGggASgLMjQubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5HdWlsZE1lbWJlckxheW91dFNldHRpbmdzEkoKDWd1aWxkX2ZvbGRlcnMYaSABKAsyMy5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLkd1aWxkRm9sZGVyRXhwYW5kZWRTdGF0ZRJPChRoaWRkZW5fZ3VpbGRfYnV0dG9ucxhqIAEoCzIxLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuSGlkZGVuR3VpbGRMaXN0QnV0dG9ucxJOChNrZXlib2FyZF9tb2RlX2ludHJvGGsgASgLMjEubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5LZXlib2FyZE1vZGVJbnRyb1N0YXRlElAKEGlucHV0X21vbml0b3JpbmcYbCABKAsyNi5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLklucHV0TW9uaXRvcmluZ1Byb21wdHNTdGF0ZRJDCg12b2ljZV9wcm9tcHRzGG0gASgLMiwubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5Wb2ljZVByb21wdHNTdGF0ZRI/CgtzdWRvX3Byb21wdBhuIAEoCzIqLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuU3Vkb1Byb21wdFN0YXRlEjwKCGtleWJpbmRzGG8gASgLMioubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5LZXliaW5kU2V0dGluZ3MSQAoKY2hhdF9pbnB1dBhwIAEoCzIsLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuQ2hhdElucHV0U2V0dGluZ3MSKgodc2F2ZV9jYW1lcmFfdXBsb2Fkc190b19kZXZpY2UYcSABKAhIAIgBARJFChNkb3VibGVfdGFwX3JlYWN0aW9uGHIgASgLMigubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5SZWFjdGlvbkVtb2ppEkkKEGNoYW5uZWxfZnJlY2VuY3kYcyABKAsyLy5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLkNoYW5uZWxGcmVjZW5jeVN0YXRlElEKFGFubm91bmNlbWVudF9wcm9tcHRzGHQgASgLMjMubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5Bbm5vdW5jZW1lbnRQcm9tcHRzU3RhdGUSRQoRZG91YmxlX3RhcF9hY3Rpb24YdSABKA4yKi5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLkRvdWJsZVRhcEFjdGlvbhJKChpzd2lwZV9yaWdodF90b19sZWZ0X2FjdGlvbhh2IAEoDjImLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuU3dpcGVBY3Rpb25CIAoeX3NhdmVfY2FtZXJhX3VwbG9hZHNfdG9fZGV2aWNlIrABChJTcGVsbGNoZWNrU2V0dGluZ3MSFAoHZW5hYmxlZBgBIAEoCEgAiAEBEhEKCWxhbmd1YWdlcxgCIAMoCRIbChNwZXJzb25hbF9kaWN0aW9uYXJ5GAMgAygJEhgKC2F1dG9fZGV0ZWN0GAQgASgISAGIAQESEwoGZW5naW5lGAUgASgJSAKIAQFCCgoIX2VuYWJsZWRCDgoMX2F1dG9fZGV0ZWN0QgkKB19lbmdpbmUi5gEKFFNlYXJjaEVuZ2luZVNldHRpbmdzEiIKFXRleHRfc2VhcmNoX2VuZ2luZV9pZBgBIAEoCUgAiAEBEisKHnJldmVyc2VfaW1hZ2Vfc2VhcmNoX2VuZ2luZV9pZBgCIAEoCUgBiAEBEiQKF3RyYW5zbGF0aW9uX3Byb3ZpZGVyX2lkGAMgASgJSAKIAQFCGAoWX3RleHRfc2VhcmNoX2VuZ2luZV9pZEIhCh9fcmV2ZXJzZV9pbWFnZV9zZWFyY2hfZW5naW5lX2lkQhoKGF90cmFuc2xhdGlvbl9wcm92aWRlcl9pZCK1AQoSUHJpdmFjeVByZWZlcmVuY2VzEh8KF2Rpc2FibGVfc3RyZWFtX3ByZXZpZXdzGAEgASgIEhwKD3Nob3dfYWN0aXZlX25vdxgCIAEoCEgAiAEBEioKHXByZXVwbG9hZF9tZXNzYWdlX2F0dGFjaG1lbnRzGAMgASgISAGIAQFCEgoQX3Nob3dfYWN0aXZlX25vd0IgCh5fcHJldXBsb2FkX21lc3NhZ2VfYXR0YWNobWVudHMiUAoWTG9jYWxVc2VyU3BhbU92ZXJyaWRlcxIYChBzcGFtbWVyX3VzZXJfaWRzGAEgAygJEhwKFG5vdF9zcGFtbWVyX3VzZXJfaWRzGAIgAygJIisKFlRleHR1YWxQcmV2aWV3U2V0dGluZ3MSEQoJd3JhcF90ZXh0GAEgASgIItwBChJTaWRlYmFyUHJlZmVyZW5jZXMSHAoUaW5saW5lX2Rtc19jb2xsYXBzZWQYASABKAgSLAofc2hvd19jb2xsYXBzZWRfdW5yZWFkX2Rtc19iYWRnZRgCIAEoCEgAiAEBEi8KInNob3dfaW5jb21pbmdfZnJpZW5kX3JlcXVlc3RfYmFkZ2UYAyABKAhIAYgBAUIiCiBfc2hvd19jb2xsYXBzZWRfdW5yZWFkX2Rtc19iYWRnZUIlCiNfc2hvd19pbmNvbWluZ19mcmllbmRfcmVxdWVzdF9iYWRnZSI9Cg9NZW1iZXJMaXN0U3RhdGUSGQoMbWVtYmVyc19vcGVuGAEgASgISACIAQFCDwoNX21lbWJlcnNfb3BlbiI0ChNVbnJlYWRDaGFubmVsc1N0YXRlEh0KFWNvbGxhcHNlZF9jaGFubmVsX2lkcxgBIAMoCSKqAQoWUmVjZW50TWVudGlvbnNTZXR0aW5ncxIdChBpbmNsdWRlX2V2ZXJ5b25lGAEgASgISACIAQESGgoNaW5jbHVkZV9yb2xlcxgCIAEoCEgBiAEBEhsKDmluY2x1ZGVfZ3VpbGRzGAMgASgISAKIAQFCEwoRX2luY2x1ZGVfZXZlcnlvbmVCEAoOX2luY2x1ZGVfcm9sZXNCEQoPX2luY2x1ZGVfZ3VpbGRzIv0BChRNZW50aW9uRnJlY2VuY3lTdGF0ZRJFCgZzY29wZXMYASADKAsyNS5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLk1lbnRpb25GcmVjZW5jeVN0YXRlLlNjb3BlGjsKBUVudHJ5Eg8KB3VzZXJfaWQYASABKAkSDQoFY291bnQYAiABKA0SEgoKbGFzdF9hdF9tcxgDIAEoAxphCgVTY29wZRIQCghndWlsZF9pZBgBIAEoCRJGCgdlbnRyaWVzGAIgAygLMjUubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5NZW50aW9uRnJlY2VuY3lTdGF0ZS5FbnRyeSLbAQoORmF2b3JpdGVzU3RhdGUSPAoIY2hhbm5lbHMYASADKAsyKi5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLkZhdm9yaXRlQ2hhbm5lbBI/CgpjYXRlZ29yaWVzGAIgAygLMisubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5GYXZvcml0ZUNhdGVnb3J5Eh4KFmNvbGxhcHNlZF9jYXRlZ29yeV9pZHMYAyADKAkSGwoTaGlkZV9tdXRlZF9jaGFubmVscxgEIAEoCBINCgVtdXRlZBgFIAEoCCKTAQoPRmF2b3JpdGVDaGFubmVsEhIKCmNoYW5uZWxfaWQYASABKAkSEAoIZ3VpbGRfaWQYAiABKAkSFgoJcGFyZW50X2lkGAMgASgJSACIAQESEAoIcG9zaXRpb24YBCABKAUSFQoIbmlja25hbWUYBSABKAlIAYgBAUIMCgpfcGFyZW50X2lkQgsKCV9uaWNrbmFtZSI+ChBGYXZvcml0ZUNhdGVnb3J5EgoKAmlkGAEgASgJEgwKBG5hbWUYAiABKAkSEAoIcG9zaXRpb24YAyABKAUi3ggKEE5hZ2JhckRpc21pc3NhbHMSEwoLaW9zX2luc3RhbGwYASABKAgSEwoLcHdhX2luc3RhbGwYAiABKAgSGQoRcHVzaF9ub3RpZmljYXRpb24YAyABKAgSHAoUZGVza3RvcF9ub3RpZmljYXRpb24YBCABKAgSHAoUcHJlbWl1bV9ncmFjZV9wZXJpb2QYBSABKAgSFwoPcHJlbWl1bV9leHBpcmVkGAYgASgIEhoKEnByZW1pdW1fb25ib2FyZGluZxgHIAEoCBIeChZwcmVtaXVtX3RyaWFsX2V4cGlyaW5nGAggASgIEhYKDmdpZnRfaW52ZW50b3J5GAkgASgIEhgKEGRlc2t0b3BfZG93bmxvYWQYCiABKAgSHAoUZ3VpbGRfbWVtYmVyc2hpcF9jdGEYCyABKAgSFQoNdmlzaW9uYXJ5X21mYRgMIAEoCBJjChVwZW5kaW5nX2J1bGtfZGVsZXRpb24YDyADKAsyRC5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLk5hZ2JhckRpc21pc3NhbHMuUGVuZGluZ0J1bGtEZWxldGlvbkVudHJ5EloKEGludml0ZXNfZGlzYWJsZWQYECADKAsyQC5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLk5hZ2JhckRpc21pc3NhbHMuSW52aXRlc0Rpc2FibGVkRW50cnkSYwoVZ3VpbGRfbWZhX3JlcXVpcmVtZW50GBEgAygLMkQubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5OYWdiYXJEaXNtaXNzYWxzLkd1aWxkTWZhUmVxdWlyZW1lbnRFbnRyeRJeChJwcmljZV9hbm5vdW5jZW1lbnQYEiADKAsyQi5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLk5hZ2JhckRpc21pc3NhbHMuUHJpY2VBbm5vdW5jZW1lbnRFbnRyeRJeChNsZWdhY3lfcHJpY2Vfb3B0X2luGBMgAygLMkEubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5OYWdiYXJEaXNtaXNzYWxzLkxlZ2FjeVByaWNlT3B0SW5FbnRyeRo6ChhQZW5kaW5nQnVsa0RlbGV0aW9uRW50cnkSCwoDa2V5GAEgASgJEg0KBXZhbHVlGAIgASgIOgI4ARo2ChRJbnZpdGVzRGlzYWJsZWRFbnRyeRILCgNrZXkYASABKAkSDQoFdmFsdWUYAiABKAg6AjgBGjoKGEd1aWxkTWZhUmVxdWlyZW1lbnRFbnRyeRILCgNrZXkYASABKAkSDQoFdmFsdWUYAiABKAg6AjgBGjgKFlByaWNlQW5ub3VuY2VtZW50RW50cnkSCwoDa2V5GAEgASgJEg0KBXZhbHVlGAIgASgIOgI4ARo3ChVMZWdhY3lQcmljZU9wdEluRW50cnkSCwoDa2V5GAEgASgJEg0KBXZhbHVlGAIgASgIOgI4AUoECA4QDyIqChBEaXNtaXNzZWRVcHNlbGxzEhYKDnBpY2tlcl9wcmVtaXVtGAEgASgIImgKE0d1aWxkTnNmd0FncmVlbWVudHMSGgoSYWdyZWVkX2NoYW5uZWxfaWRzGAEgAygJEhgKEGFncmVlZF9ndWlsZF9pZHMYAiADKAkSGwoTYWdyZWVkX2NhdGVnb3J5X2lkcxgDIAMoCSJRCg1XaGF0c05ld1N0YXRlEiQKF2xhc3RfZGlzbWlzc2VkX2VudHJ5X2lkGAEgASgJSACIAQFCGgoYX2xhc3RfZGlzbWlzc2VkX2VudHJ5X2lkIpgBChhQZXJtaXNzaW9uTGF5b3V0U2V0dGluZ3MSPwoGbGF5b3V0GAEgASgOMi8ubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5QZXJtaXNzaW9uTGF5b3V0TW9kZRI7CgRncmlkGAIgASgOMi0ubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5QZXJtaXNzaW9uR3JpZE1vZGUiWQoZR3VpbGRNZW1iZXJMYXlvdXRTZXR0aW5ncxI8CgRtb2RlGAEgASgOMi4ubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5HdWlsZE1lbWJlclZpZXdNb2RlIjcKGEd1aWxkRm9sZGVyRXhwYW5kZWRTdGF0ZRIbChNleHBhbmRlZF9mb2xkZXJfaWRzGAEgAygGIkYKFkhpZGRlbkd1aWxkTGlzdEJ1dHRvbnMSFwoPZG93bmxvYWRfYnV0dG9uGAEgASgIEhMKC2hlbHBfYnV0dG9uGAIgASgIIiYKFktleWJvYXJkTW9kZUludHJvU3RhdGUSDAoEc2VlbhgBIAEoCCIvChtJbnB1dE1vbml0b3JpbmdQcm9tcHRzU3RhdGUSEAoIc2Vlbl9jdGEYASABKAgigwEKEVZvaWNlUHJvbXB0c1N0YXRlEiQKHHNraXBfaGlkZV9vd25fY2FtZXJhX2NvbmZpcm0YASABKAgSKQohc2tpcF9oaWRlX293bl9zY3JlZW5zaGFyZV9jb25maXJtGAIgASgIEh0KFXNraXBfcDJwX2pvaW5fY29uZmlybRgDIAEoCCI2ChhBbm5vdW5jZW1lbnRQcm9tcHRzU3RhdGUSGgoSaGlkZV9wdWJsaXNoX251ZGdlGAEgASgIInMKD1N1ZG9Qcm9tcHRTdGF0ZRJHChRsYXN0X3VzZWRfbWZhX21ldGhvZBgBIAEoDjIkLm5leHVzLnVzZXIucHJlZmVyZW5jZXMudjEuTWZhTWV0aG9kSACIAQFCFwoVX2xhc3RfdXNlZF9tZmFfbWV0aG9kIrkBCg9LZXliaW5kU2V0dGluZ3MSQQoPY3VzdG9tX2tleWJpbmRzGAEgAygLMigubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5DdXN0b21LZXliaW5kEhUKDXRyYW5zbWl0X21vZGUYAiABKAkSKgodcHVzaF90b190YWxrX3JlbGVhc2VfZGVsYXlfbXMYAyABKA1IAIgBAUIgCh5fcHVzaF90b190YWxrX3JlbGVhc2VfZGVsYXlfbXMihAEKDUN1c3RvbUtleWJpbmQSCgoCaWQYASABKAkSEwoGYWN0aW9uGAIgASgJSACIAQESNgoFY29tYm8YAyABKAsyJy5uZXh1cy51c2VyLnByZWZlcmVuY2VzLnYxLktleWJpbmRDb21ibxIPCgdlbmFibGVkGAQgASgIQgkKB19hY3Rpb24izgIKDEtleWJpbmRDb21ibxILCgNrZXkYASABKAkSEQoEY29kZRgCIAEoCUgAiAEBEhQKDGN0cmxfb3JfbWV0YRgDIAEoCBIMCgRjdHJsGAQgASgIEgsKA2FsdBgFIAEoCBINCgVzaGlmdBgGIAEoCBIMCgRtZXRhGAcgASgIEhMKBmdsb2JhbBgIIAEoCEgBiAEBEhQKB2VuYWJsZWQYCSABKAhIAogBARIVCg1tb2RpZmllcl9vbmx5GAogASgIEhIKCmJvdGhfc2lkZXMYCyABKAgSGQoMbW91c2VfYnV0dG9uGAwgASgNSAOIAQESGwoOZ2FtZXBhZF9idXR0b24YDSABKA1IBIgBAUIHCgVfY29kZUIJCgdfZ2xvYmFsQgoKCF9lbmFibGVkQg8KDV9tb3VzZV9idXR0b25CEQoPX2dhbWVwYWRfYnV0dG9uIkIKFENoYW5uZWxGcmVjZW5jeUVudHJ5EhIKCnRvdGFsX3VzZXMYASABKA0SFgoOcmVjZW50X3VzZXNfbXMYAiADKAMiwAEKFENoYW5uZWxGcmVjZW5jeVN0YXRlEkkKBXVzYWdlGAEgAygLMjoubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5DaGFubmVsRnJlY2VuY3lTdGF0ZS5Vc2FnZUVudHJ5Gl0KClVzYWdlRW50cnkSCwoDa2V5GAEgASgJEj4KBXZhbHVlGAIgASgLMi8ubmV4dXMudXNlci5wcmVmZXJlbmNlcy52MS5DaGFubmVsRnJlY2VuY3lFbnRyeToCOAEiSQoRQ2hhdElucHV0U2V0dGluZ3MSHgoRY29udmVydF9lbW90aWNvbnMYASABKAhIAIgBAUIUChJfY29udmVydF9lbW90aWNvbnMiNQoNUmVhY3Rpb25FbW9qaRIPCgJpZBgBIAEoCUgAiAEBEgwKBG5hbWUYAiABKAlCBQoDX2lkKoIBChRQZXJtaXNzaW9uTGF5b3V0TW9kZRImCiJQRVJNSVNTSU9OX0xBWU9VVF9NT0RFX1VOU1BFQ0lGSUVEEAASIAocUEVSTUlTU0lPTl9MQVlPVVRfTU9ERV9DT01GWRABEiAKHFBFUk1JU1NJT05fTEFZT1VUX01PREVfREVOU0UQAip6ChJQZXJtaXNzaW9uR3JpZE1vZGUSJAogUEVSTUlTU0lPTl9HUklEX01PREVfVU5TUEVDSUZJRUQQABIfChtQRVJNSVNTSU9OX0dSSURfTU9ERV9TSU5HTEUQARIdChlQRVJNSVNTSU9OX0dSSURfTU9ERV9HUklEEAIqgAEKE0d1aWxkTWVtYmVyVmlld01vZGUSJgoiR1VJTERfTUVNQkVSX1ZJRVdfTU9ERV9VTlNQRUNJRklFRBAAEiAKHEdVSUxEX01FTUJFUl9WSUVXX01PREVfVEFCTEUQARIfChtHVUlMRF9NRU1CRVJfVklFV19NT0RFX0dSSUQQAipVCglNZmFNZXRob2QSGgoWTUZBX01FVEhPRF9VTlNQRUNJRklFRBAAEhMKD01GQV9NRVRIT0RfVE9UUBABEhcKE01GQV9NRVRIT0RfV0VCQVVUSE4QAyqJAQoPRG91YmxlVGFwQWN0aW9uEiEKHURPVUJMRV9UQVBfQUNUSU9OX1VOU1BFQ0lGSUVEEAASGwoXRE9VQkxFX1RBUF9BQ1RJT05fUkVBQ1QQARIaChZET1VCTEVfVEFQX0FDVElPTl9FRElUEAISGgoWRE9VQkxFX1RBUF9BQ1RJT05fTk9ORRADKmUKC1N3aXBlQWN0aW9uEhwKGFNXSVBFX0FDVElPTl9VTlNQRUNJRklFRBAAEiAKHFNXSVBFX0FDVElPTl9DSEFOTkVMX0RFVEFJTFMQARIWChJTV0lQRV9BQ1RJT05fUkVQTFkQAmIGcHJvdG8z", [file_nexus_user_preferences_v1_accessibility, file_nexus_user_preferences_v1_pickers]);

/**
 * @generated from message nexus.user.preferences.v1.SyncedPreferences
 */
export type SyncedPreferences = Message<"nexus.user.preferences.v1.SyncedPreferences"> & {
  /**
   * @generated from field: nexus.user.preferences.v1.AccessibilitySettings accessibility = 1;
   */
  accessibility?: AccessibilitySettings | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.AccessibilityOverrides accessibility_overrides = 2;
   */
  accessibilityOverrides?: AccessibilityOverrides | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.TextualPreviewSettings textual_preview = 3;
   */
  textualPreview?: TextualPreviewSettings | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.EmojiPickerState emoji_picker = 20;
   */
  emojiPicker?: EmojiPickerState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.StickerPickerState sticker_picker = 21;
   */
  stickerPicker?: StickerPickerState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.MemesPickerState memes_picker = 22;
   */
  memesPicker?: MemesPickerState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.EmojiState emoji = 23;
   */
  emoji?: EmojiState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.EmojiStickerLayoutSettings emoji_sticker_layout = 24;
   */
  emojiStickerLayout?: EmojiStickerLayoutSettings | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.FavoriteGifSettings favorite_gifs = 25;
   */
  favoriteGifs?: FavoriteGifSettings | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.FavoritesState favorites = 40;
   */
  favorites?: FavoritesState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.RecentMentionsSettings recent_mentions = 41;
   */
  recentMentions?: RecentMentionsSettings | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.SidebarPreferences sidebar = 42;
   */
  sidebar?: SidebarPreferences | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.MemberListState member_list = 43;
   */
  memberList?: MemberListState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.UnreadChannelsState unread_channels = 44;
   */
  unreadChannels?: UnreadChannelsState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.MentionFrecencyState mention_frecency = 45;
   */
  mentionFrecency?: MentionFrecencyState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.NagbarDismissals nagbars = 60;
   */
  nagbars?: NagbarDismissals | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.DismissedUpsells dismissed_upsells = 61;
   */
  dismissedUpsells?: DismissedUpsells | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.GuildNsfwAgreements guild_nsfw_agreements = 62;
   */
  guildNsfwAgreements?: GuildNsfwAgreements | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.WhatsNewState whats_new = 63;
   */
  whatsNew?: WhatsNewState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.PrivacyPreferences privacy = 80;
   */
  privacy?: PrivacyPreferences | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.LocalUserSpamOverrides local_spam_overrides = 81;
   */
  localSpamOverrides?: LocalUserSpamOverrides | undefined;

  /**
   * @generated from field: bool sanitize_urls = 82;
   */
  sanitizeUrls: boolean;

  /**
   * @generated from field: nexus.user.preferences.v1.SoundSettings sound = 100;
   */
  sound?: SoundSettings | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.SpellcheckSettings spellcheck = 101;
   */
  spellcheck?: SpellcheckSettings | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.SearchEngineSettings search_engines = 102;
   */
  searchEngines?: SearchEngineSettings | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.PermissionLayoutSettings permission_layout = 103;
   */
  permissionLayout?: PermissionLayoutSettings | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.GuildMemberLayoutSettings guild_member_layout = 104;
   */
  guildMemberLayout?: GuildMemberLayoutSettings | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.GuildFolderExpandedState guild_folders = 105;
   */
  guildFolders?: GuildFolderExpandedState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.HiddenGuildListButtons hidden_guild_buttons = 106;
   */
  hiddenGuildButtons?: HiddenGuildListButtons | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.KeyboardModeIntroState keyboard_mode_intro = 107;
   */
  keyboardModeIntro?: KeyboardModeIntroState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.InputMonitoringPromptsState input_monitoring = 108;
   */
  inputMonitoring?: InputMonitoringPromptsState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.VoicePromptsState voice_prompts = 109;
   */
  voicePrompts?: VoicePromptsState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.SudoPromptState sudo_prompt = 110;
   */
  sudoPrompt?: SudoPromptState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.KeybindSettings keybinds = 111;
   */
  keybinds?: KeybindSettings | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.ChatInputSettings chat_input = 112;
   */
  chatInput?: ChatInputSettings | undefined;

  /**
   * @generated from field: optional bool save_camera_uploads_to_device = 113;
   */
  saveCameraUploadsToDevice?: boolean | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.ReactionEmoji double_tap_reaction = 114;
   */
  doubleTapReaction?: ReactionEmoji | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.ChannelFrecencyState channel_frecency = 115;
   */
  channelFrecency?: ChannelFrecencyState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.AnnouncementPromptsState announcement_prompts = 116;
   */
  announcementPrompts?: AnnouncementPromptsState | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.DoubleTapAction double_tap_action = 117;
   */
  doubleTapAction: DoubleTapAction;

  /**
   * @generated from field: nexus.user.preferences.v1.SwipeAction swipe_right_to_left_action = 118;
   */
  swipeRightToLeftAction: SwipeAction;
};

/**
 * Describes the message nexus.user.preferences.v1.SyncedPreferences.
 * Use `create(SyncedPreferencesSchema)` to create a new message.
 */
export const SyncedPreferencesSchema: GenMessage<SyncedPreferences> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 0);

/**
 * @generated from message nexus.user.preferences.v1.SpellcheckSettings
 */
export type SpellcheckSettings = Message<"nexus.user.preferences.v1.SpellcheckSettings"> & {
  /**
   * @generated from field: optional bool enabled = 1;
   */
  enabled?: boolean | undefined;

  /**
   * @generated from field: repeated string languages = 2;
   */
  languages: string[];

  /**
   * @generated from field: repeated string personal_dictionary = 3;
   */
  personalDictionary: string[];

  /**
   * @generated from field: optional bool auto_detect = 4;
   */
  autoDetect?: boolean | undefined;

  /**
   * @generated from field: optional string engine = 5;
   */
  engine?: string | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.SpellcheckSettings.
 * Use `create(SpellcheckSettingsSchema)` to create a new message.
 */
export const SpellcheckSettingsSchema: GenMessage<SpellcheckSettings> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 1);

/**
 * @generated from message nexus.user.preferences.v1.SearchEngineSettings
 */
export type SearchEngineSettings = Message<"nexus.user.preferences.v1.SearchEngineSettings"> & {
  /**
   * @generated from field: optional string text_search_engine_id = 1;
   */
  textSearchEngineId?: string | undefined;

  /**
   * @generated from field: optional string reverse_image_search_engine_id = 2;
   */
  reverseImageSearchEngineId?: string | undefined;

  /**
   * @generated from field: optional string translation_provider_id = 3;
   */
  translationProviderId?: string | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.SearchEngineSettings.
 * Use `create(SearchEngineSettingsSchema)` to create a new message.
 */
export const SearchEngineSettingsSchema: GenMessage<SearchEngineSettings> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 2);

/**
 * @generated from message nexus.user.preferences.v1.PrivacyPreferences
 */
export type PrivacyPreferences = Message<"nexus.user.preferences.v1.PrivacyPreferences"> & {
  /**
   * @generated from field: bool disable_stream_previews = 1;
   */
  disableStreamPreviews: boolean;

  /**
   * @generated from field: optional bool show_active_now = 2;
   */
  showActiveNow?: boolean | undefined;

  /**
   * @generated from field: optional bool preupload_message_attachments = 3;
   */
  preuploadMessageAttachments?: boolean | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.PrivacyPreferences.
 * Use `create(PrivacyPreferencesSchema)` to create a new message.
 */
export const PrivacyPreferencesSchema: GenMessage<PrivacyPreferences> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 3);

/**
 * @generated from message nexus.user.preferences.v1.LocalUserSpamOverrides
 */
export type LocalUserSpamOverrides = Message<"nexus.user.preferences.v1.LocalUserSpamOverrides"> & {
  /**
   * @generated from field: repeated string spammer_user_ids = 1;
   */
  spammerUserIds: string[];

  /**
   * @generated from field: repeated string not_spammer_user_ids = 2;
   */
  notSpammerUserIds: string[];
};

/**
 * Describes the message nexus.user.preferences.v1.LocalUserSpamOverrides.
 * Use `create(LocalUserSpamOverridesSchema)` to create a new message.
 */
export const LocalUserSpamOverridesSchema: GenMessage<LocalUserSpamOverrides> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 4);

/**
 * @generated from message nexus.user.preferences.v1.TextualPreviewSettings
 */
export type TextualPreviewSettings = Message<"nexus.user.preferences.v1.TextualPreviewSettings"> & {
  /**
   * @generated from field: bool wrap_text = 1;
   */
  wrapText: boolean;
};

/**
 * Describes the message nexus.user.preferences.v1.TextualPreviewSettings.
 * Use `create(TextualPreviewSettingsSchema)` to create a new message.
 */
export const TextualPreviewSettingsSchema: GenMessage<TextualPreviewSettings> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 5);

/**
 * @generated from message nexus.user.preferences.v1.SidebarPreferences
 */
export type SidebarPreferences = Message<"nexus.user.preferences.v1.SidebarPreferences"> & {
  /**
   * @generated from field: bool inline_dms_collapsed = 1;
   */
  inlineDmsCollapsed: boolean;

  /**
   * @generated from field: optional bool show_collapsed_unread_dms_badge = 2;
   */
  showCollapsedUnreadDmsBadge?: boolean | undefined;

  /**
   * @generated from field: optional bool show_incoming_friend_request_badge = 3;
   */
  showIncomingFriendRequestBadge?: boolean | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.SidebarPreferences.
 * Use `create(SidebarPreferencesSchema)` to create a new message.
 */
export const SidebarPreferencesSchema: GenMessage<SidebarPreferences> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 6);

/**
 * @generated from message nexus.user.preferences.v1.MemberListState
 */
export type MemberListState = Message<"nexus.user.preferences.v1.MemberListState"> & {
  /**
   * @generated from field: optional bool members_open = 1;
   */
  membersOpen?: boolean | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.MemberListState.
 * Use `create(MemberListStateSchema)` to create a new message.
 */
export const MemberListStateSchema: GenMessage<MemberListState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 7);

/**
 * @generated from message nexus.user.preferences.v1.UnreadChannelsState
 */
export type UnreadChannelsState = Message<"nexus.user.preferences.v1.UnreadChannelsState"> & {
  /**
   * @generated from field: repeated string collapsed_channel_ids = 1;
   */
  collapsedChannelIds: string[];
};

/**
 * Describes the message nexus.user.preferences.v1.UnreadChannelsState.
 * Use `create(UnreadChannelsStateSchema)` to create a new message.
 */
export const UnreadChannelsStateSchema: GenMessage<UnreadChannelsState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 8);

/**
 * @generated from message nexus.user.preferences.v1.RecentMentionsSettings
 */
export type RecentMentionsSettings = Message<"nexus.user.preferences.v1.RecentMentionsSettings"> & {
  /**
   * @generated from field: optional bool include_everyone = 1;
   */
  includeEveryone?: boolean | undefined;

  /**
   * @generated from field: optional bool include_roles = 2;
   */
  includeRoles?: boolean | undefined;

  /**
   * @generated from field: optional bool include_guilds = 3;
   */
  includeGuilds?: boolean | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.RecentMentionsSettings.
 * Use `create(RecentMentionsSettingsSchema)` to create a new message.
 */
export const RecentMentionsSettingsSchema: GenMessage<RecentMentionsSettings> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 9);

/**
 * @generated from message nexus.user.preferences.v1.MentionFrecencyState
 */
export type MentionFrecencyState = Message<"nexus.user.preferences.v1.MentionFrecencyState"> & {
  /**
   * @generated from field: repeated nexus.user.preferences.v1.MentionFrecencyState.Scope scopes = 1;
   */
  scopes: MentionFrecencyState_Scope[];
};

/**
 * Describes the message nexus.user.preferences.v1.MentionFrecencyState.
 * Use `create(MentionFrecencyStateSchema)` to create a new message.
 */
export const MentionFrecencyStateSchema: GenMessage<MentionFrecencyState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 10);

/**
 * @generated from message nexus.user.preferences.v1.MentionFrecencyState.Entry
 */
export type MentionFrecencyState_Entry = Message<"nexus.user.preferences.v1.MentionFrecencyState.Entry"> & {
  /**
   * @generated from field: string user_id = 1;
   */
  userId: string;

  /**
   * @generated from field: uint32 count = 2;
   */
  count: number;

  /**
   * @generated from field: int64 last_at_ms = 3;
   */
  lastAtMs: bigint;
};

/**
 * Describes the message nexus.user.preferences.v1.MentionFrecencyState.Entry.
 * Use `create(MentionFrecencyState_EntrySchema)` to create a new message.
 */
export const MentionFrecencyState_EntrySchema: GenMessage<MentionFrecencyState_Entry> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 10, 0);

/**
 * @generated from message nexus.user.preferences.v1.MentionFrecencyState.Scope
 */
export type MentionFrecencyState_Scope = Message<"nexus.user.preferences.v1.MentionFrecencyState.Scope"> & {
  /**
   * @generated from field: string guild_id = 1;
   */
  guildId: string;

  /**
   * @generated from field: repeated nexus.user.preferences.v1.MentionFrecencyState.Entry entries = 2;
   */
  entries: MentionFrecencyState_Entry[];
};

/**
 * Describes the message nexus.user.preferences.v1.MentionFrecencyState.Scope.
 * Use `create(MentionFrecencyState_ScopeSchema)` to create a new message.
 */
export const MentionFrecencyState_ScopeSchema: GenMessage<MentionFrecencyState_Scope> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 10, 1);

/**
 * @generated from message nexus.user.preferences.v1.FavoritesState
 */
export type FavoritesState = Message<"nexus.user.preferences.v1.FavoritesState"> & {
  /**
   * @generated from field: repeated nexus.user.preferences.v1.FavoriteChannel channels = 1;
   */
  channels: FavoriteChannel[];

  /**
   * @generated from field: repeated nexus.user.preferences.v1.FavoriteCategory categories = 2;
   */
  categories: FavoriteCategory[];

  /**
   * @generated from field: repeated string collapsed_category_ids = 3;
   */
  collapsedCategoryIds: string[];

  /**
   * @generated from field: bool hide_muted_channels = 4;
   */
  hideMutedChannels: boolean;

  /**
   * @generated from field: bool muted = 5;
   */
  muted: boolean;
};

/**
 * Describes the message nexus.user.preferences.v1.FavoritesState.
 * Use `create(FavoritesStateSchema)` to create a new message.
 */
export const FavoritesStateSchema: GenMessage<FavoritesState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 11);

/**
 * @generated from message nexus.user.preferences.v1.FavoriteChannel
 */
export type FavoriteChannel = Message<"nexus.user.preferences.v1.FavoriteChannel"> & {
  /**
   * @generated from field: string channel_id = 1;
   */
  channelId: string;

  /**
   * @generated from field: string guild_id = 2;
   */
  guildId: string;

  /**
   * @generated from field: optional string parent_id = 3;
   */
  parentId?: string | undefined;

  /**
   * @generated from field: int32 position = 4;
   */
  position: number;

  /**
   * @generated from field: optional string nickname = 5;
   */
  nickname?: string | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.FavoriteChannel.
 * Use `create(FavoriteChannelSchema)` to create a new message.
 */
export const FavoriteChannelSchema: GenMessage<FavoriteChannel> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 12);

/**
 * @generated from message nexus.user.preferences.v1.FavoriteCategory
 */
export type FavoriteCategory = Message<"nexus.user.preferences.v1.FavoriteCategory"> & {
  /**
   * @generated from field: string id = 1;
   */
  id: string;

  /**
   * @generated from field: string name = 2;
   */
  name: string;

  /**
   * @generated from field: int32 position = 3;
   */
  position: number;
};

/**
 * Describes the message nexus.user.preferences.v1.FavoriteCategory.
 * Use `create(FavoriteCategorySchema)` to create a new message.
 */
export const FavoriteCategorySchema: GenMessage<FavoriteCategory> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 13);

/**
 * @generated from message nexus.user.preferences.v1.NagbarDismissals
 */
export type NagbarDismissals = Message<"nexus.user.preferences.v1.NagbarDismissals"> & {
  /**
   * @generated from field: bool ios_install = 1;
   */
  iosInstall: boolean;

  /**
   * @generated from field: bool pwa_install = 2;
   */
  pwaInstall: boolean;

  /**
   * @generated from field: bool push_notification = 3;
   */
  pushNotification: boolean;

  /**
   * @generated from field: bool desktop_notification = 4;
   */
  desktopNotification: boolean;

  /**
   * @generated from field: bool premium_grace_period = 5;
   */
  premiumGracePeriod: boolean;

  /**
   * @generated from field: bool premium_expired = 6;
   */
  premiumExpired: boolean;

  /**
   * @generated from field: bool premium_onboarding = 7;
   */
  premiumOnboarding: boolean;

  /**
   * @generated from field: bool premium_trial_expiring = 8;
   */
  premiumTrialExpiring: boolean;

  /**
   * @generated from field: bool gift_inventory = 9;
   */
  giftInventory: boolean;

  /**
   * @generated from field: bool desktop_download = 10;
   */
  desktopDownload: boolean;

  /**
   * @generated from field: bool guild_membership_cta = 11;
   */
  guildMembershipCta: boolean;

  /**
   * @generated from field: bool visionary_mfa = 12;
   */
  visionaryMfa: boolean;

  /**
   * @generated from field: map<string, bool> pending_bulk_deletion = 15;
   */
  pendingBulkDeletion: { [key: string]: boolean };

  /**
   * @generated from field: map<string, bool> invites_disabled = 16;
   */
  invitesDisabled: { [key: string]: boolean };

  /**
   * @generated from field: map<string, bool> guild_mfa_requirement = 17;
   */
  guildMfaRequirement: { [key: string]: boolean };

  /**
   * @generated from field: map<string, bool> price_announcement = 18;
   */
  priceAnnouncement: { [key: string]: boolean };

  /**
   * @generated from field: map<string, bool> legacy_price_opt_in = 19;
   */
  legacyPriceOptIn: { [key: string]: boolean };
};

/**
 * Describes the message nexus.user.preferences.v1.NagbarDismissals.
 * Use `create(NagbarDismissalsSchema)` to create a new message.
 */
export const NagbarDismissalsSchema: GenMessage<NagbarDismissals> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 14);

/**
 * @generated from message nexus.user.preferences.v1.DismissedUpsells
 */
export type DismissedUpsells = Message<"nexus.user.preferences.v1.DismissedUpsells"> & {
  /**
   * @generated from field: bool picker_premium = 1;
   */
  pickerPremium: boolean;
};

/**
 * Describes the message nexus.user.preferences.v1.DismissedUpsells.
 * Use `create(DismissedUpsellsSchema)` to create a new message.
 */
export const DismissedUpsellsSchema: GenMessage<DismissedUpsells> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 15);

/**
 * @generated from message nexus.user.preferences.v1.GuildNsfwAgreements
 */
export type GuildNsfwAgreements = Message<"nexus.user.preferences.v1.GuildNsfwAgreements"> & {
  /**
   * @generated from field: repeated string agreed_channel_ids = 1;
   */
  agreedChannelIds: string[];

  /**
   * @generated from field: repeated string agreed_guild_ids = 2;
   */
  agreedGuildIds: string[];

  /**
   * @generated from field: repeated string agreed_category_ids = 3;
   */
  agreedCategoryIds: string[];
};

/**
 * Describes the message nexus.user.preferences.v1.GuildNsfwAgreements.
 * Use `create(GuildNsfwAgreementsSchema)` to create a new message.
 */
export const GuildNsfwAgreementsSchema: GenMessage<GuildNsfwAgreements> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 16);

/**
 * @generated from message nexus.user.preferences.v1.WhatsNewState
 */
export type WhatsNewState = Message<"nexus.user.preferences.v1.WhatsNewState"> & {
  /**
   * @generated from field: optional string last_dismissed_entry_id = 1;
   */
  lastDismissedEntryId?: string | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.WhatsNewState.
 * Use `create(WhatsNewStateSchema)` to create a new message.
 */
export const WhatsNewStateSchema: GenMessage<WhatsNewState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 17);

/**
 * @generated from message nexus.user.preferences.v1.PermissionLayoutSettings
 */
export type PermissionLayoutSettings = Message<"nexus.user.preferences.v1.PermissionLayoutSettings"> & {
  /**
   * @generated from field: nexus.user.preferences.v1.PermissionLayoutMode layout = 1;
   */
  layout: PermissionLayoutMode;

  /**
   * @generated from field: nexus.user.preferences.v1.PermissionGridMode grid = 2;
   */
  grid: PermissionGridMode;
};

/**
 * Describes the message nexus.user.preferences.v1.PermissionLayoutSettings.
 * Use `create(PermissionLayoutSettingsSchema)` to create a new message.
 */
export const PermissionLayoutSettingsSchema: GenMessage<PermissionLayoutSettings> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 18);

/**
 * @generated from message nexus.user.preferences.v1.GuildMemberLayoutSettings
 */
export type GuildMemberLayoutSettings = Message<"nexus.user.preferences.v1.GuildMemberLayoutSettings"> & {
  /**
   * @generated from field: nexus.user.preferences.v1.GuildMemberViewMode mode = 1;
   */
  mode: GuildMemberViewMode;
};

/**
 * Describes the message nexus.user.preferences.v1.GuildMemberLayoutSettings.
 * Use `create(GuildMemberLayoutSettingsSchema)` to create a new message.
 */
export const GuildMemberLayoutSettingsSchema: GenMessage<GuildMemberLayoutSettings> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 19);

/**
 * @generated from message nexus.user.preferences.v1.GuildFolderExpandedState
 */
export type GuildFolderExpandedState = Message<"nexus.user.preferences.v1.GuildFolderExpandedState"> & {
  /**
   * @generated from field: repeated fixed64 expanded_folder_ids = 1;
   */
  expandedFolderIds: bigint[];
};

/**
 * Describes the message nexus.user.preferences.v1.GuildFolderExpandedState.
 * Use `create(GuildFolderExpandedStateSchema)` to create a new message.
 */
export const GuildFolderExpandedStateSchema: GenMessage<GuildFolderExpandedState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 20);

/**
 * @generated from message nexus.user.preferences.v1.HiddenGuildListButtons
 */
export type HiddenGuildListButtons = Message<"nexus.user.preferences.v1.HiddenGuildListButtons"> & {
  /**
   * @generated from field: bool download_button = 1;
   */
  downloadButton: boolean;

  /**
   * @generated from field: bool help_button = 2;
   */
  helpButton: boolean;
};

/**
 * Describes the message nexus.user.preferences.v1.HiddenGuildListButtons.
 * Use `create(HiddenGuildListButtonsSchema)` to create a new message.
 */
export const HiddenGuildListButtonsSchema: GenMessage<HiddenGuildListButtons> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 21);

/**
 * @generated from message nexus.user.preferences.v1.KeyboardModeIntroState
 */
export type KeyboardModeIntroState = Message<"nexus.user.preferences.v1.KeyboardModeIntroState"> & {
  /**
   * @generated from field: bool seen = 1;
   */
  seen: boolean;
};

/**
 * Describes the message nexus.user.preferences.v1.KeyboardModeIntroState.
 * Use `create(KeyboardModeIntroStateSchema)` to create a new message.
 */
export const KeyboardModeIntroStateSchema: GenMessage<KeyboardModeIntroState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 22);

/**
 * @generated from message nexus.user.preferences.v1.InputMonitoringPromptsState
 */
export type InputMonitoringPromptsState = Message<"nexus.user.preferences.v1.InputMonitoringPromptsState"> & {
  /**
   * @generated from field: bool seen_cta = 1;
   */
  seenCta: boolean;
};

/**
 * Describes the message nexus.user.preferences.v1.InputMonitoringPromptsState.
 * Use `create(InputMonitoringPromptsStateSchema)` to create a new message.
 */
export const InputMonitoringPromptsStateSchema: GenMessage<InputMonitoringPromptsState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 23);

/**
 * @generated from message nexus.user.preferences.v1.VoicePromptsState
 */
export type VoicePromptsState = Message<"nexus.user.preferences.v1.VoicePromptsState"> & {
  /**
   * @generated from field: bool skip_hide_own_camera_confirm = 1;
   */
  skipHideOwnCameraConfirm: boolean;

  /**
   * @generated from field: bool skip_hide_own_screenshare_confirm = 2;
   */
  skipHideOwnScreenshareConfirm: boolean;

  /**
   * @generated from field: bool skip_p2p_join_confirm = 3;
   */
  skipP2pJoinConfirm: boolean;
};

/**
 * Describes the message nexus.user.preferences.v1.VoicePromptsState.
 * Use `create(VoicePromptsStateSchema)` to create a new message.
 */
export const VoicePromptsStateSchema: GenMessage<VoicePromptsState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 24);

/**
 * @generated from message nexus.user.preferences.v1.AnnouncementPromptsState
 */
export type AnnouncementPromptsState = Message<"nexus.user.preferences.v1.AnnouncementPromptsState"> & {
  /**
   * @generated from field: bool hide_publish_nudge = 1;
   */
  hidePublishNudge: boolean;
};

/**
 * Describes the message nexus.user.preferences.v1.AnnouncementPromptsState.
 * Use `create(AnnouncementPromptsStateSchema)` to create a new message.
 */
export const AnnouncementPromptsStateSchema: GenMessage<AnnouncementPromptsState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 25);

/**
 * @generated from message nexus.user.preferences.v1.SudoPromptState
 */
export type SudoPromptState = Message<"nexus.user.preferences.v1.SudoPromptState"> & {
  /**
   * @generated from field: optional nexus.user.preferences.v1.MfaMethod last_used_mfa_method = 1;
   */
  lastUsedMfaMethod?: MfaMethod | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.SudoPromptState.
 * Use `create(SudoPromptStateSchema)` to create a new message.
 */
export const SudoPromptStateSchema: GenMessage<SudoPromptState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 26);

/**
 * @generated from message nexus.user.preferences.v1.KeybindSettings
 */
export type KeybindSettings = Message<"nexus.user.preferences.v1.KeybindSettings"> & {
  /**
   * @generated from field: repeated nexus.user.preferences.v1.CustomKeybind custom_keybinds = 1;
   */
  customKeybinds: CustomKeybind[];

  /**
   * @generated from field: string transmit_mode = 2;
   */
  transmitMode: string;

  /**
   * @generated from field: optional uint32 push_to_talk_release_delay_ms = 3;
   */
  pushToTalkReleaseDelayMs?: number | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.KeybindSettings.
 * Use `create(KeybindSettingsSchema)` to create a new message.
 */
export const KeybindSettingsSchema: GenMessage<KeybindSettings> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 27);

/**
 * @generated from message nexus.user.preferences.v1.CustomKeybind
 */
export type CustomKeybind = Message<"nexus.user.preferences.v1.CustomKeybind"> & {
  /**
   * @generated from field: string id = 1;
   */
  id: string;

  /**
   * @generated from field: optional string action = 2;
   */
  action?: string | undefined;

  /**
   * @generated from field: nexus.user.preferences.v1.KeybindCombo combo = 3;
   */
  combo?: KeybindCombo | undefined;

  /**
   * @generated from field: bool enabled = 4;
   */
  enabled: boolean;
};

/**
 * Describes the message nexus.user.preferences.v1.CustomKeybind.
 * Use `create(CustomKeybindSchema)` to create a new message.
 */
export const CustomKeybindSchema: GenMessage<CustomKeybind> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 28);

/**
 * @generated from message nexus.user.preferences.v1.KeybindCombo
 */
export type KeybindCombo = Message<"nexus.user.preferences.v1.KeybindCombo"> & {
  /**
   * @generated from field: string key = 1;
   */
  key: string;

  /**
   * @generated from field: optional string code = 2;
   */
  code?: string | undefined;

  /**
   * @generated from field: bool ctrl_or_meta = 3;
   */
  ctrlOrMeta: boolean;

  /**
   * @generated from field: bool ctrl = 4;
   */
  ctrl: boolean;

  /**
   * @generated from field: bool alt = 5;
   */
  alt: boolean;

  /**
   * @generated from field: bool shift = 6;
   */
  shift: boolean;

  /**
   * @generated from field: bool meta = 7;
   */
  meta: boolean;

  /**
   * @generated from field: optional bool global = 8;
   */
  global?: boolean | undefined;

  /**
   * @generated from field: optional bool enabled = 9;
   */
  enabled?: boolean | undefined;

  /**
   * @generated from field: bool modifier_only = 10;
   */
  modifierOnly: boolean;

  /**
   * @generated from field: bool both_sides = 11;
   */
  bothSides: boolean;

  /**
   * @generated from field: optional uint32 mouse_button = 12;
   */
  mouseButton?: number | undefined;

  /**
   * @generated from field: optional uint32 gamepad_button = 13;
   */
  gamepadButton?: number | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.KeybindCombo.
 * Use `create(KeybindComboSchema)` to create a new message.
 */
export const KeybindComboSchema: GenMessage<KeybindCombo> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 29);

/**
 * @generated from message nexus.user.preferences.v1.ChannelFrecencyEntry
 */
export type ChannelFrecencyEntry = Message<"nexus.user.preferences.v1.ChannelFrecencyEntry"> & {
  /**
   * @generated from field: uint32 total_uses = 1;
   */
  totalUses: number;

  /**
   * @generated from field: repeated int64 recent_uses_ms = 2;
   */
  recentUsesMs: bigint[];
};

/**
 * Describes the message nexus.user.preferences.v1.ChannelFrecencyEntry.
 * Use `create(ChannelFrecencyEntrySchema)` to create a new message.
 */
export const ChannelFrecencyEntrySchema: GenMessage<ChannelFrecencyEntry> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 30);

/**
 * @generated from message nexus.user.preferences.v1.ChannelFrecencyState
 */
export type ChannelFrecencyState = Message<"nexus.user.preferences.v1.ChannelFrecencyState"> & {
  /**
   * @generated from field: map<string, nexus.user.preferences.v1.ChannelFrecencyEntry> usage = 1;
   */
  usage: { [key: string]: ChannelFrecencyEntry };
};

/**
 * Describes the message nexus.user.preferences.v1.ChannelFrecencyState.
 * Use `create(ChannelFrecencyStateSchema)` to create a new message.
 */
export const ChannelFrecencyStateSchema: GenMessage<ChannelFrecencyState> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 31);

/**
 * @generated from message nexus.user.preferences.v1.ChatInputSettings
 */
export type ChatInputSettings = Message<"nexus.user.preferences.v1.ChatInputSettings"> & {
  /**
   * @generated from field: optional bool convert_emoticons = 1;
   */
  convertEmoticons?: boolean | undefined;
};

/**
 * Describes the message nexus.user.preferences.v1.ChatInputSettings.
 * Use `create(ChatInputSettingsSchema)` to create a new message.
 */
export const ChatInputSettingsSchema: GenMessage<ChatInputSettings> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 32);

/**
 * @generated from message nexus.user.preferences.v1.ReactionEmoji
 */
export type ReactionEmoji = Message<"nexus.user.preferences.v1.ReactionEmoji"> & {
  /**
   * @generated from field: optional string id = 1;
   */
  id?: string | undefined;

  /**
   * @generated from field: string name = 2;
   */
  name: string;
};

/**
 * Describes the message nexus.user.preferences.v1.ReactionEmoji.
 * Use `create(ReactionEmojiSchema)` to create a new message.
 */
export const ReactionEmojiSchema: GenMessage<ReactionEmoji> = /*@__PURE__*/
  messageDesc(file_nexus_user_preferences_v1_preferences, 33);

/**
 * @generated from enum nexus.user.preferences.v1.PermissionLayoutMode
 */
export enum PermissionLayoutMode {
  /**
   * @generated from enum value: PERMISSION_LAYOUT_MODE_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * @generated from enum value: PERMISSION_LAYOUT_MODE_COMFY = 1;
   */
  COMFY = 1,

  /**
   * @generated from enum value: PERMISSION_LAYOUT_MODE_DENSE = 2;
   */
  DENSE = 2,
}

/**
 * Describes the enum nexus.user.preferences.v1.PermissionLayoutMode.
 */
export const PermissionLayoutModeSchema: GenEnum<PermissionLayoutMode> = /*@__PURE__*/
  enumDesc(file_nexus_user_preferences_v1_preferences, 0);

/**
 * @generated from enum nexus.user.preferences.v1.PermissionGridMode
 */
export enum PermissionGridMode {
  /**
   * @generated from enum value: PERMISSION_GRID_MODE_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * @generated from enum value: PERMISSION_GRID_MODE_SINGLE = 1;
   */
  SINGLE = 1,

  /**
   * @generated from enum value: PERMISSION_GRID_MODE_GRID = 2;
   */
  GRID = 2,
}

/**
 * Describes the enum nexus.user.preferences.v1.PermissionGridMode.
 */
export const PermissionGridModeSchema: GenEnum<PermissionGridMode> = /*@__PURE__*/
  enumDesc(file_nexus_user_preferences_v1_preferences, 1);

/**
 * @generated from enum nexus.user.preferences.v1.GuildMemberViewMode
 */
export enum GuildMemberViewMode {
  /**
   * @generated from enum value: GUILD_MEMBER_VIEW_MODE_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * @generated from enum value: GUILD_MEMBER_VIEW_MODE_TABLE = 1;
   */
  TABLE = 1,

  /**
   * @generated from enum value: GUILD_MEMBER_VIEW_MODE_GRID = 2;
   */
  GRID = 2,
}

/**
 * Describes the enum nexus.user.preferences.v1.GuildMemberViewMode.
 */
export const GuildMemberViewModeSchema: GenEnum<GuildMemberViewMode> = /*@__PURE__*/
  enumDesc(file_nexus_user_preferences_v1_preferences, 2);

/**
 * @generated from enum nexus.user.preferences.v1.MfaMethod
 */
export enum MfaMethod {
  /**
   * @generated from enum value: MFA_METHOD_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * @generated from enum value: MFA_METHOD_TOTP = 1;
   */
  TOTP = 1,

  /**
   * @generated from enum value: MFA_METHOD_WEBAUTHN = 3;
   */
  WEBAUTHN = 3,
}

/**
 * Describes the enum nexus.user.preferences.v1.MfaMethod.
 */
export const MfaMethodSchema: GenEnum<MfaMethod> = /*@__PURE__*/
  enumDesc(file_nexus_user_preferences_v1_preferences, 3);

/**
 * @generated from enum nexus.user.preferences.v1.DoubleTapAction
 */
export enum DoubleTapAction {
  /**
   * @generated from enum value: DOUBLE_TAP_ACTION_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * @generated from enum value: DOUBLE_TAP_ACTION_REACT = 1;
   */
  REACT = 1,

  /**
   * @generated from enum value: DOUBLE_TAP_ACTION_EDIT = 2;
   */
  EDIT = 2,

  /**
   * @generated from enum value: DOUBLE_TAP_ACTION_NONE = 3;
   */
  NONE = 3,
}

/**
 * Describes the enum nexus.user.preferences.v1.DoubleTapAction.
 */
export const DoubleTapActionSchema: GenEnum<DoubleTapAction> = /*@__PURE__*/
  enumDesc(file_nexus_user_preferences_v1_preferences, 4);

/**
 * @generated from enum nexus.user.preferences.v1.SwipeAction
 */
export enum SwipeAction {
  /**
   * @generated from enum value: SWIPE_ACTION_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * @generated from enum value: SWIPE_ACTION_CHANNEL_DETAILS = 1;
   */
  CHANNEL_DETAILS = 1,

  /**
   * @generated from enum value: SWIPE_ACTION_REPLY = 2;
   */
  REPLY = 2,
}

/**
 * Describes the enum nexus.user.preferences.v1.SwipeAction.
 */
export const SwipeActionSchema: GenEnum<SwipeAction> = /*@__PURE__*/
  enumDesc(file_nexus_user_preferences_v1_preferences, 5);
