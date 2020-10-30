import { makeStyles, createStyles, Theme } from '@material-ui/core';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    backgroundColor:
        '#333',
    display: 'block',
    width: '100%',
    height: '100%',
    position: 'absolute',
    color: '#fff',
  },
  select: {
    display: 'flex', position: 'absolute', top: 0, right: 0,
  },
  rotationInput: {
    width: '6.5em',
  },
  loadingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    width: '100%',
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    zIndex: 100,
  },
  checkboxControlLabel: {
    color: '#fff',
  },
  unselectedTextureNodeHighlight: {
    fill: 'rgba(255, 0, 255, 0.00001)',
    '&:hover': {
      fill: 'rgba(255, 0, 255, 0.3)',
    },
  },
}));
