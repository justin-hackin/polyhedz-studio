import {
  action, computed, observable, reaction,
} from 'mobx';
import {
  applySnapshot,
  detach,
  getSnapshot,
  model,
  Model,
  modelAction,
  ModelClass,
  prop,
  SnapshotInOfModel,
} from 'mobx-keystone';
import { persist } from 'mobx-keystone-persist';
import { startCase } from 'lodash-es';
import JSZip from 'jszip';
// TODO: remove this dep
import fileDownload from 'js-file-download';
import { BaseWidgetClass } from '../classes/BaseWidgetClass';
import type { Orientation } from '../components/WidgetWorkspace';
import { radioProp, switchProp } from '../props';
import { assertNotNullish } from '../helpers/assert';
import { UNITS } from '../helpers/units';
import { ZoomPanView } from './ZoomPanView';
import { widgetNameToWidgetClassMap } from '../internal/data';
import { WidgetJSON } from '../types';
import { DialogManager } from '../components/DialogManager';

@model('SvgWidgetStudio/WorkspacePreferencesModel')
class WorkspacePreferencesModel extends Model({
    displayUnit: radioProp(UNITS.cm, {
      options: Object.values(UNITS),
      isRow: true,
    }),
    darkModeEnabled: switchProp(true),
    panelSizePercent: prop<number>(33).withSetter(),
    panelOrientation: prop<Orientation>('vertical').withSetter(),
  }) {}

const PREFERENCES_LOCALSTORE_NAME = 'WorkspacePreferencesModel';
const ZOOM_PAN_LOCALSTORE_NAME = 'ZoomPanView';
const SELECTED_STORE_LOCALSTORE_NAME = 'SvgWidgetStudio/selectedStore';

@model('SvgWidgetStudio/WorkspaceModel')
export class WorkspaceModel extends Model({
  selectedStore: prop<BaseWidgetClass | undefined>(() => undefined).withSetter(),
  preferences: prop(() => (new WorkspacePreferencesModel({}))).withSetter(),
}) {
  @observable
    selectedWidgetModelType: string | undefined = undefined;

  @observable
    dialogManager = new DialogManager();

  // package used to export INITIAL_VALUE but this somehow works okay

  @observable
    zoomPanView = new ZoomPanView({});

  // eslint-disable-next-line class-methods-use-this
  @computed
  get availableWidgetTypes() {
    return Array.from(widgetNameToWidgetClassMap.keys());
  }

  // eslint-disable-next-line class-methods-use-this
  get widgetOptions() {
    return widgetNameToWidgetClassMap;
  }

  onAttachedToRootStore() {
    const disposers = [
      // title bar changes for file status indication
      reaction(() => [this.documentTitle], () => {
        document.title = this.documentTitle;
      }, { fireImmediately: true }),
    ];
    this.persistModels();

    return () => {
      for (const disposer of disposers) {
        disposer();
      }
    };
  }

  @computed
  get selectedWidgetNameReadable() {
    return startCase(this.selectedWidgetModelType);
  }

  @computed
  get documentTitle() {
    return `SVG Widget Studio ${
      this.selectedWidgetNameReadable ? `⚙️${this.selectedWidgetNameReadable}` : ''}`;
  }

  downloadWidgetWithAssets(fileBasename) {
    assertNotNullish(this.selectedStore);
    const zip = new JSZip();
    const widgetSpecJSON = this.getWidgetSpecJSON();
    // avoid handling the case where user submits empty string and just use fallback
    const resolvedBaseName = fileBasename || this.selectedStore.fileBasename;
    const filePath = `${resolvedBaseName}.widget`;
    zip.file(
      filePath,
      JSON.stringify(widgetSpecJSON, null, 2),
    );
    this.selectedStore.getSelectedModelAssetsFileData().forEach(({ filePath, fileString }) => {
      zip.file(filePath, fileString);
    });

    zip.generateAsync({ type: 'blob' })
      .then((content) => {
        // see FileSaver.js
        assertNotNullish(this.selectedStore);
        fileDownload(content, `${resolvedBaseName}.zip`);
      });
  }

  @modelAction
  async persistPreferences() {
    await persist(PREFERENCES_LOCALSTORE_NAME, this.preferences)
      .catch(async (e) => {
        // eslint-disable-next-line no-console
        console.warn('Failed to persist preferences, likely due to data schema changes, '
          + 'resetting preferences to defaults: ', e.message);
        await this.resetPreferences();
        return persist(PREFERENCES_LOCALSTORE_NAME, this.preferences);
      });
  }

  @modelAction
  async persistSelectedStore() {
    // using the same persist key for different models doesn't work
    await persist(`${SELECTED_STORE_LOCALSTORE_NAME}--${this.selectedWidgetModelType}`, this.selectedStore);
  }

  @modelAction
  async persistModels() {
    await persist(ZOOM_PAN_LOCALSTORE_NAME, this.zoomPanView);
    await this.persistPreferences();
  }

  @modelAction
  resetPreferences() {
    // TODO: $$$ reset selectedModel preferences
    localStorage.removeItem(PREFERENCES_LOCALSTORE_NAME);
    this.setPreferences(new WorkspacePreferencesModel({}));
    return this.persistPreferences();
  }

  @modelAction
  resetModelToDefault() {
    const SelectedModel = widgetNameToWidgetClassMap.get(
      this.selectedWidgetModelType || '',
    ) as ModelClass<BaseWidgetClass>;
    if (this.selectedStore) {
      detach(this.selectedStore);
    }

    if (SelectedModel) {
      const newStore = new SelectedModel({});
      this.setSelectedStore(newStore);
    }
  }

  @action
  newWidgetStore(widgetType: string) {
    if (this.selectedWidgetModelType) {
      localStorage.removeItem(`${SELECTED_STORE_LOCALSTORE_NAME}--${this.selectedWidgetModelType}`);
    }
    const modelTypeChanged = widgetType !== this.selectedWidgetModelType;
    if (modelTypeChanged) {
      this.selectedWidgetModelType = widgetType;
    }

    this.resetModelToDefault();
    if (modelTypeChanged) {
      this.persistSelectedStore();
    }
  }

  @modelAction
  applySpecSnapshot(persistedSpecSnapshot: SnapshotInOfModel<any>) {
    assertNotNullish(this.selectedStore);
    // here to support legacy format with cruft data on property
    // TODO: remove
    if (persistedSpecSnapshot?.textureEditor) {
      delete persistedSpecSnapshot.textureEditor;
    }
    applySnapshot(this.selectedStore, persistedSpecSnapshot);
  }

  @modelAction
  setSelectedStoreFromData(widgetType: string, persistedSpecSnapshot: SnapshotInOfModel<any>) {
    this.newWidgetStore(widgetType);
    assertNotNullish(this.selectedStore);
    const { history } = this.selectedStore;
    // created in onInit
    assertNotNullish(history);
    history.withoutUndo(() => {
      this.applySpecSnapshot(persistedSpecSnapshot);
    });
  }

  @modelAction
  initializeWidgetFromSnapshot(widgetJSON: WidgetJSON) {
    const { modelType, modelSnapshot } = widgetJSON.widget;
    if (!widgetNameToWidgetClassMap.has(modelType)) {
      this.dialogManager.setAlertDialogContent(
        `Invalid widget spec file: JSON data must contain property widget.$modelType with a value equal to one of (${
          this.availableWidgetTypes.join(', ')
        }) but instead saw ${modelType}`,
      );
      return;
    }

    this.setSelectedStoreFromData(modelType, modelSnapshot);
  }

  getWidgetSpecJSON(): WidgetJSON {
    assertNotNullish(this.selectedWidgetModelType);
    const snapshot = getSnapshot(this.selectedStore);
    return {
      widget: {
        modelType: this.selectedWidgetModelType,
        modelSnapshot: snapshot,
      },
      metadata: {
        version: 1,
      },
    };
  }
}
