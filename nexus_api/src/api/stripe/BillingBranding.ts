// SPDX-License-Identifier: Nebula

import {Config} from '@app/api/Config';
import {getInstanceConfigRepository} from '@app/api/middleware/ServiceSingletons';

export interface BillingBranding {
	productName: string;
	premiumName: string;
	termsUrl: string;
	upiMandateDescription: string;
}

const HOSTED_PRODUCT_NAME = 'NEXUS';
const HOSTED_PREMIUM_NAME = 'Plutonium';
const HOSTED_UPI_MANDATE_DESCRIPTION = 'NEXUS Premium';

export async function getBillingBranding(): Promise<BillingBranding> {
	const marketingTermsUrl = `${Config.endpoints.marketing}/terms`;
	if (!Config.instance.selfHosted) {
		return {
			productName: HOSTED_PRODUCT_NAME,
			premiumName: HOSTED_PREMIUM_NAME,
			termsUrl: marketingTermsUrl,
			upiMandateDescription: HOSTED_UPI_MANDATE_DESCRIPTION,
		};
	}
	const appPublic = await getInstanceConfigRepository().getAppPublicConfig();
	const productName = appPublic.branding.product_name;
	const premiumName = appPublic.branding.premium_product_name;
	return {
		productName,
		premiumName,
		termsUrl: appPublic.legal.terms_url ?? marketingTermsUrl,
		upiMandateDescription: `${productName} ${premiumName}`,
	};
}
