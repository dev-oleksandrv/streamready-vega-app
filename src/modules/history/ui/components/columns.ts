import {StyleSheet} from 'react-native';

import {scale} from '~/shared/ui';

/** Design column widths (px); the VPN column takes the rest. */
export const columns = StyleSheet.create({
  when: {width: scale(300)},
  download: {width: scale(160)},
  upload: {width: scale(140)},
  idle: {width: scale(130)},
  loaded: {width: scale(140)},
  grade: {width: scale(100)},
  ip: {width: scale(250)},
  country: {width: scale(250)},
  vpn: {flex: 1},
});
