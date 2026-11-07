// SPDX-License-Identifier: Nebula

import type {APIRoute} from 'astro';
import {installerChecksumResponse, powershellInstaller} from '@/installer/Installer';

export const prerender = false;

export const GET: APIRoute = () => installerChecksumResponse(powershellInstaller);
