// SPDX-License-Identifier: Nebula

export declare const sysctlByNameInt: ((name: string) => Promise<number | null>) | null;
export declare const sysctlByNameString: ((name: string) => Promise<string | null>) | null;
export declare const loadError: Error | null;
