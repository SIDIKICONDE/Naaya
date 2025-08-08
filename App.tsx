import { StatusBar, StyleSheet, View } from 'react-native';
import { RealCameraViewScreen } from './src/screens/RealCameraViewScreen';

function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <RealCameraViewScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
