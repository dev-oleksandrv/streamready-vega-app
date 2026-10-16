import React, {useState} from 'react';

import {HistoryScreen} from '~/modules/history';

/** Back pops to Home or Result through the stack's default handling. */
export const HistoryRoute = () => {
  // Fixed while the screen is open: "Today" won't flip at midnight mid-view.
  const [now] = useState(Date.now);
  return <HistoryScreen now={now} />;
};
