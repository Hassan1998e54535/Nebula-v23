// SPDX-License-Identifier: Nebula

import {LoginRequired, DefaultUserOnly} from '@app/api/middleware/AuthMiddleware';
import {RateLimitMiddleware} from '@app/api/middleware/RateLimitMiddleware';
import {getEntityAssetService} from '@app/api/middleware/ServiceSingletons';
import {getSnowflakeService} from '@app/api/middleware/ServiceRegistry';
import {RateLimitConfigs} from '@app/api/RateLimitConfig';
import type {HonoApp} from '@app/api/types/HonoEnv';
import {Validator} from '@app/api/Validator';
import {createBase64ImageType} from '@nexus/schema/src/primitives/FileValidators';
import {z} from 'zod';

/**
 * Uploads artwork only. The existing profile PATCH remains the sole operation
 * that saves the selected nameplate; this never changes an avatar or banner.
 * Reuse the established image validation, metadata stripping, limits and CDN.
 */
export function UserNameplateAssetController(app: HonoApp) {
 app.post('/users/@me/nameplate-images',
  RateLimitMiddleware(RateLimitConfigs.USER_UPDATE_SELF),
  LoginRequired, DefaultUserOnly,
  Validator('json', z.object({image: createBase64ImageType()})),
  async (ctx) => {
   // Allocate a separate media identity: never overwrite or enqueue deletion
   // of the account's actual avatar/banner when this artwork is changed.
   const mediaId = await getSnowflakeService().generate();
   const prepared = await getEntityAssetService().prepareAssetUpload({
    assetType: 'banner', entityType: 'user', entityId: mediaId,
    previousHash: null, base64Image: ctx.req.valid('json').image, errorPath: 'image',
   });
   if (!prepared.newCdnUrl) throw new Error('Nameplate upload did not produce an image URL');
   return ctx.json({filename: prepared.newCdnUrl, animated: prepared.isAnimated});
  },
 );
}
