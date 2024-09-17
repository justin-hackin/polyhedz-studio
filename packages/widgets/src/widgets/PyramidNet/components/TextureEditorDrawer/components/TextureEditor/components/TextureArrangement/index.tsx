import React from 'react';
import { useDrag, useGesture } from '@use-gesture/react';
import { clamp } from 'lodash-es';
import { Paper } from '@mui/material';
import { observer } from 'mobx-react';
import { castCoordToRawPoint } from 'fluent-svg-path-ts';
import { boundingBoxAttrsToViewBoxStr, useWorkspaceMst } from 'svg-widget-studio';
import { assertNotNullish } from 'svg-widget-studio/src/helpers/assert';
import type { PyramidNetWidgetModel } from '../../../../../../models/PyramidNetWidgetStore';
import { incrementTransformTracking, TRANSFORM_METHODS, TRANSFORM_OPERATIONS } from '../../../../../../analytics';
import { TOUR_ELEMENT_CLASSES } from '../../../../../../../../common/util/tour';
import { DRAG_MODES } from '../../models/ModifierTrackingModel';
import { TextureSvg } from './components/TextureSvg';
import { DragModeOptionsGroup } from './components/DragModeOptionGroup';
import { RawFaceDecorationModel } from '../../../../../../models/RawFaceDecorationModel';

export const TextureArrangement = observer(() => {
  const workspaceStore = useWorkspaceMst();
  const pyramidNetPluginStore = workspaceStore.selectedStore as unknown as PyramidNetWidgetModel;
  const { textureEditor } = pyramidNetPluginStore;
  assertNotNullish(textureEditor);
  const {
    faceDecoration,
    placementAreaDimensions,
    decorationBoundary,
    minImageScale, maxImageScale,
    viewerModel,
  } = textureEditor;
  const {
    viewScalePercentStr,
    viewScaleCenterPercentStr,
    viewScaleDiff,
    modifierTracking: { dragMode = undefined } = {},
  } = viewerModel;

  // WARNING: Don't be tempted to use the setters on transformDiff, need withoutUndo as in texture.set*Diff methods
  const { transformDiff } = faceDecoration || {};
  // Init
  const textureTransformationUseDrag = useDrag(({ movement, down }) => {
    const movementPt = castCoordToRawPoint(movement);
    assertNotNullish(placementAreaDimensions);

    if (dragMode === DRAG_MODES.SCALE_VIEW) {
      if (down) {
        textureEditor.viewerModel.setViewScaleDiffClamped((movementPt.y / placementAreaDimensions.height) + 1);
      } else {
        textureEditor.viewerModel.reconcileViewScaleDiff();
        incrementTransformTracking(TRANSFORM_METHODS.DRAG, TRANSFORM_OPERATIONS.SCALE_VIEW);
      }
    }

    if (
      dragMode === DRAG_MODES.TRANSLATE
      || dragMode === DRAG_MODES.TRANSLATE_HORIZONTAL
      || dragMode === DRAG_MODES.TRANSLATE_VERTICAL
    ) {
      if (down) {
        const svgMovement = textureEditor.absoluteMovementToSvg(movementPt);
        if (dragMode === DRAG_MODES.TRANSLATE) {
          faceDecoration.setTranslateDiff(svgMovement);
        } else if (dragMode === DRAG_MODES.TRANSLATE_VERTICAL) {
          faceDecoration.setTranslateDiff({ x: 0, y: svgMovement.y });
        } else if (dragMode === DRAG_MODES.TRANSLATE_HORIZONTAL) {
          faceDecoration.setTranslateDiff({ x: svgMovement.x, y: 0 });
        }
      } else {
        // could lead to false categorization but it's unlikely that the drag diff would be exactly 0 for either axis
        // if dragMode is TRANSLATE
        const translateType = (transformDiff.translate.x === 0 || transformDiff.translate.y === 0)
          ? TRANSFORM_OPERATIONS.TRANSLATE_TEXTURE_ALONG_AXIS : TRANSFORM_OPERATIONS.TRANSLATE_TEXTURE;
        incrementTransformTracking(TRANSFORM_METHODS.DRAG, translateType);
        faceDecoration.reconcileTranslateDiff();
      }
    } else if (dragMode === DRAG_MODES.ROTATE) {
      if (down) {
        faceDecoration.setRotateDiff((movementPt.y / placementAreaDimensions.height) * 360);
      } else {
        faceDecoration.reconcileRotateDiff();
        // incrementTransformTracking(TRANSFORM_METHODS.DRAG, TRANSFORM_OPERATIONS.ROTATE_TEXTURE);
      }
    } else if (dragMode === DRAG_MODES.SCALE_TEXTURE) {
      if (down) {
        faceDecoration.setScaleDiff((movementPt.y / placementAreaDimensions.height) + 1);
      } else {
        faceDecoration.reconcileScaleDiff();
        incrementTransformTracking(TRANSFORM_METHODS.DRAG, TRANSFORM_OPERATIONS.SCALE_TEXTURE);
      }
    }
  });

  // ORIGIN
  const transformOriginUseDrag = useDrag(({ movement, down, event }) => {
    event?.stopPropagation();
    // accommodates the scale of svg so that the texture stays under the mouse
    const relDelta = textureEditor.translateAbsoluteCoordsToRelative(castCoordToRawPoint(movement));
    if (down) {
      faceDecoration.setTransformOriginDiff(castCoordToRawPoint(relDelta));
    } else {
      faceDecoration.reconcileTransformOriginDiff();
      incrementTransformTracking(TRANSFORM_METHODS.DRAG, TRANSFORM_OPERATIONS.DRAG_ORIGIN);
    }
  });

  // mouse wheel scale/rotate/zoom
  const viewUseWheel = useGesture({
    onWheel: ({ movement: [, y] }) => {
      if (!placementAreaDimensions || !decorationBoundary) { return; }
      const percentHeightDelta = (y / placementAreaDimensions.height);
      if (dragMode === DRAG_MODES.SCALE_VIEW) {
        const newViewScaleMux = (percentHeightDelta + 1) * viewScaleDiff;
        textureEditor.viewerModel.setViewScaleDiffClamped(newViewScaleMux);
        return;
      }
      if (!faceDecoration) { return; }
      if (dragMode === DRAG_MODES.ROTATE) {
        faceDecoration.setRotateDiff(transformDiff.rotate + percentHeightDelta * 90);
      } else if (dragMode === DRAG_MODES.SCALE_TEXTURE) {
        assertNotNullish(minImageScale);
        assertNotNullish(maxImageScale);
        faceDecoration.setScaleDiff(
          clamp((percentHeightDelta + 1) * transformDiff.scale, minImageScale, maxImageScale),
        );
      }
    },
    onWheelEnd: () => {
      if (!placementAreaDimensions || !decorationBoundary) { return; }
      if (dragMode === DRAG_MODES.SCALE_VIEW) {
        textureEditor.viewerModel.reconcileViewScaleDiff();
        incrementTransformTracking(TRANSFORM_METHODS.SCROLL, TRANSFORM_OPERATIONS.SCALE_VIEW);
      }
      if (!faceDecoration) { return; }
      if (dragMode === DRAG_MODES.ROTATE) {
        faceDecoration.reconcileRotateDiff();
        incrementTransformTracking(TRANSFORM_METHODS.SCROLL, TRANSFORM_OPERATIONS.ROTATE_TEXTURE);
      } else if (dragMode === DRAG_MODES.SCALE_TEXTURE) {
        faceDecoration.reconcileScaleDiff();
        incrementTransformTracking(TRANSFORM_METHODS.SCROLL, TRANSFORM_OPERATIONS.SCALE_TEXTURE);
      }
    },
  });

  if (!faceDecoration || faceDecoration instanceof RawFaceDecorationModel
    || !placementAreaDimensions || !decorationBoundary) {
    return null;
  }

  return (
    <div>
      <Paper
        className={TOUR_ELEMENT_CLASSES.TEXTURE_ARRANGEMENT_AREA}
        component="svg"
        square
        elevation={2}
        width="50%"
        height="100%"
        style={{ overflow: 'hidden', position: 'absolute' }}
        {...viewUseWheel()}
        {...textureTransformationUseDrag()}
      >
        <svg
          x={viewScaleCenterPercentStr}
          y={viewScaleCenterPercentStr}
          width={viewScalePercentStr}
          height={viewScalePercentStr}
          className="root-svg"
          viewBox={boundingBoxAttrsToViewBoxStr(decorationBoundary.boundingBoxAttrs)}
        >
          <TextureSvg {...{ transformOriginUseDrag, textureTransformationUseDrag }} />
        </svg>
      </Paper>
      <DragModeOptionsGroup dragMode={dragMode} />
    </div>
  );
});
