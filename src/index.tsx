import React from 'react';
import { render } from 'react-dom';
import './widgets/index';
import { WidgetWorkspaceApp } from '@/WidgetWorkspaceApp';

render(
  (<WidgetWorkspaceApp />),
  document.getElementById('app'),
);
export { assertNotNullish } from '@/common/util/assert';
