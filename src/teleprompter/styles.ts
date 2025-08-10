import { StyleSheet } from 'react-native';

export const controlsStyles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  playButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  playing: {
    backgroundColor: '#FF2D55',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controlGroup: {
    marginVertical: 8,
  },
  label: {
    color: '#fff',
    marginBottom: 6,
  },
  secondaryButton: {
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#fff',
    fontSize: 14,
  },
  tintSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  tintSwatchActive: {
    borderColor: '#ffffff',
    borderWidth: 3,
  },
  rowSpaceBetween: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowSpaceBetweenTop: {
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rowSpaceAroundTop: {
    justifyContent: 'space-around',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 4,
  },
  wrapRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  alignRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  smallPad: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

export const viewStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    flex: 1,
  },
  guideLineWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideLine: {
    width: '90%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  text: {
    color: '#fff',
    textAlign: 'left',
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
});


