import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {Dialog, FocusButton} from '~/shared/ui';

const actions = (
  <FocusButton label="Keep testing" onPress={jest.fn()} variant="primary" />
);

describe('Dialog', () => {
  it('renders nothing when hidden', () => {
    render(
      <Dialog
        visible={false}
        title="Stop the test?"
        body="b"
        actions={actions}
      />,
    );
    expect(screen.queryByText('Stop the test?')).toBeNull();
  });

  it('renders title, body, actions and hint', () => {
    render(
      <Dialog
        visible
        title="Connection lost."
        body="Your TV dropped off the internet."
        actions={actions}
        hint="Waiting for connection…"
      />,
    );
    expect(screen.getByText('Connection lost.')).toBeTruthy();
    expect(screen.getByText('Your TV dropped off the internet.')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Keep testing'})).toBeTruthy();
    expect(screen.getByText('Waiting for connection…')).toBeTruthy();
  });

  it('omits the hint when not given', () => {
    render(<Dialog visible title="t" body="b" actions={actions} />);
    expect(screen.queryByText('Waiting for connection…')).toBeNull();
  });
});
