import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { startCase } from 'lodash-es';
import { fromSnapshot } from 'mobx-keystone';
import { InvisibleTextFileInput, useWorkspaceMst } from 'svg-widget-studio';
import { PyramidNetWidgetModel } from '../../../models/PyramidNetWidgetStore';
import { TextureEditorModel } from './TextureEditor/models/TextureEditorModel';
import { PositionableFaceDecorationModel } from '../../../models/PositionableFaceDecorationModel';

export const FileInputs = observer(() => {
  const workspaceStore = useWorkspaceMst();
  const widgetStore = workspaceStore.selectedStore as unknown as PyramidNetWidgetModel;
  const { textureEditor } = widgetStore;
  const { importTextureArrangementDialogActive } = textureEditor as TextureEditorModel;

  const openTextureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (importTextureArrangementDialogActive) {
      openTextureInputRef?.current?.click();
    }
  }, [importTextureArrangementDialogActive]);

  return (
    <InvisibleTextFileInput
      ref={openTextureInputRef}
      changeHandler={(fileString) => {
        textureEditor?.deactivateImportTextureArrangementDialog();
        const currentShapeName = widgetStore.pyramid.shapeName.value;

        const fileData = JSON.parse(fileString);
        if (fileData.shapeName !== currentShapeName) {
          // eslint-disable-next-line no-restricted-globals, no-alert
          const doIt = confirm(`The current shape is ${startCase(currentShapeName)
          } but the chosen texture was for ${startCase(fileData.shapeName)
          } shape. Do you want to change the Polyhedron and load its default settings?`);
          if (doIt) {
            widgetStore.pyramid.shapeName.setValue(fileData.shapeName);
          } else {
            return;
          }
        }
        widgetStore.setFaceDecoration(fromSnapshot<PositionableFaceDecorationModel>(fileData.textureSnapshot));
      }}
      accept=".json"
    />
  );
});
