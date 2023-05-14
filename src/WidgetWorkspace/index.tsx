import React, {
  ComponentProps, FunctionComponent, useLayoutEffect, useMemo,
} from 'react';
import { observer } from 'mobx-react';
import {
  Avatar, Dialog, DialogTitle, List, ListItemAvatar, ListItemButton, ListItemText, Paper,
} from '@mui/material';
import { kebabCase, startCase } from 'lodash';
import { styled } from '@mui/styles';
import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';
import { ResizableZoomPan } from './components/ResizableZoomPan';
import { WidgetControlPanel } from './components/WidgetControlPanel';
import { FullPageDiv } from '../common/style/style';
import { DielineViewToolbar } from './components/DielineViewToolbar';
import { useWorkspaceMst } from './rootStore';
import { widgetOptions } from './models/WorkspaceModel';
import { FileInputs } from './components/FileInputs';
import 'react-reflex/styles.css';
import { ResizeDetector } from './components/ResizableZoomPan/components/ResizeDetector';

const WIDGET_DIALOG_TITLE_ID = 'widget-dialog-title';
const CLASS_BASE = 'workspace';
const classes = {
  widgetFab: `${CLASS_BASE}__widget-fab`,
  widgetAvatar: `${CLASS_BASE}__widget-avatar`,
  widgetName: `${CLASS_BASE}__widget-name`,
};

const WidgetWorkspaceStyled = styled(FullPageDiv)(({ theme }) => ({
  [`& .${classes.widgetFab}`]: {
    bottom: theme.spacing(1),
    left: theme.spacing(1),
    position: 'absolute',
  },
}));

const DialogStyled = styled(Dialog)(({ theme }) => ({
  [`& .${classes.widgetAvatar}`]: {
    bottom: theme.spacing(1),
    left: theme.spacing(1),
    position: 'absolute',
  },
  [`& .${classes.widgetName}`]: {
    marginLeft: theme.spacing(3),
    fontSize: '2em',
  },
}));

const splitterSelector = '.reflex-splitter';
const StyledReflexContainer = styled(ReflexContainer)(({ theme }) => ({
  [`&.reflex-container > ${splitterSelector}`]: {
    borderColor: theme.palette.grey.A400,
  },
  [`&.reflex-container > ${splitterSelector}.active, &.reflex-container ${splitterSelector}:hover`]: {
    borderColor: theme.palette.primary.main,
  },
}));

type WidgetWorkspaceRequiredProps = {
  width: number,
  height: number,
};

export type Orientation = ComponentProps<typeof ReflexContainer>['orientation'];
type WidgetWorkspaceOptionalProps = {
  panelOrientation?: Orientation,
  maxPanelWidthPercent?: number,
  minPanelWidthPercent?: number,
};

type WidgetWorkspaceProps = WidgetWorkspaceRequiredProps & WidgetWorkspaceOptionalProps;

const SizedWidgetWorkspace: FunctionComponent<WidgetWorkspaceProps> = observer(({
  panelOrientation, width, height, maxPanelWidthPercent, minPanelWidthPercent,
}) => {
  const workspaceStore = useWorkspaceMst();
  const { selectedStore, selectedWidgetModelType, preferences } = workspaceStore;
  const { panelSizePercent, panelOrientation: preferencesPanelOrientation } = preferences;
  const resolvedPanelOrientation = panelOrientation || preferencesPanelOrientation;

  useLayoutEffect(() => {
    workspaceStore.fitToDocument();
  }, [workspaceStore?.selectedWidgetModelType]);
  const dimensionValue = resolvedPanelOrientation === 'vertical' ? width : height;
  const maxPanelSize = useMemo(
    () => dimensionValue * (maxPanelWidthPercent / 100),
    [dimensionValue, resolvedPanelOrientation],
  );
  const minPanelSize = useMemo(
    () => dimensionValue * (minPanelWidthPercent / 100),
    [dimensionValue, resolvedPanelOrientation],
  );
  const panelSize = useMemo(
    () => dimensionValue * (panelSizePercent / 100),
    [dimensionValue, resolvedPanelOrientation],
  );

  // wrap with observer here so WidgetSVG can be rendered with ReactDOMServer for saving to string

  return (
    <>
      <WidgetWorkspaceStyled>
        {selectedStore && (
          <StyledReflexContainer orientation={resolvedPanelOrientation}>
            <ReflexElement>
              <DielineViewToolbar orientation={resolvedPanelOrientation} showOrientationToggle={!panelOrientation} />
              <ResizableZoomPan SVGBackground="url(#grid-pattern)">
                {selectedStore.assetDefinition.WorkspaceView}
              </ResizableZoomPan>
            </ReflexElement>
            <ReflexSplitter />
            <ReflexElement
              onResize={({ domElement }) => {
                preferences.setPanelSizePercent(
                  ((domElement as HTMLDivElement).getBoundingClientRect().width / width) * 100,
                );
              }}
              minSize={minPanelSize}
              maxSize={maxPanelSize}
              size={panelSize}
            >
              <Paper elevation={100}>
                <WidgetControlPanel />
              </Paper>
            </ReflexElement>
          </StyledReflexContainer>
        )}
      </WidgetWorkspaceStyled>
      <FileInputs />
      <DialogStyled
        disableEscapeKeyDown={!selectedStore}
        disableRestoreFocus={!selectedStore}
        open={workspaceStore.widgetPickerOpen}
        aria-labelledby={WIDGET_DIALOG_TITLE_ID}
        onClose={(_, reason) => {
          // if no store, ensure choice is made
          if (reason === 'backdropClick' && !selectedStore) {
            return;
          }
          workspaceStore.setWidgetPickerOpen(false);
        }}
      >
        <DialogTitle id={WIDGET_DIALOG_TITLE_ID}>Select Widget</DialogTitle>
        <List>
          {
            Array.from(widgetOptions.keys()).map((widgetName) => (
              <ListItemButton
                key={widgetName}
                selected={selectedWidgetModelType === widgetName}
                onClick={() => {
                  workspaceStore.newWidgetStore(widgetName);
                  workspaceStore.setWidgetPickerOpen(false);
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    alt={startCase(widgetName)}
                    className={classes.widgetAvatar}
                    src={new URL(`../../static/images/widgets/${kebabCase(widgetName)}.png`, import.meta.url).href}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={startCase(widgetName)}
                  primaryTypographyProps={{ className: classes.widgetName }}
                />
              </ListItemButton>
            ))
          }
        </List>
      </DialogStyled>
    </>
  );
});

export const WidgetWorkspace: FunctionComponent<WidgetWorkspaceOptionalProps> = (props) => (
  <ResizeDetector>
    {({ width, height }:
    { width: number, height: number }) => (<SizedWidgetWorkspace {...props} width={width} height={height} />)}
  </ResizeDetector>
);

WidgetWorkspace.defaultProps = {
  panelOrientation: undefined,
  maxPanelWidthPercent: 50,
  minPanelWidthPercent: 25,
};
