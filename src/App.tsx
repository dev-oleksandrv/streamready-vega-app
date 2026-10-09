import React from 'react';

import {RootNavigator} from './app/navigation/RootNavigator';
import {AppProviders} from './app/providers/AppProviders';

export const App = () => (
  <AppProviders>
    <RootNavigator />
  </AppProviders>
);
