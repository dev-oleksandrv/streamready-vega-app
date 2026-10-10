import React from 'react';

import {Dialog, FocusButton} from '~/shared/ui';

import {testContent as copy} from '../../content';

export interface StopDialogProps {
  visible: boolean;
  onKeep: () => void;
  onStop: () => void;
}

export const StopDialog = ({visible, onKeep, onStop}: StopDialogProps) => (
  <Dialog
    visible={visible}
    title={copy.stop.title}
    body={copy.stop.body}
    actions={
      <>
        <FocusButton
          label={copy.stop.keep}
          variant="primary"
          onPress={onKeep}
          hasTVPreferredFocus
        />
        <FocusButton label={copy.stop.stop} onPress={onStop} />
      </>
    }
  />
);
