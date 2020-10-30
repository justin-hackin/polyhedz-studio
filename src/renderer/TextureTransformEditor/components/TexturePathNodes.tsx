import React from 'react';
import { observer } from 'mobx-react';
// @ts-ignore
import { PathData } from '../../DielineViewer/util/PathData';
import { useMst } from '../models';
import { useStyles } from '../style';

export const TexturePathNodes = observer(() => {
  const {
    texture, selectedTextureNodeIndex, setSelectedTextureNodeIndex, showNodes, imageCoverScale,
  } = useMst();
  const classes = useStyles();

  if (!texture.pathD || !showNodes) { return null; }
  const points = PathData.fromDValue(texture.pathD).getDestinationPoints();
  return (
    <>
      {
        points.map(([cx, cy], index) => (
          <g key={`${index}--${cx},${cy}`}>
            <circle
              {...{ cx, cy }}
              className={`${classes.textureNode} ${selectedTextureNodeIndex === index ? 'selected' : ''}`}
              stroke="none"
              r={(imageCoverScale.widthIsClamp ? texture.dimensions.width : texture.dimensions.height) / 500}
            />
            <circle
              {...{ cx, cy }}
              stroke="none"
              className={`${classes.textureNodeHighlight
              } ${index === selectedTextureNodeIndex ? 'selected' : undefined
              }`}
              r={(imageCoverScale.widthIsClamp ? texture.dimensions.width : texture.dimensions.height) / 100}
              onClick={() => {
                setSelectedTextureNodeIndex(index);
              }}
            />
          </g>
        ))
      }
    </>
  );
});
