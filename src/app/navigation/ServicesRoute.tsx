import type {NativeStackScreenProps} from '@amazon-devices/react-navigation__native-stack';
import React, {useCallback, useMemo} from 'react';

import {ServicesScreen, useSession} from '~/modules/speedtest';

import {selectServicesView, useResultVerdict} from '../selectors';
import type {RootStackParamList} from './routes';

export const ServicesRoute = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Services'>) => {
  const result = useSession((s) => s.result);
  const view = useResultVerdict(result);
  const back = useCallback(() => navigation.goBack(), [navigation]);
  const servicesView = useMemo(
    () =>
      result && view ? selectServicesView(result, view.verdict) : undefined,
    [result, view],
  );

  // Services only opens on top of Result, whose route leaves for Home when the
  // result is gone; until then there is nothing to draw.
  if (!servicesView) {
    return null;
  }
  return (
    <ServicesScreen
      rows={servicesView.rows}
      laggy={servicesView.laggy}
      onBack={back}
    />
  );
};
