import React from 'react';

import {Dialog, FocusButton} from '~/shared/ui';

import {historyContent as copy} from '../../content';

export interface ClearHistoryDialogProps {
  visible: boolean;
  count: number;
  onKeep: () => void;
  onClear: () => void;
}

export const ClearHistoryDialog = ({
  visible,
  count,
  onKeep,
  onClear,
}: ClearHistoryDialogProps) => (
  <Dialog
    visible={visible}
    title={copy.confirm.title}
    body={copy.confirm.body(count)}
    actions={
      <>
        <FocusButton
          label={copy.confirm.keep}
          variant="primary"
          onPress={onKeep}
          hasTVPreferredFocus
        />
        <FocusButton label={copy.confirm.clear} onPress={onClear} />
      </>
    }
  />
);
