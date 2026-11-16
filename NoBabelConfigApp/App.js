import {Platform, Text} from 'react-native';

const bundledFor = Platform.OS;

export default function App() {
  return <Text>Platform.OS: {bundledFor}</Text>;
}
