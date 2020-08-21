import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup/ToggleButtonGroup';
import CachedIcon from '@material-ui/icons/Cached';
import OpenWithIcon from '@material-ui/icons/OpenWith';
import AspectRatioIcon from '@material-ui/icons/AspectRatio';
import ZoomOutMapIcon from '@material-ui/icons/ZoomOutMap';

import React from 'react';
import { DRAG_MODES } from '../dragMode';

export const DragModeOptionsGroup = ({ dragMode }) => (
  <ToggleButtonGroup
    value={dragMode}
    style={{ height: 'fit-content', margin: '0.5em' }}
    exclusive
    aria-label="drag mode"
  >
    {/* translate is too technical for end user */}
    <ToggleButton disabled value={DRAG_MODES.TRANSLATE} aria-label={DRAG_MODES.TRANSLATE}>
      <OpenWithIcon />
    </ToggleButton>
    <ToggleButton disabled value={DRAG_MODES.ROTATE} aria-label={DRAG_MODES.ROTATE}>
      <CachedIcon />
    </ToggleButton>
    <ToggleButton disabled value={DRAG_MODES.SCALE_TEXTURE} aria-label={DRAG_MODES.SCALE_TEXTURE}>
      <ZoomOutMapIcon />
    </ToggleButton>
    <ToggleButton disabled value={DRAG_MODES.SCALE_VIEW} aria-label={DRAG_MODES.SCALE_VIEW}>
      <AspectRatioIcon />
    </ToggleButton>
  </ToggleButtonGroup>
);