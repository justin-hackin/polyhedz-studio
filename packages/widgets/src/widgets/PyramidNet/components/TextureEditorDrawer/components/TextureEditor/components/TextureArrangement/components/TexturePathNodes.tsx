import React from 'react';
import { observer } from 'mobx-react';
import clsx from 'clsx';
import { styled } from '@mui/styles';
import { getDestinationPoints, PathData } from 'fluent-svg-path-ts';
import { assertNotNullish, useSelectedStore } from 'svg-widget-studio';
import type { PyramidNetWidgetModel } from '../../../../../../../models/PyramidNetWidgetStore';
import { ImageFaceDecorationPatternModel } from '../../../../../../../models/ImageFaceDecorationPatternModel';
import { RawFaceDecorationModel } from '../../../../../../../models/RawFaceDecorationModel';

const classes = {
  textureNode: 'texture-node',
  selected: 'texture-node--selected',
  highlight: 'texture-node-highlight',
};

const NodesGroup = styled('g')({
  [`& circle.${classes.textureNode}`]: {
    fill: '#00A9F4',
    '&:hover': {
      fill: 'purple',
    },
    [`&.${classes.selected}`]: {
      fill: '#ff00ff',
    },
  },

});

export const TexturePathNodes = observer(() => {
  const selectedStore = useSelectedStore<PyramidNetWidgetModel>();
  const { textureEditor } = selectedStore;
  assertNotNullish(textureEditor);
  const {
    faceDecoration, selectedTextureNodeIndex, showNodes, imageCoverScale, viewerModel,
  } = textureEditor;
  const { nodeScaleMux: { value: nodeScaleMux } } = viewerModel;

  if (
    !showNodes || faceDecoration instanceof RawFaceDecorationModel
    || faceDecoration.pattern instanceof ImageFaceDecorationPatternModel
    || !faceDecoration
    || !imageCoverScale
    || !faceDecoration.pattern
    || !faceDecoration.dimensions
  ) { return null; }
  const points = getDestinationPoints(new PathData(faceDecoration.pattern.pathD));
  return (
    <NodesGroup>
      {
        points.map(({ x: cx, y: cy }, index) => {
          const longerTextureSideLength = (imageCoverScale.widthIsClamp
            ? faceDecoration.dimensions?.width : faceDecoration.dimensions?.height) as number;
          return (
            <g key={`${index}--${cx},${cy}`}>
              <circle
                {...{ cx, cy }}
                className={clsx(classes.textureNode, (selectedTextureNodeIndex === index) && classes.selected)}
                stroke="none"
                r={(nodeScaleMux * longerTextureSideLength) / 100}
                onClick={() => {
                  textureEditor.setSelectedTextureNodeIndex(index);
                }}
              />
            </g>
          );
        })
      }
    </NodesGroup>
  );
});
