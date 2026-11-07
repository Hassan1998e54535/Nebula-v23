// SPDX-License-Identifier: Nebula

import Popout from '@app/features/ui/state/Popout';
import {reaction} from 'mobx';
import {useEffect, useMemo, useState} from 'react';

export function usePopout(uniqueId: string) {
	const [isOpen, setIsOpen] = useState(() => uniqueId in Popout.popouts);
	useEffect(() => {
		const dispose = reaction(
			() => uniqueId in Popout.popouts,
			(open) => {
				setIsOpen(open);
			},
			{fireImmediately: true},
		);
		return dispose;
	}, [uniqueId]);
	const openProps = useMemo(
		() => ({
			uniqueId,
		}),
		[uniqueId],
	);
	return {
		isOpen,
		openProps,
	};
}
