import React from 'react';

import {Dialog, FocusButton} from '~/shared/ui';

import {appContent as copy} from '../content';

export interface ExitDialogProps {
  visible: boolean;
  onStay: () => void;
  onExit: () => void;
}

export const ExitDialog = ({visible, onStay, onExit}: ExitDialogProps) => (
  <Dialog
    visible={visible}
    title={copy.exit.title}
    body={copy.exit.body}
    actions={
      <>
        <FocusButton
          label={copy.exit.stay}
          variant="primary"
          onPress={onStay}
          hasTVPreferredFocus
        />
        <FocusButton label={copy.exit.exit} onPress={onExit} />
      </>
    }
  />
);
