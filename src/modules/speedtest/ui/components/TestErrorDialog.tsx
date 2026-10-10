import React from 'react';

import {Dialog, FocusButton} from '~/shared/ui';

import {testContent as copy} from '../../content';
import type {TestErrorVariant} from '../../domain/errorVariant';

export interface TestErrorDialogProps {
  /** Hidden when undefined. */
  variant?: TestErrorVariant;
  offline: boolean;
  onRetry: () => void;
  onHome: () => void;
}

export const TestErrorDialog = ({
  variant,
  offline,
  onRetry,
  onHome,
}: TestErrorDialogProps) => {
  if (!variant) {
    return null;
  }
  // Retrying offline would fail at once; wait for the network instead.
  const waiting = variant === 'connectionLost' && offline;
  return (
    <Dialog
      visible
      title={copy.errors[variant].title}
      body={copy.errors[variant].body}
      hint={waiting ? copy.waiting : undefined}
      actions={
        <>
          <FocusButton
            label={copy.retry}
            variant="primary"
            disabled={waiting}
            onPress={onRetry}
            hasTVPreferredFocus
          />
          <FocusButton label={copy.home} onPress={onHome} />
        </>
      }
    />
  );
};
