import React from 'react';
import { useGesture, useDrag } from 'react-use-gesture';
import { clamp } from 'lodash';
import { Paper } from '@material-ui/core';
import { observer } from 'mobx-react';

import { viewBoxAttrsToString } from '../../../common/util/svg';
import { TextureSvg } from './TextureSvg';
import { useMst } from '../models';
import { DRAG_MODES } from '../dragMode';

export const TextureArrangement = observer(({ dragMode }) => {
  const {
    placementAreaDimensions,
    absoluteMovementToSvg, translateAbsoluteCoordsToRelative,
    texture, decorationBoundary,
    viewScalePercentStr, viewScaleCenterPercentStr,
    minImageScale, maxImageScale,
    viewScaleDiff, setViewScaleDiff, reconcileViewScaleDiff,
  } = useMst() || {};
  const {
    setTranslateDiff, setRotateDiff, setScaleDiff, setTransformOriginDiff,
    reconcileTranslateDiff, reconcileRotateDiff, reconcileScaleDiff, reconcileTransformOriginDiff,
  } = texture || {};

  // Init
  const textureTranslationUseDrag = useDrag(({ movement, down }) => {
    // early exit not possible before hooks
    if (dragMode === DRAG_MODES.TRANSLATE) {
      if (down) {
        setTranslateDiff(absoluteMovementToSvg(movement));
      } else {
        reconcileTranslateDiff();
      }
    } else if (dragMode === DRAG_MODES.ROTATE) {
      if (down) {
        setRotateDiff((movement[1] / placementAreaDimensions.height) * 360);
      } else {
        reconcileRotateDiff();
      }
    } else if (dragMode === DRAG_MODES.SCALE_TEXTURE) {
      if (down) {
        setScaleDiff((movement[1] / placementAreaDimensions.height) + 1);
      } else {
        reconcileScaleDiff();
      }
    }
  });

  // ORIGIN
  const transformOriginUseDrag = useDrag(({ movement, down }) => {
    // accommodates the scale of svg so that the texture stays under the mouse
    const relDelta = translateAbsoluteCoordsToRelative(movement);
    if (down) {
      setTransformOriginDiff(relDelta);
    } else {
      reconcileTransformOriginDiff();
    }
  });


  // mouse wheel scale/rotate/zoom
  const viewUseWheel = useGesture({
    onWheel: ({ movement: [, y] }) => {
      if (!placementAreaDimensions || !decorationBoundary) { return; }
      const percentHeightDelta = (y / placementAreaDimensions.height);
      if (dragMode === DRAG_MODES.SCALE_VIEW) {
        const newViewScaleMux = (percentHeightDelta + 1) * viewScaleDiff;
        setViewScaleDiff(newViewScaleMux);
        return;
      }
      if (!texture) { return; }
      if (dragMode === DRAG_MODES.ROTATE) {
        setRotateDiff(texture.rotateDiff + percentHeightDelta * 90);
      } else if (dragMode === DRAG_MODES.SCALE_TEXTURE) {
        setScaleDiff(clamp((percentHeightDelta + 1) * texture.scaleDiff, minImageScale, maxImageScale));
      }
    },
    onWheelEnd: () => {
      if (!placementAreaDimensions || !decorationBoundary) { return; }
      if (dragMode === DRAG_MODES.SCALE_VIEW) {
        reconcileViewScaleDiff();
      }
      if (!texture) { return; }
      if (dragMode === DRAG_MODES.ROTATE) {
        reconcileRotateDiff();
      } else if (dragMode === DRAG_MODES.SCALE_TEXTURE) {
        reconcileScaleDiff();
      }
    },
  });
  return (
    <Paper
      // @ts-ignore
      component="svg"
      square
      elevation={5}
      className="svg-container"
      width="50%"
      height="100%"
      style={{ overflow: 'hidden', width: '50%' }}
      {...viewUseWheel()}
    >
      <svg
        x={viewScaleCenterPercentStr}
        y={viewScaleCenterPercentStr}
        width={viewScalePercentStr}
        height={viewScalePercentStr}
        className="root-svg"
        viewBox={viewBoxAttrsToString(decorationBoundary.viewBoxAttrs)}
      >
        <TextureSvg
          isOnScreen
          {...{
            textureTranslationUseDrag,
            transformOriginUseDrag,
          }}
        />
      </svg>
    </Paper>
  );
});
