import { observer } from 'mobx-react';
import { assertNotNullish, useSelectedStore } from 'svg-widget-studio';
import { useTheme } from '@mui/styles';
import React, { useMemo, useState } from 'react';
import Joyride, { ACTIONS, EVENTS } from 'react-joyride';
import {
  SAMPLE_IMAGE_SNAPSHOT,
  SAMPLE_PATH_SNAPSHOT,
  STEP_ACTIONS,
  StepWithNextAction,
  TOUR_STEPS,
} from '@/common/util/tour';
import { PyramidNetWidgetModel } from '@/widgets/PyramidNet/models/PyramidNetWidgetStore';
import { PathFaceDecorationPatternModel } from '@/widgets/PyramidNet/models/PathFaceDecorationPatternModel';
import { ImageFaceDecorationPatternModel } from '@/widgets/PyramidNet/models/ImageFaceDecorationPatternModel';

export const JoyrideTour = observer(() => {
  const pyramidNetPluginStore = useSelectedStore<PyramidNetWidgetModel>();
  const {
    preferences,
    textureEditor,
    history,
  } = pyramidNetPluginStore;
  assertNotNullish(textureEditor);
  const { tourIsActive } = preferences ?? {};
  const theme = useTheme();
  const [stepIndex, setStepIndex] = useState<number>(0);
  const incrementStepIndex = (index) => {
    setStepIndex(index + 1);
  };
  const resetStepIndex = () => {
    setStepIndex(0);
  };
  const joyrideCallback = useMemo(() => ({
    type,
    step,
    index,
    action,
  }: {
    type: string,
    step: StepWithNextAction,
    index: number,
    action: string
  }) => {
    if (type === EVENTS.TOUR_STATUS && action === ACTIONS.SKIP) {
      // the user could re-activate the tour, rewind
      resetStepIndex();
      textureEditor.clearTexturePattern();
      history?.clearUndo();
      history?.clearRedo();
      preferences.setTourIsActive(false);
    } else if (type === EVENTS.STEP_AFTER) {
      if (step.nextAction === STEP_ACTIONS.ADD_PATH_TEXTURE) {
        textureEditor.setTextureFromPattern(new PathFaceDecorationPatternModel(SAMPLE_PATH_SNAPSHOT));
        incrementStepIndex(index);
      } else if (step.nextAction === STEP_ACTIONS.ADD_IMAGE_TEXTURE) {
        textureEditor.setTextureFromPattern(new ImageFaceDecorationPatternModel(SAMPLE_IMAGE_SNAPSHOT));
        setTimeout(() => {
          incrementStepIndex(index);
        }, 400);
      } else {
        incrementStepIndex(index);
      }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      // this should never happen but if it does, it will prevent inability of advancement
      incrementStepIndex(index);
    }
  }, []);

  return (
    <Joyride
      steps={TOUR_STEPS}
      stepIndex={stepIndex}
      callback={joyrideCallback}
      styles={{
        options: {
          backgroundColor: theme.palette.grey.A400,
          arrowColor: theme.palette.grey.A400,
          textColor: theme.palette.grey['300'],
        },
      }}
      run={tourIsActive}
      showSkipButton
      continuous
      disableCloseOnEsc
      disableOverlay
      hideBackButton
    />
  );
});
