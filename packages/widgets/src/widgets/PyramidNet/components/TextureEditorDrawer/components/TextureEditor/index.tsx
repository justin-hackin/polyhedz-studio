import { observer } from 'mobx-react';
import React, { useEffect } from 'react';
import { styled, useTheme } from '@mui/styles';
import { assertNotNullish, FullPageDiv, useSelectedStore } from 'svg-widget-studio';
import { useResizeDetector } from 'react-resize-detector';
import { TextureControls } from './components/TextureControls';
import { TextureArrangement } from './components/TextureArrangement';
import { ShapePreview } from './components/ShapePreview';
import { RawFaceDecorationModel } from '../../../../models/RawFaceDecorationModel';
import type { PyramidNetWidgetModel } from '../../../../models/PyramidNetWidgetStore';

const classes = { mainArea: 'main-area' };
const TextureEditorRoot = styled(FullPageDiv)(({ theme }) => ({
  backgroundColor: theme.palette.grey.A400,
  height: '100%',
  color: theme.palette.grey['300'],
  [`& .${classes.mainArea}`]: {
    flex: '1 1 auto',
    display: 'grid',
    gridTemplateColumns: '50% 50%',
    gridTemplateRows: '100%',
    height: '100%',
    width: '100%',
  },
}));

export const TextureEditor = observer(() => {
  const pyramidNetPluginStore = useSelectedStore<PyramidNetWidgetModel>();
  const { textureEditor, history } = pyramidNetPluginStore;

  const { faceDecoration } = textureEditor || {};

  const { width, height, ref } = useResizeDetector();
  useEffect(() => {
    if (width && height) {
      textureEditor?.setPlacementAreaDimensions({
        width: width / 2,
        height,
      });
    }
  }, [width, height]);

  // assigned in onInit
  assertNotNullish(history);
  // ==================================================================================================================
  useTheme();
  // Init

  if (!pyramidNetPluginStore?.textureEditor || faceDecoration instanceof RawFaceDecorationModel) {
    return null;
  }
  // TODO: drag and drop functionality (post-electron)

  return (
    <TextureEditorRoot>
      <TextureControls />
      <div ref={ref} className={classes.mainArea}>
        <TextureArrangement />
        <ShapePreview />
      </div>
    </TextureEditorRoot>
  );
});
