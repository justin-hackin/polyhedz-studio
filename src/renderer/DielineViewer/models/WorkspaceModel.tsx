import ReactDOMServer from 'react-dom/server';
import React, {
  createContext, FC, MutableRefObject, useContext,
} from 'react';
// import { persist } from 'mobx-keystone-persist';
// eslint-disable-next-line import/no-extraneous-dependencies
import remotedev from 'remotedev';
import parseFilepath from 'parse-filepath';
import { observer } from 'mobx-react';
import { computed, observable, reaction } from 'mobx';
import {
  Model, modelAction, prop, getSnapshot, _Model, applySnapshot, connectReduxDevTools, model, registerRootStore,
} from 'mobx-keystone';

import { SVGWrapper } from '../data/SVGWrapper';
import { PreferencesModel } from './PreferencesModel';
import { PyramidNetOptionsInfo } from '../widgets/PyramidNet';
import { CylinderLightboxWidgetOptionsInfo } from '../widgets/CylinderLightbox';
import { PyramidNetTestTabsOptionsInfo } from '../widgets/PyramidNetTestTabs';
import { IS_DEVELOPMENT_BUILD, IS_ELECTRON_BUILD } from '../../../common/constants';
import { PyramidNetPluginModel } from './PyramidNetMakerStore';

const PREFERENCES_LOCALSTORE_NAME = 'preferencesStoreLocal';

export interface RawSvgComponentProps {
  preferencesStore?: PreferencesModel, widgetStore: PyramidNetPluginModel,
}

export interface AdditionalFileMenuItemsProps {
  resetFileMenuRef: MutableRefObject<undefined>,
}

export interface WidgetOptions {
  RawSvgComponent: FC<RawSvgComponentProps>,
  controlPanelProps: {
    AdditionalToolbarContent?: FC,
    AdditionalFileMenuItems?: FC<AdditionalFileMenuItemsProps>,
    PanelContent: FC,
  },
  // TODO: enforce common params
  WidgetModel: _Model<any, any>,
  AdditionalMainContent?: FC,
  specFileExtension: string,
  specFileExtensionName?: string,
}

type WidgetOptionsCollection = Record<string, WidgetOptions>;

@model('WorkspaceModel')
export class WorkspaceModel extends Model({
  selectedWidgetName: prop('polyhedral-net'),
  preferences: prop<PreferencesModel>(() => (new PreferencesModel({}))),
}) {
  widgetOptions = {
    'polyhedral-net': PyramidNetOptionsInfo,
    'cylinder-lightbox': CylinderLightboxWidgetOptionsInfo,
    'polyhedral-net-test-tabs': PyramidNetTestTabsOptionsInfo,
  } as WidgetOptionsCollection;

  @observable
  savedSnapshot = undefined;

  @observable
  currentFilePath = undefined;

  @observable
  selectedStore = undefined;

  @computed
  get selectedWidgetOptions() {
    return this.widgetOptions[this.selectedWidgetName];
  }

  @computed
  get SelectedRawSvgComponent() {
    return this.selectedWidgetOptions.RawSvgComponent;
  }

  // TODO: these shortcuts to selectedWidgetOptions properties are unnecessary
  @computed
  get selectedControlPanelProps() {
    return this.selectedWidgetOptions.controlPanelProps;
  }

  @computed
  get SelectedAdditionalMainContent() {
    return this.selectedWidgetOptions.AdditionalMainContent;
  }

  @computed
  get selectedSpecFileExtension() {
    return this.selectedWidgetOptions.specFileExtension;
  }

  @computed
  get selectedStoreIsSaved() {
    // TODO: consider custom middleware that would obviate the need to compare snapshots on every change,
    // instead flagging history records with the associated file name upon save
    // + creating a middleware variable currentSnapshotIsSaved
    // this will also allow history to become preserved across files with titlebar accuracy
    const currentSnapshot = getSnapshot(this.selectedStore.shapeDefinition);
    // TODO: why does lodash isEqual fail to accurately compare these and why no comparator with mst?
    return JSON.stringify(this.savedSnapshot) === JSON.stringify(currentSnapshot);
  }

  @computed
  get SelectedControlledSvgComponent() {
    const ObservedSvgComponent = observer(this.SelectedRawSvgComponent);

    return observer(() => (
      <ObservedSvgComponent widgetStore={this.selectedStore} preferencesStore={this.preferences} />));
  }

  @computed
  get selectedShapeName() {
    return this.selectedStore.shapeDefinition.$modelType;
  }

  @computed
  get currentFileName() {
    return this.currentFilePath ? parseFilepath(this.currentFilePath).name : `New ${this.selectedShapeName}`;
  }

  @computed
  get fileTitleFragment() {
    return `${this.selectedStoreIsSaved ? '' : '*'}${this.currentFileName}`;
  }

  @computed
  get titleBarText() {
    return IS_ELECTRON_BUILD
      ? `${this.selectedShapeName} ‖ ${this.fileTitleFragment}` : 'Polyhedral Decoration Studio';
  }

  onAttachedToRootStore() {
    // this.preferences = new PreferencesModel({});
    // persist(PREFERENCES_LOCALSTORE_NAME, this.preferences);
    const disposers = [
      // title bar changes for file status indication
      reaction(() => [this.titleBarText], () => {
      // @ts-ignore
        document.title = this.titleBarText;
      }, { fireImmediately: true }),

      // set selected store upon widget change
      reaction(() => [this.selectedWidgetName], () => {
        this.selectedStore = new this.selectedWidgetOptions.WidgetModel({});
      }, { fireImmediately: true }),
    ];

    return () => {
      for (const disposer of disposers) {
        disposer();
      }
    };
  }

  @modelAction
  setSelectedWidgetName(name) {
    this.selectedWidgetName = name;
    this.clearCurrentFileData();
  }

  @modelAction
  renderWidgetToString() {
    const { SelectedRawSvgComponent } = this;
    return ReactDOMServer.renderToString(
      <SVGWrapper {...this.preferences.dielineDocumentDimensions}>
        <SelectedRawSvgComponent
          preferencesStore={this.preferences}
          widgetStore={this.selectedStore}
        />
      </SVGWrapper>,
    );
  }

  @modelAction
  resetPreferences() {
    localStorage.removeItem(PREFERENCES_LOCALSTORE_NAME);
    this.preferences = new PreferencesModel({});
    // persist(PREFERENCES_LOCALSTORE_NAME, this.preferences);
  }

  @modelAction
  resetModelToDefault() {
    applySnapshot(this.selectedStore, {});
  }

  @modelAction
  setCurrentFileData(filePath, snapshot) {
    this.currentFilePath = filePath;
    this.savedSnapshot = snapshot;
  }

  @modelAction
  clearCurrentFileData() {
    this.currentFilePath = undefined;
    this.savedSnapshot = undefined;
  }
}

// TODO: instantiating this store directly in the module causes unintended side-effects in texture editor:
// reaction for title bar runs there too but workspace model is only the concern of dieline editor
// consider this side-effect has the advantage of displaying model name in texture editor -> it doesn't have
// access to shapeDefinition's model name otherwise
export const workspaceStore = new WorkspaceModel({});
registerRootStore(workspaceStore);
// @ts-ignore
window.workpsaceStore = workspaceStore;
const WorkspaceStoreContext = createContext<WorkspaceModel>(workspaceStore);

export const { Provider: WorkspaceProvider } = WorkspaceStoreContext;

export const WorkspaceStoreProvider = ({ children }) => (
  <WorkspaceProvider value={workspaceStore}>{children}</WorkspaceProvider>
);

export function useWorkspaceMst() {
  return useContext(WorkspaceStoreContext);
}

if (IS_DEVELOPMENT_BUILD) {
  if (IS_ELECTRON_BUILD) {
    // create a connection to the monitor (for example with connectViaExtension)
    const connection = remotedev.connectViaExtension({
      name: 'Polyhedral Net Studio',
    });

    connectReduxDevTools(remotedev, connection, workspaceStore);
  }
}
