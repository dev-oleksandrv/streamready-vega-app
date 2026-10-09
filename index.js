import {enableFreeze, enableScreens} from '@amazon-devices/react-native-screens';
import {AppRegistry} from 'react-native';
import {App} from './src/App';
import {name as appName} from './app.json';

enableScreens();
enableFreeze();

AppRegistry.registerComponent(appName, () => App);
