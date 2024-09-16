import React from 'react';
import { observer } from 'mobx-react';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import { IconButton } from '@mui/material';
import { styled } from '@mui/styles';
import clsx from 'clsx';
import ReactDOMServer from 'react-dom/server';
import { boundingBoxAttrsToViewBoxStr, useWorkspaceMst } from 'svg-widget-studio';
import type { PyramidNetWidgetModel } from '../../../../../models/PyramidNetWidgetStore';
import { TOUR_ELEMENT_CLASSES } from '../../../../../../../common/util/tour';
import { PathFaceDecorationPatternModel } from '@/widgets/PyramidNet/models/PathFaceDecorationPatternModel';
import { RawFaceDecorationModel } from '@/widgets/PyramidNet/models/RawFaceDecorationModel';
import { ImageFaceDecorationPatternModel } from '@/widgets/PyramidNet/models/ImageFaceDecorationPatternModel';
import {
  TextureSvgUnobserved,
} from '@/widgets/PyramidNet/components/TextureEditorDrawer/components/TextureEditor/components/TextureArrangement/components/TextureSvg';

const classes = {
  enterFullScreenButton: 'shape-preview__enter-full-screen-button',
};

const WebContainer = styled('div')(({ theme }) => ({
  [`& .${classes.enterFullScreenButton}`]: {
    bottom: theme.spacing(1),
    right: theme.spacing(1),
    position: 'absolute',
  },
}));

const { useEffect, useRef } = React;

export const ShapePreview = observer(() => {
  const handle = useFullScreenHandle();
  const workspaceStore = useWorkspaceMst();

  const { textureEditor } = workspaceStore.selectedStore as unknown as PyramidNetWidgetModel;
  const { shapePreview } = textureEditor;
  const decorationPattern = textureEditor.faceDecoration?.pattern;
  const shapeNameVal = textureEditor.shapeName.value;
  const useAlphaTexturePreview = (decorationPattern as PathFaceDecorationPatternModel)?.useAlphaTexturePreview;
  const threeContainerRef = useRef<HTMLDivElement>(null);

  // THREE rendering setup
  useEffect(() => {
    if (!threeContainerRef?.current) { return; }
    textureEditor.createShapePreview(threeContainerRef.current);
  }, [threeContainerRef]);

  useEffect(() => {
    if (textureEditor.shapePreviewDimensions) {
      shapePreview?.setCanvasDimensions(textureEditor.shapePreviewDimensions);
    }
  }, [textureEditor.shapePreviewDimensions]);

  useEffect(() => {
    shapePreview?.setAutoRotate(textureEditor.autoRotatePreview);
  }, [textureEditor.autoRotatePreview]);

  useEffect(() => {
    shapePreview?.setUseAlpha(useAlphaTexturePreview || !decorationPattern);
  }, [useAlphaTexturePreview, decorationPattern]);

  useEffect(() => {
    textureEditor?.shapePreview?.setShape(shapeNameVal);
  }, [shapeNameVal]);

  useEffect(() => {
    const {
      faceDecoration = undefined,
      faceBoundary: { boundingBoxAttrs = undefined } = {},
    } = textureEditor;

    if (!shapePreview?.shapeMesh || !boundingBoxAttrs || faceDecoration instanceof RawFaceDecorationModel) {
      return;
    }

    const svgStr = ReactDOMServer.renderToString(
      React.createElement(TextureSvgUnobserved, {
        viewBox: boundingBoxAttrsToViewBoxStr(boundingBoxAttrs),
        store: textureEditor,
      }),
    );
    shapePreview?.applyTextureToMesh(svgStr, boundingBoxAttrs);
  }, (() => {
    const { faceDecoration, faceBoundary } = textureEditor;
    const listenProps:any[] = [shapePreview?.shapeMesh, faceBoundary];
    if (!faceDecoration || faceDecoration instanceof RawFaceDecorationModel) { return listenProps; }
    const { pattern, transform: { transformMatrix } } = faceDecoration;
    listenProps.push(transformMatrix);
    if (pattern instanceof PathFaceDecorationPatternModel) {
      listenProps.push(pattern.isPositive, pattern.pathD);
    } else if (pattern instanceof ImageFaceDecorationPatternModel) {
      listenProps.push(pattern.imageData, pattern.isBordered);
    }
    return listenProps;
  })());

  return (
    <WebContainer>
      <IconButton
        className={clsx(classes.enterFullScreenButton, TOUR_ELEMENT_CLASSES.FULL_SCREEN_BUTTON)}
        onClick={handle.enter}
        component="span"
        size="large"
      >
        <FullscreenIcon fontSize="large" />
      </IconButton>
      <FullScreen
        handle={handle}
        onChange={(isFullScreen) => {
          textureEditor.setShapePreviewIsFullScreen(isFullScreen);
        }}
      >
        <div
          ref={threeContainerRef}
          className={TOUR_ELEMENT_CLASSES.SHAPE_PREVIEW_AREA}
        />
      </FullScreen>
    </WebContainer>
  );
});
