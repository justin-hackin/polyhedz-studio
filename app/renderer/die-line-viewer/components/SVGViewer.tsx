// import { useQueryParam, StringParam, JsonParam } from 'use-query-params';
import React from 'react';
import { observer } from 'mobx-react';
import { ThemeProvider } from '@material-ui/styles';
import { createMuiTheme } from '@material-ui/core';

import darkTheme from '../data/material-ui-dark-theme.json';
import { store } from '../data/PyramidNetMakerStore';
import { PyramidNet } from './PyramidNet';
// eslint-disable-next-line import/no-cycle
import { ControlPanel } from './ControlPanel';
import { GridPattern } from './GridPattern';
import { ResizableZoomPan } from './ResizableZoomPan';

const patternId = 'grid-pattern';
// @ts-ignore
const theme = createMuiTheme(darkTheme);
export const SVGViewer = observer(() => (
  <div style={{ width: '100%', height: '100%', position: 'absolute' }}>
    <ThemeProvider theme={theme}>
      <ControlPanel store={store} />
    </ThemeProvider>
    <ResizableZoomPan SVGBackground={`url(#${patternId})`}>
      <svg {...store.svgDimensions}>
        <GridPattern patternId={patternId} />
        <g transform="translate(300, 300)">
          <PyramidNet store={store} />
        </g>
      </svg>
    </ResizableZoomPan>
  </div>
));
