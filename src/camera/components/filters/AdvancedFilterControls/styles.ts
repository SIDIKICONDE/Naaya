/**
 * Styles pour le composant principal AdvancedFilterControls
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    padding: 10,
    margin: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'stretch',
    flexGrow: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EDEDED',
    marginBottom: 8,
    textAlign: 'left',
  },
  scrollView: {
    flex: 1,
  },
});
