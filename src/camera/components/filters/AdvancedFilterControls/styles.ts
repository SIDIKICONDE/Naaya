/**
 * Styles pour le composant principal AdvancedFilterControls
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 12,
    margin: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'stretch',
    flexGrow: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EEEEEE',
    marginBottom: 10,
    textAlign: 'left',
  },
  scrollView: {
    flex: 1,
  },
});
