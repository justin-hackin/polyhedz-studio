import React from 'react';
import PropTypes from 'prop-types';
import OpenWithIcon from '@material-ui/icons/OpenWith';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import ZoomOutIcon from '@material-ui/icons/ZoomOut';
import ZoomOutMapIcon from '@material-ui/icons/ZoomOutMap';

import {
  // @ts-ignore
  ToolbarButton,
  fitToViewer,
  TOOL_PAN, TOOL_ZOOM_IN, TOOL_ZOOM_OUT,
  POSITION_TOP, POSITION_RIGHT, POSITION_BOTTOM, POSITION_LEFT,
  ALIGN_CENTER, ALIGN_LEFT, ALIGN_RIGHT, ALIGN_TOP, ALIGN_BOTTOM,
} from 'react-svg-pan-zoom';

export function CustomToolbar({
  tool, value, onChangeValue, onChangeTool, activeToolColor, position, SVGAlignX, SVGAlignY,
}) {
  const handleChangeTool = (event, toolVal) => {
    onChangeTool(toolVal);
    event.stopPropagation();
    event.preventDefault();
  };

  const handleFit = (event) => {
    onChangeValue(fitToViewer(value));
    event.stopPropagation();
    event.preventDefault();
  };

  const isHorizontal = [POSITION_TOP, POSITION_BOTTOM].indexOf(position) >= 0;

  const style = {
    // position
    position: 'absolute',
    transform: [POSITION_TOP, POSITION_BOTTOM].indexOf(position) >= 0 ? 'translate(-50%, 0px)' : 'none',
    top: [POSITION_LEFT, POSITION_RIGHT, POSITION_TOP].indexOf(position) >= 0 ? '5px' : 'unset',
    // eslint-disable-next-line no-nested-ternary
    left: [POSITION_TOP, POSITION_BOTTOM].indexOf(position) >= 0
      ? '50%' : (POSITION_LEFT === position ? '5px' : 'unset'),
    right: [POSITION_RIGHT].indexOf(position) >= 0 ? '5px' : 'unset',
    bottom: [POSITION_BOTTOM].indexOf(position) >= 0 ? '5px' : 'unset',

    // inner styling
    backgroundColor: 'rgba(19, 20, 22, 0.90)',
    borderRadius: '2px',
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    padding: isHorizontal ? '1px 2px' : '2px 1px',
  };

  return (
    // @ts-ignore
    <div style={style} role="toolbar">
      <ToolbarButton
        toolbarPosition={position}
        active={tool === TOOL_PAN}
        activeColor={activeToolColor}
        name="select-tool-pan"
        title="Pan"
        onClick={(event) => handleChangeTool(event, TOOL_PAN)}
      >
        <OpenWithIcon />
      </ToolbarButton>

      <ToolbarButton
        toolbarPosition={position}
        active={tool === TOOL_ZOOM_IN}
        activeColor={activeToolColor}
        name="select-tool-zoom-in"
        title="Zoom in"
        onClick={(event) => handleChangeTool(event, TOOL_ZOOM_IN)}
      >
        <ZoomInIcon />
      </ToolbarButton>

      <ToolbarButton
        toolbarPosition={position}
        active={tool === TOOL_ZOOM_OUT}
        activeColor={activeToolColor}
        name="select-tool-zoom-out"
        title="Zoom out"
        onClick={(event) => handleChangeTool(event, TOOL_ZOOM_OUT)}
      >
        <ZoomOutIcon />
      </ToolbarButton>

      <ToolbarButton
        toolbarPosition={position}
        active={false}
        activeColor={activeToolColor}
        name="fit-to-viewer"
        title="Fit to viewer"
        onClick={(event) => handleFit(event)}
      >
        <ZoomOutMapIcon />
      </ToolbarButton>
    </div>
  );
}

CustomToolbar.propTypes = {
  tool: PropTypes.string.isRequired,
  onChangeTool: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  value: PropTypes.object.isRequired,
  onChangeValue: PropTypes.func.isRequired,

  // customizations
  position: PropTypes.oneOf([POSITION_TOP, POSITION_RIGHT, POSITION_BOTTOM, POSITION_LEFT]),
  SVGAlignX: PropTypes.oneOf([ALIGN_CENTER, ALIGN_LEFT, ALIGN_RIGHT]),
  SVGAlignY: PropTypes.oneOf([ALIGN_CENTER, ALIGN_TOP, ALIGN_BOTTOM]),
  activeToolColor: PropTypes.string,
};

CustomToolbar.defaultProps = {
  position: POSITION_RIGHT,
  SVGAlignX: ALIGN_LEFT,
  SVGAlignY: ALIGN_TOP,
  activeToolColor: '#1CA6FC',
};
