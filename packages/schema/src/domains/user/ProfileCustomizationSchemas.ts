// SPDX-License-Identifier: Nebula

import {z} from 'zod';

const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const NameEffectSettingsSchema = z.object({
	colors: z.array(HexColorSchema).max(5),
	direction: z.enum(['left', 'right', 'up', 'down']).optional(),
	speed: z.enum(['slow', 'normal', 'fast']).optional(),
	intensity: z.number().int().min(0).max(100).optional(),
});

const NameplateUploadSchema = z
	.object({
		filename: z.string().min(1).max(256),
		animated: z.boolean(),
	})
	.passthrough();

const ProfileAppearanceSchema = z
	.object({
		nameStyleEnabled: z.boolean(),
		nameColorEnabled: z.boolean().optional(),
		nameColorStart: HexColorSchema,
		nameColorEnd: HexColorSchema,
		nameFont: z.string().min(1).max(40),
		nameEffect: z.string().min(1).max(40),
		nameAnimation: z.string().min(1).max(40),
		nameEffectColors: z.record(z.string().max(40), z.array(HexColorSchema).max(5)).optional(),
		nameAnimationColors: z
			.record(z.string().max(40), z.record(z.string().max(40), z.array(HexColorSchema).max(5)))
			.optional(),
		nameEffects: z.record(z.string().max(40), NameEffectSettingsSchema).optional(),
		avatarDecoration: z.string().max(64),
		cardFrame: z.string().max(64),
		cardEffect: z.string().max(64),
		dividerMode: z.enum(['default', 'custom']),
		dividerCustomColor: HexColorSchema.nullable().optional(),
		profileBackgroundPrimary: HexColorSchema.optional(),
		profileBackgroundSecondary: HexColorSchema.optional(),
		coverPosition: z
			.object({
				x: z.number().min(0).max(100),
				y: z.number().min(0).max(100),
			})
			.optional(),
	})
	.passthrough();

const NameplateSettingsSchema = z
	.object({
		nameplate: z.string().max(64),
		nameplateImage: z.string().max(256).nullable(),
		nameplateCrop: z.record(z.string().max(32), z.number().finite().min(-1000).max(1000)).nullable(),
		nameplateUploads: z.array(NameplateUploadSchema).max(20),
	})
	.passthrough();

export const ProfileCustomizationSchema = z
	.object({
		appearance: ProfileAppearanceSchema,
		profileEffectId: z.string().max(128).nullable(),
		nameplateSettings: NameplateSettingsSchema,
	})
	.superRefine((value, context) => {
		if (JSON.stringify(value).length > 16_384) {
			context.addIssue({
				code: 'custom',
				message: 'Profile customization is too large',
			});
		}
	});

export type ProfileAppearance = z.infer<typeof ProfileAppearanceSchema>;
export type NameplateSettings = z.infer<typeof NameplateSettingsSchema>;
export type ProfileCustomization = z.infer<typeof ProfileCustomizationSchema>;

export const DEFAULT_PROFILE_CUSTOMIZATION: ProfileCustomization = {
	appearance: {
		nameStyleEnabled: false,
		nameColorEnabled: false,
		nameColorStart: '#48e6d0',
		nameColorEnd: '#7b8cff',
		nameFont: 'nexus',
		nameEffect: 'solid',
		nameAnimation: 'off',
		avatarDecoration: 'none',
		cardFrame: 'none',
		cardEffect: 'none',
		dividerMode: 'default',
		dividerCustomColor: null,
		coverPosition: {x: 50, y: 50},
	},
	profileEffectId: null,
	nameplateSettings: {
		nameplate: 'none',
		nameplateImage: null,
		nameplateCrop: null,
		nameplateUploads: [],
	},
};
