import type {ReactTestInstance} from 'react-test-renderer';

type StyleValue =
  | Record<string, unknown>
  | StyleValue[]
  | null
  | undefined
  | false;

/**
 * The kepler jest preset's StyleSheet.flatten mock returns style arrays as-is,
 * so RNTL's toHaveStyle can't see into them. This merges them like RN does.
 */
export function flatStyle(element: ReactTestInstance): Record<string, unknown> {
  const merge = (style: StyleValue): Record<string, unknown> =>
    Array.isArray(style)
      ? Object.assign({}, ...style.map(merge))
      : style
      ? {...style}
      : {};
  return merge(element.props.style as StyleValue);
}
