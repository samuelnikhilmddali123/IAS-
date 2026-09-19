import { registerRootComponent } from 'expo';
import { TextInput } from 'react-native';
import App from './App';

// Globally disable Android landscape fullscreen extract UI keyboard on all TextInputs
if ((TextInput as any).defaultProps == null) {
  (TextInput as any).defaultProps = {};
}
(TextInput as any).defaultProps.disableFullscreenUI = true;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

