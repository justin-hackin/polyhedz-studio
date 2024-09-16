import { WidgetSelectionDialog, WidgetWorkspace, WidgetWorkspaceProvider } from 'svg-widget-studio';
import React from 'react';
import { WidgetRoute } from 'svg-widget-studio/src/components/WidgetRoute';
import { POLYHEDRAL_NET_MODEL_TYPE } from '@/widgets/PyramidNet/models/PyramidNetWidgetStore';
import { FileInputs } from '@/widgets/PyramidNet/components/FileInputs';
import { TextureEditorDrawer } from '@/widgets/PyramidNet/components/TextureEditorDrawer/index';

export function App() {
  return (
    <WidgetWorkspaceProvider>
      <WidgetRoute widgetName={POLYHEDRAL_NET_MODEL_TYPE}>
        <FileInputs />
        <TextureEditorDrawer />
      </WidgetRoute>
      <WidgetWorkspace />
      <WidgetSelectionDialog />
    </WidgetWorkspaceProvider>
  );
}
