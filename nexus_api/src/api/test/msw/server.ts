// SPDX-License-Identifier: Nebula

import {createPwnedPasswordsRangeHandler} from '@app/api/test/msw/handlers/PwnedPasswordsHandlers';
import {setupServer} from 'msw/node';

export const server = setupServer(createPwnedPasswordsRangeHandler());
