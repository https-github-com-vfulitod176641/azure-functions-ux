import React, { useContext, useState, useEffect } from 'react';
import { DeploymentCenterFieldProps, DeploymentCenterCodeFormData, WorkflowOption } from '../DeploymentCenter.types';
import DeploymentCenterGitHubDataLoader from '../github-provider/DeploymentCenterGitHubDataLoader';
import { ScmType, BuildProvider } from '../../../../models/site/config';
import { DeploymentCenterContext } from '../DeploymentCenterContext';
import DeploymentCenterGitHubReadOnly from '../github-provider/DeploymentCenterGitHubReadOnly';
import DeploymentCenterCodeBuildReadOnly from './DeploymentCenterCodeBuildReadOnly';
import DeploymentCenterCodeSourceAndBuild from './DeploymentCenterCodeSourceAndBuild';
import DeploymentCenterGitHubWorkflowConfigSelector from '../github-provider/DeploymentCenterGitHubWorkflowConfigSelector';
import DeploymentCenterGitHubWorkflowConfigPreview from '../github-provider/DeploymentCenterGitHubWorkflowConfigPreview';
import DeploymentCenterCodeBuildRuntimeAndVersion from './DeploymentCenterCodeBuildRuntimeAndVersion';
import CustomBanner from '../../../../components/CustomBanner/CustomBanner';
import { deploymentCenterConsole } from '../DeploymentCenter.styles';
import { MessageBarType } from 'office-ui-fabric-react';
import { useTranslation } from 'react-i18next';
import { getWorkflowInformation } from '../utility/GitHubActionUtility';
import { getWorkflowFileName } from '../utility/DeploymentCenterUtility';

const DeploymentCenterCodeSettings: React.FC<DeploymentCenterFieldProps<DeploymentCenterCodeFormData>> = props => {
  const { formProps } = props;
  const deploymentCenterContext = useContext(DeploymentCenterContext);
  const { t } = useTranslation();

  const [githubActionExistingWorkflowContents, setGithubActionExistingWorkflowContents] = useState<string>('');
  const [workflowFilePath, setWorkflowFilePath] = useState<string>('');

  const isGitHubSource = formProps && formProps.values.sourceProvider === ScmType.GitHub;
  const isGitHubActionsBuild = formProps && formProps.values.buildProvider === BuildProvider.GitHubAction;
  const isDeploymentSetup = deploymentCenterContext.siteConfig && deploymentCenterContext.siteConfig.properties.scmType !== ScmType.None;
  const isUsingExistingOrAvailableWorkflowConfig =
    formProps &&
    (formProps.values.workflowOption === WorkflowOption.UseExistingWorkflowConfig ||
      formProps.values.workflowOption === WorkflowOption.UseAvailableWorkflowConfigs);

  const disconnectCallback = () => {
    throw Error('not implemented');
  };

  const isPreviewFileButtonEnabled = () => {
    if (formProps) {
      if (
        formProps.values.workflowOption === WorkflowOption.UseAvailableWorkflowConfigs ||
        formProps.values.workflowOption === WorkflowOption.UseExistingWorkflowConfig
      ) {
        return true;
      }
      if (formProps.values.workflowOption === WorkflowOption.Add || formProps.values.workflowOption === WorkflowOption.Overwrite) {
        if (formProps.values.runtimeStack && formProps.values.runtimeVersion) {
          return true;
        }
      }
    }

    return false;
  };

  const getPreviewPanelContent = () => {
    if (formProps && deploymentCenterContext.siteDescriptor) {
      if (formProps.values.workflowOption === WorkflowOption.UseExistingWorkflowConfig) {
        return (
          <>
            <div>
              <CustomBanner message={t('githubActionWorkflowOptionUseExistingMessage')} type={MessageBarType.info} />
            </div>
            <pre className={deploymentCenterConsole}>{githubActionExistingWorkflowContents}</pre>
          </>
        );
      } else if (formProps.values.workflowOption === WorkflowOption.UseAvailableWorkflowConfigs) {
        return (
          <>
            <CustomBanner message={t('githubActionWorkflowOptionUseExistingMessageWithoutPreview')} type={MessageBarType.info} />
          </>
        );
      } else if (formProps.values.workflowOption === WorkflowOption.Add || formProps.values.workflowOption === WorkflowOption.Overwrite) {
        const information = getWorkflowInformation(
          formProps.values.runtimeStack,
          formProps.values.runtimeVersion,
          formProps.values.runtimeRecommendedVersion,
          formProps.values.branch,
          deploymentCenterContext.isLinuxApplication,
          formProps.values.gitHubPublishProfileSecretGuid,
          deploymentCenterContext.siteDescriptor.site,
          deploymentCenterContext.siteDescriptor.slot
        );
        return (
          <>
            <CustomBanner message={t('githubActionWorkflowOptionOverwriteIfConfigExists')} type={MessageBarType.info} />
            <pre className={deploymentCenterConsole}>{information.content}</pre>
          </>
        );
      }
    }
  };

  useEffect(
    () => {
      if (
        deploymentCenterContext.siteDescriptor &&
        formProps &&
        (formProps.values.workflowOption === WorkflowOption.UseExistingWorkflowConfig ||
          formProps.values.workflowOption === WorkflowOption.Add ||
          formProps.values.workflowOption === WorkflowOption.Overwrite)
      ) {
        const workflowFileName = getWorkflowFileName(
          formProps.values.branch,
          deploymentCenterContext.siteDescriptor.site,
          deploymentCenterContext.siteDescriptor.slot
        );
        setWorkflowFilePath(`.github/workflows/${workflowFileName}`);
      } else {
        setWorkflowFilePath('');
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    formProps ? [formProps.values.workflowOption] : []
  );

  return (
    <>
      {isDeploymentSetup ? (
        <>
          <DeploymentCenterGitHubReadOnly disconnect={disconnectCallback} />
          <DeploymentCenterCodeBuildReadOnly />
        </>
      ) : (
        <>
          <DeploymentCenterCodeSourceAndBuild formProps={formProps} />
          {isGitHubSource && (
            <>
              <DeploymentCenterGitHubDataLoader formProps={formProps} />
              {isGitHubActionsBuild && (
                <>
                  <DeploymentCenterGitHubWorkflowConfigSelector
                    formProps={formProps}
                    setGithubActionExistingWorkflowContents={setGithubActionExistingWorkflowContents}
                  />
                  {!isUsingExistingOrAvailableWorkflowConfig && <DeploymentCenterCodeBuildRuntimeAndVersion formProps={formProps} />}
                  {formProps && (
                    <DeploymentCenterGitHubWorkflowConfigPreview
                      getPreviewPanelContent={getPreviewPanelContent}
                      isPreviewFileButtonEnabled={isPreviewFileButtonEnabled}
                      workflowFilePath={workflowFilePath}
                    />
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  );
};

export default DeploymentCenterCodeSettings;
