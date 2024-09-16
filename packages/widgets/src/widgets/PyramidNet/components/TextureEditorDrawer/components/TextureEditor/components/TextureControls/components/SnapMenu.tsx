import React, { useState } from 'react';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import {
  IconButton, Menu, MenuItem, Tooltip,
} from '@mui/material';
import { observer } from 'mobx-react';
import { range } from 'lodash-es';
import { assertNotNullish, useSelectedStore } from 'svg-widget-studio';
import type { PyramidNetWidgetModel } from '../../../../../../../models/PyramidNetWidgetStore';
import { TOUR_ELEMENT_CLASSES } from '../../../../../../../../../common/util/tour';

export const SnapMenu = observer(() => {
  // when truthy, snap menu is open
  const [positionSnapMenuAnchorEl, setPositionSnapMenuAnchorEl] = useState(null);

  const widgetModel = useSelectedStore<PyramidNetWidgetModel>();
  const { textureEditor } = widgetModel;
  assertNotNullish(textureEditor);
  const {
    faceDecoration, decorationBoundary,
    selectedTextureNodeIndex, showNodes,
  } = textureEditor;

  if (!faceDecoration || !decorationBoundary) {
    return null;
  }

  const numFaceSides = decorationBoundary.vertices.length;

  const handleCornerSnapMenuClick = (event) => {
    setPositionSnapMenuAnchorEl(event.currentTarget);
  };

  const resetPositionSnapMenuAnchorEl = () => { setPositionSnapMenuAnchorEl(null); };

  const fitTextureToFaceSnapMenuOnclick = () => {
    textureEditor.refitTextureToFace();
    resetPositionSnapMenuAnchorEl();
  };

  const textureOriginToFaceCenterSnapMenuOnclick = () => {
    textureEditor.repositionTextureWithOriginOverFaceCenter();
    resetPositionSnapMenuAnchorEl();
  };

  const textureOriginToCornerSnapMenuOnclick = (index) => {
    if (index !== undefined) {
      textureEditor.repositionTextureWithOriginOverCorner(index);
    }
    resetPositionSnapMenuAnchorEl();
  };

  const originToFaceCenterSnapMenuOnclick = () => {
    textureEditor.repositionOriginOverFaceCenter();
    resetPositionSnapMenuAnchorEl();
  };

  const originToTextureCenterSnapMenuOnclick = () => {
    textureEditor.repositionOriginOverTextureCenter();
    resetPositionSnapMenuAnchorEl();
  };

  const originToCornerSnapMenuOnclick = (index) => {
    if (index !== undefined) {
      textureEditor.repositionOriginOverCorner(index);
    }
    resetPositionSnapMenuAnchorEl();
  };

  const selectedNodeToCornerSnapMenuOnclick = (index) => {
    if (index !== undefined) {
      textureEditor.repositionSelectedNodeOverCorner(index);
    }
    resetPositionSnapMenuAnchorEl();
  };

  const selectedNodeToFaceCenterSnapMenuOnclick = () => {
    textureEditor.repositionSelectedNodeOverFaceCenter();
    resetPositionSnapMenuAnchorEl();
  };

  return (
    <>
      <Tooltip title="Snap...">
        <IconButton
          className={TOUR_ELEMENT_CLASSES.SNAP_MENU}
          aria-controls="simple-menu"
          aria-haspopup="true"
          onClick={handleCornerSnapMenuClick}
        >
          <TrackChangesIcon />
        </IconButton>
      </Tooltip>

      {/* ===================== SNAP MENU ===================== */}
      <Menu
        id="simple-menu"
        anchorEl={positionSnapMenuAnchorEl}
        keepMounted
        variant="menu"
        open={Boolean(positionSnapMenuAnchorEl)}
        onClose={() => {
          resetPositionSnapMenuAnchorEl();
        }}
      >
        <MenuItem
          onClick={() => {
            fitTextureToFaceSnapMenuOnclick();
          }}
        >
          Fit texture onto face
        </MenuItem>
        <MenuItem
          onClick={() => {
            textureOriginToFaceCenterSnapMenuOnclick();
          }}
        >
          Texture & origin to face center
        </MenuItem>
        {range(numFaceSides).map((index) => (
          <MenuItem
            key={index}
            onClick={() => {
              textureOriginToCornerSnapMenuOnclick(index);
            }}
          >
            Texture & origin to corner
            {' '}
            {index + 1}
          </MenuItem>
        ))}
        <MenuItem
          onClick={() => {
            originToFaceCenterSnapMenuOnclick();
          }}
        >
          Origin to face center
        </MenuItem>
        <MenuItem
          onClick={() => {
            originToTextureCenterSnapMenuOnclick();
          }}
        >
          Origin to texture center
        </MenuItem>
        {range(numFaceSides).map((index) => (
          <MenuItem
            key={index}
            onClick={() => {
              originToCornerSnapMenuOnclick(index);
            }}
          >
            Origin to corner
            {' '}
            {index + 1}
          </MenuItem>
        ))}

        {showNodes && selectedTextureNodeIndex !== null
          && [
            (
              <MenuItem
                onClick={() => {
                  selectedNodeToFaceCenterSnapMenuOnclick();
                }}
              >
                Selected node to face center
              </MenuItem>
            ),
            ...range(numFaceSides).map((index) => (
              <MenuItem
                key={index}
                onClick={() => {
                  selectedNodeToCornerSnapMenuOnclick(index);
                }}
              >
                Selected node to corner
                {' '}
                {index + 1}
              </MenuItem>
            )),
          ]}
      </Menu>
    </>
  );
});
