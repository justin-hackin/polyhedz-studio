import React from 'react';
import { ListItemIcon, MenuItem, Typography } from '@material-ui/core';
import ChangeHistoryIcon from '@material-ui/icons/ChangeHistory';
import OpenInBrowserIcon from '@material-ui/icons/OpenInBrowser';
import BlurOnIcon from '@material-ui/icons/BlurOn';
import HowToVoteIcon from '@material-ui/icons/HowToVote';
import { startCase } from 'lodash';

import { useWorkspaceMst } from '../../../models/WorkspaceModel';
import { IPyramidNetFactoryModel } from '../../../models/PyramidNetMakerStore';
import { EVENTS } from '../../../../../main/ipc';
import { extractCutHolesFromSvgString } from '../../../../../common/util/svg';
import { useStyles } from '../../../style';

const DOWNLOAD_TEMPLATE_TXT = 'Download face template SVG (current shape)';
const IMPORT_SVG_DECORATION_TXT = 'Import face cut pattern from SVG';
const IMPORT_TEXTURE_TXT = 'Import texture from texture editor export';
const DOWNLOAD_TAB_TESTER_TXT = 'Download tab tester SVG';

export const AdditionalFileMenuItems = ({ resetFileMenuRef }) => {
  const workspaceStore = useWorkspaceMst();
  const preferencesStore = workspaceStore.preferences;
  const classes = useStyles();
  const store = workspaceStore.selectedStore as IPyramidNetFactoryModel;

  return (
    <>
      <MenuItem onClick={async () => {
        await globalThis.ipcRenderer.invoke(EVENTS.SAVE_SVG, store.renderDecorationBoundaryToString(), {
          message: DOWNLOAD_TEMPLATE_TXT,
          defaultPath: `${store.pyramidNetSpec.pyramid.shapeName}__template.svg`,
        });
        resetFileMenuRef();
      }}
      >
        <ListItemIcon className={classes.listItemIcon}>
          <ChangeHistoryIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">{DOWNLOAD_TEMPLATE_TXT}</Typography>
      </MenuItem>
      <MenuItem onClick={async () => {
        await globalThis.ipcRenderer.invoke(EVENTS.OPEN_SVG, IMPORT_SVG_DECORATION_TXT)
          .then((svgString) => {
            const d = extractCutHolesFromSvgString(svgString);
            store.pyramidNetSpec.setRawFaceDecoration(d);
          });
        resetFileMenuRef();
      }}
      >
        <ListItemIcon className={classes.listItemIcon}>
          <OpenInBrowserIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">{IMPORT_SVG_DECORATION_TXT}</Typography>
      </MenuItem>
      <MenuItem onClick={async () => {
        const { fileData } = await globalThis.ipcRenderer.invoke(EVENTS.DIALOG_LOAD_JSON, {
          message: IMPORT_TEXTURE_TXT,
        });
        const currentShapeName = store.pyramidNetSpec.pyramid.shapeName;
        resetFileMenuRef();
        if (!fileData) {
          return;
        }
        if (fileData.shapeName !== currentShapeName) {
          // eslint-disable-next-line no-alert
          alert(`Failed to load texture: current shape is ${startCase(currentShapeName)
          } but the selected texture was for ${startCase(fileData.shapeName)} shape.`);
          return;
        }
        store.pyramidNetSpec.setTextureFaceDecoration(fileData.textureSnapshot);
      }}
      >
        <ListItemIcon className={classes.listItemIcon}>
          <BlurOnIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">{IMPORT_TEXTURE_TXT}</Typography>
      </MenuItem>
      <MenuItem onClick={async () => {
        await globalThis.ipcRenderer.invoke(EVENTS.SAVE_SVG, store.renderTestTabsToString(store, preferencesStore), {
          message: DOWNLOAD_TAB_TESTER_TXT,
          defaultPath: `${store.getFileBasename()}--test-tabs.svg`,
        });
        resetFileMenuRef();
      }}
      >
        <ListItemIcon className={classes.listItemIcon}>
          <HowToVoteIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">{DOWNLOAD_TAB_TESTER_TXT}</Typography>
      </MenuItem>
    </>
  );
};
