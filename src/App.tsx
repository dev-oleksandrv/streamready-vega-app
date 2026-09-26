import { Text, View } from 'react-native';
import { useEffect } from 'react';
import { useInsightsStore } from './modules/insights/useInsightsStore.ts';

export const App = () => {
  const insights = useInsightsStore((state) => state.data);
  const loadInsights = useInsightsStore((state) => state.loadInsights);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  return (
    <View>
      <Text style={{ color: 'white' }}>Hello world! {insights?.ip}</Text>
    </View>
  );
};
