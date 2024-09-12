import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { useWorkspaceMst } from '../rootStore';
import { WIDGET_EXT } from '../internal/constants';
import { InvisibleTextFileInput } from './InvisibleTextFileInput';

export const FileInputs = observer(() => {
  const workspaceStore = useWorkspaceMst();
  const { dialogManager } = workspaceStore;

  const openWidgetInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dialogManager.openWidgetFileFlag) {
      openWidgetInputRef?.current?.click();
    }
  }, [dialogManager.openWidgetFileFlag]);

  return (
    <InvisibleTextFileInput
      ref={openWidgetInputRef}
      changeHandler={(txt) => {
        dialogManager.deactivateWidgetFilePicker();
        workspaceStore.initializeWidgetFromSnapshot(JSON.parse(txt));
      }}
      accept={`.${WIDGET_EXT}`}
    />
  );
});
