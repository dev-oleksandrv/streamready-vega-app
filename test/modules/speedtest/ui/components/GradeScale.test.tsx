import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {GradeScale} from '~/modules/speedtest/ui/components/GradeScale';
import {colors} from '~/shared/ui';
import {flatStyle} from '../../../../support/style';

describe('GradeScale', () => {
  it('highlights only the active grade', () => {
    render(<GradeScale grade="C" activeColor={colors.amber} />);
    expect(flatStyle(screen.getByTestId('grade-C')).backgroundColor).toBe(
      colors.amber,
    );
    for (const other of ['A', 'B', 'D', 'F']) {
      expect(
        flatStyle(screen.getByTestId(`grade-${other}`)).backgroundColor,
      ).toBe(colors.surface);
    }
    expect(flatStyle(screen.getByText('C')).color).toBe(colors.onLime);
    expect(flatStyle(screen.getByText('A')).color).toBe(colors.textDisabled);
    expect(screen.getByText('Smooth')).toBeTruthy();
    expect(screen.getByText('Frequent stalls')).toBeTruthy();
  });
});
