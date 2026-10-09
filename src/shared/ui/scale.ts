import {Dimensions} from 'react-native';

const DESIGN_WIDTH = 1920;

/** Converts a design pixel value (1920×1080 canvas) to device pixels. */
export function scale(px: number): number {
  return (px * Dimensions.get('window').width) / DESIGN_WIDTH;
}
