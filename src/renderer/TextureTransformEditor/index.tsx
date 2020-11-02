/* eslint-disable no-param-reassign */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';

import { ThemeProvider } from '@material-ui/styles';
import { createMuiTheme } from '@material-ui/core/styles';
import { Box } from '@material-ui/core';

// @ts-ignore
import darkTheme from '../DielineViewer/data/material-ui-dark-theme.json';
// eslint-disable-next-line import/no-cycle
import { ShapePreview } from './components/ShapePreview';
import { TextureControls } from './components/TextureControls';
import { EVENTS } from '../../main/ipc';
import {
  useMst, Provider, textureTransformEditorStore,
} from './models';
import { useStyles } from './style';
import { TextureArrangement } from './components/TextureArrangement';
import { useDragMode } from './dragMode';

// TODO: make #texture-bounds based on path bounds and account for underflow, giving proportional margin
// TODO: make router wrap with styles
// @ts-ignore
export const theme = createMuiTheme(darkTheme);

const TextureTransformEditorLOC = observer(() => {
  const classes = useStyles();
  const dragMode = useDragMode();
  // ==================================================================================================================
  const {
    placementAreaDimensions, setPlacementAreaDimensions, decorationBoundary,
  } = useMst();

  // Init
  useEffect(() => {
    const resizeHandler = () => {
      const { outerWidth: width, outerHeight: height } = window;
      setPlacementAreaDimensions({ width: width / 2, height });
    };

    window.addEventListener('resize', resizeHandler);

    setTimeout(() => {
      resizeHandler();
    });

    globalThis.ipcRenderer.send(EVENTS.REQUEST_SHAPE_UPDATE);

    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  // TODO: drag and drop functionality, removed in fd71f4aba9dd4a698e5a2667595cff82c8fb5cf5
  // see commit message for rationale


  if (!placementAreaDimensions || !decorationBoundary) { return null; }
  // const { height: screenHeight = 0, width: screenWidth = 0 } = screenDimensions;

  return (
    <ThemeProvider theme={theme}>
      <Box className={classes.root}>
        <div style={{ position: 'absolute', left: '50%' }}>
          <ShapePreview />
        </div>
        <TextureArrangement dragMode={dragMode} />
        <TextureControls dragMode={dragMode} />
      </Box>
    </ThemeProvider>
  );
});

export const TextureTransformEditor = () => (
  <Provider value={textureTransformEditorStore}>
    <TextureTransformEditorLOC />
  </Provider>
);
