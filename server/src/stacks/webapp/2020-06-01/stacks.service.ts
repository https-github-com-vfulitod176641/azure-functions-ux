import { Injectable, HttpException } from '@nestjs/common';
import { WebAppStack, WebAppRuntimes, WebAppMajorVersion, JavaContainers, WebAppMinorVersion } from './stack.model';
import { dotnetCoreStack } from './stacks/dotnetCore';
import { javaStack } from './stacks/java';
import { aspDotnetStack } from './stacks/aspDotnet';
import { nodeStack } from './stacks/node';
import { rubyStack } from './stacks/ruby';
import { pythonStack } from './stacks/python';
import { phpStack } from './stacks/php';
import { javaContainersStack } from './stacks/javaContainers';
import { LoggingService } from '../../../shared/logging/logging.service';
import { ConfigService } from '../../../shared/config/config.service';
import { HttpService } from '../../../shared/http/http.service';
import { Constants } from '../../../constants';

@Injectable()
export class WebAppStacksService20200601 {
  constructor(private logService: LoggingService, private config: ConfigService, private httpService: HttpService) {}

  getStacks(os?: 'linux' | 'windows'): WebAppStack<WebAppRuntimes | JavaContainers>[] {
    const runtimeStacks = [aspDotnetStack, nodeStack, pythonStack, phpStack, dotnetCoreStack, rubyStack, javaStack];
    const containerStacks = [javaContainersStack];

    if (!os) {
      const allStacks: WebAppStack<WebAppRuntimes | JavaContainers>[] = [...runtimeStacks, ...containerStacks];
      return allStacks;
    }

    const filteredStacks: WebAppStack<WebAppRuntimes | JavaContainers>[] = [
      ...this._filterRuntimeStacks(runtimeStacks, os),
      ...this._filterContainerStacks(containerStacks, os),
    ];
    return filteredStacks;
  }

  async getOnPremStacks(authToken: string, os?: 'linux' | 'windows'): Promise<WebAppStack<WebAppRuntimes | JavaContainers>[]> {
    const azureRuntimeStacks = [aspDotnetStack, nodeStack, pythonStack, phpStack, dotnetCoreStack, rubyStack, javaStack];
    const azureContainerStacks = [javaContainersStack];

    return this._getAvailableStacks(authToken, os)
      .then(stacksResult => {
        const availableStacks = stacksResult;

        const filteredStacks: WebAppStack<WebAppRuntimes | JavaContainers>[] = [
          ...this._filterOnPremRuntimeStacks(azureRuntimeStacks, availableStacks, os),
          ...this._filterOnPremContainerStacks(azureContainerStacks, availableStacks, os),
        ];

        return filteredStacks;
      })
      .catch(() => {
        return this.getStacks(os);
      });
  }

  private _filterRuntimeStacks(
    stacks: WebAppStack<WebAppRuntimes>[],
    os: 'linux' | 'windows'
  ): WebAppStack<WebAppRuntimes | JavaContainers>[] {
    const filteredStacks: WebAppStack<WebAppRuntimes | JavaContainers>[] = [];
    stacks.forEach(stack => {
      const newStack = this._buildNewStack(stack);
      stack.majorVersions.forEach(majorVersion => {
        const newMajorVersion = this._buildNewMajorVersion(majorVersion);
        majorVersion.minorVersions.forEach(minorVersion => {
          this._addCorrectMinorVersionsForRuntime(newMajorVersion, minorVersion, os);
        });
        this._addMajorVersion(newStack, newMajorVersion);
      });
      this._addStack(filteredStacks, newStack);
    });
    return filteredStacks;
  }

  private _filterContainerStacks(
    stacks: WebAppStack<JavaContainers>[],
    os: 'linux' | 'windows'
  ): WebAppStack<WebAppRuntimes | JavaContainers>[] {
    const filteredStacks: WebAppStack<WebAppRuntimes | JavaContainers>[] = [];
    stacks.forEach(runtimeStack => {
      const newStack = this._buildNewStack(runtimeStack);
      runtimeStack.majorVersions.forEach(majorVersion => {
        const newMajorVersion = this._buildNewMajorVersion(majorVersion);
        majorVersion.minorVersions.forEach(minorVersion => {
          this._addCorrectMinorVersionsForContainer(newMajorVersion, minorVersion, os);
        });
        this._addMajorVersion(newStack, newMajorVersion);
      });
      this._addStack(filteredStacks, newStack);
    });
    return filteredStacks;
  }

  private _buildNewStack(stack: WebAppStack<WebAppRuntimes | JavaContainers>): WebAppStack<WebAppRuntimes | JavaContainers> {
    return {
      displayText: stack.displayText,
      value: stack.value,
      preferredOs: stack.preferredOs,
      majorVersions: [],
    };
  }

  private _buildNewMajorVersion(
    majorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>
  ): WebAppMajorVersion<WebAppRuntimes | JavaContainers> {
    return {
      displayText: majorVersion.displayText,
      value: majorVersion.value,
      minorVersions: [],
    };
  }

  private _addMajorVersion(
    newStack: WebAppStack<WebAppRuntimes | JavaContainers>,
    newMajorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>
  ) {
    if (newMajorVersion.minorVersions.length > 0) {
      newStack.majorVersions.push(newMajorVersion);
    }
  }

  private _addStack(
    filteredStacks: WebAppStack<WebAppRuntimes | JavaContainers>[],
    newStack: WebAppStack<WebAppRuntimes | JavaContainers>
  ) {
    if (newStack.majorVersions.length > 0) {
      filteredStacks.push(newStack);
    }
  }

  private _addCorrectMinorVersionsForRuntime(
    newMajorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>,
    minorVersion: WebAppMinorVersion<WebAppRuntimes>,
    os: 'linux' | 'windows'
  ) {
    if (os === 'linux' && minorVersion.stackSettings.linuxRuntimeSettings !== undefined) {
      this._addNewMinorVersionLinuxRuntime(newMajorVersion, minorVersion);
    } else if (os === 'windows' && minorVersion.stackSettings.windowsRuntimeSettings !== undefined) {
      this._addNewMinorVersionWindowsRuntime(newMajorVersion, minorVersion);
    }
  }

  private _addNewMinorVersionLinuxRuntime(
    newMajorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>,
    minorVersion: WebAppMinorVersion<WebAppRuntimes>
  ) {
    const newMinorVersion: WebAppMinorVersion<WebAppRuntimes> = {
      displayText: minorVersion.displayText,
      value: minorVersion.value,
      stackSettings: {
        linuxRuntimeSettings: minorVersion.stackSettings.linuxRuntimeSettings,
      },
    };
    newMajorVersion.minorVersions.push(newMinorVersion);
  }

  private _addNewMinorVersionWindowsRuntime(
    newMajorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>,
    minorVersion: WebAppMinorVersion<WebAppRuntimes>
  ) {
    const newMinorVersion: WebAppMinorVersion<WebAppRuntimes> = {
      displayText: minorVersion.displayText,
      value: minorVersion.value,
      stackSettings: {
        windowsRuntimeSettings: minorVersion.stackSettings.windowsRuntimeSettings,
      },
    };
    newMajorVersion.minorVersions.push(newMinorVersion);
  }

  private _addCorrectMinorVersionsForContainer(
    newMajorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>,
    minorVersion: WebAppMinorVersion<JavaContainers>,
    os: 'linux' | 'windows'
  ) {
    if (os === 'linux' && minorVersion.stackSettings.linuxContainerSettings !== undefined) {
      this._addNewMinorVersionLinuxContainer(newMajorVersion, minorVersion);
    } else if (os === 'windows' && minorVersion.stackSettings.windowsContainerSettings !== undefined) {
      this._addNewMinorVersionWindowsContainer(newMajorVersion, minorVersion);
    }
  }

  private _addNewMinorVersionLinuxContainer(
    newMajorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>,
    minorVersion: WebAppMinorVersion<JavaContainers>
  ) {
    const newMinorVersion: WebAppMinorVersion<JavaContainers> = {
      displayText: minorVersion.displayText,
      value: minorVersion.value,
      stackSettings: {
        linuxContainerSettings: minorVersion.stackSettings.linuxContainerSettings,
      },
    };
    newMajorVersion.minorVersions.push(newMinorVersion);
  }

  private _addNewMinorVersionWindowsContainer(
    newMajorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>,
    minorVersion: WebAppMinorVersion<JavaContainers>
  ) {
    const newMinorVersion: WebAppMinorVersion<JavaContainers> = {
      displayText: minorVersion.displayText,
      value: minorVersion.value,
      stackSettings: {
        windowsContainerSettings: minorVersion.stackSettings.windowsContainerSettings,
      },
    };
    newMajorVersion.minorVersions.push(newMinorVersion);
  }

  private async _getAvailableStacks(authToken: string, os?: 'linux' | 'windows') {
    let availableStacks = [];
    const stacksWindowsRequest = this._getAvailableStacksWindows(authToken);
    const stacksLinuxRequest = this._getAvailableStacksLinux(authToken);

    if (os === 'windows') {
      availableStacks = await stacksWindowsRequest;
    } else if (os === 'linux') {
      availableStacks = await stacksLinuxRequest;
    } else {
      const [windowsStacks, linuxStacks] = await Promise.all([stacksWindowsRequest, stacksLinuxRequest]);
      availableStacks = this._combineAvailableStacks(windowsStacks, linuxStacks);
    }
    return availableStacks;
  }

  private _combineAvailableStacks(windowsStacks: any[], linuxStacks: any[]) {
    const allStacks = windowsStacks;
    linuxStacks.forEach(linuxStack => {
      const index = allStacks.findIndex(allStack => allStack.name === linuxStack.name);
      if (index === -1) {
        allStacks.push(linuxStack);
      } else if (
        allStacks[index] &&
        allStacks[index].properties &&
        allStacks[index].properties.majorVersions &&
        linuxStack.properties &&
        linuxStack.properties.majorVersions
      ) {
        allStacks[index].properties.majorVersions = allStacks[index].properties.majorVersions.concat(linuxStack.properties.majorVersions);
      }
    });
    return allStacks;
  }

  private _filterOnPremRuntimeStacks(
    azureStacks: WebAppStack<WebAppRuntimes>[],
    availableStacks: any[],
    os?: 'linux' | 'windows'
  ): WebAppStack<WebAppRuntimes | JavaContainers>[] {
    const filteredStacks: WebAppStack<WebAppRuntimes | JavaContainers>[] = [];
    azureStacks.forEach(azureStack => {
      const newStack = this._buildNewStack(azureStack);
      azureStack.majorVersions.forEach(majorVersion => {
        const newMajorVersion = this._buildNewMajorVersion(majorVersion);
        majorVersion.minorVersions.forEach(minorVersion => {
          const correspondingAvailableStack = availableStacks.find(availableStack => {
            return availableStack.name && availableStack.name.contains(azureStack.value);
          });
          this._addCorrectMinorVersionsForOnPremRuntime(newMajorVersion, minorVersion, correspondingAvailableStack, os);
        });
        this._addMajorVersion(newStack, newMajorVersion);
      });
      this._addStack(filteredStacks, newStack);
    });
    return filteredStacks;
  }

  private _addCorrectMinorVersionsForOnPremRuntime(
    newMajorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>,
    minorVersion: WebAppMinorVersion<WebAppRuntimes>,
    availableStack: any,
    os?: 'linux' | 'windows'
  ) {
    const isAvailable =
      availableStack &&
      availableStack.properties &&
      availableStack.properties.majorVersions &&
      availableStack.properties.majorVersions.find(majorVersion => majorVersion.displayVersion === minorVersion.value);

    if (os === 'linux' && minorVersion.stackSettings.linuxRuntimeSettings !== undefined) {
      if (isAvailable || minorVersion.stackSettings.linuxRuntimeSettings.isDeprecated) {
        this._addNewMinorVersionLinuxRuntime(newMajorVersion, minorVersion);
      }
    } else if (os === 'windows' && minorVersion.stackSettings.windowsRuntimeSettings !== undefined) {
      if (isAvailable || minorVersion.stackSettings.windowsRuntimeSettings.isDeprecated) {
        this._addNewMinorVersionWindowsRuntime(newMajorVersion, minorVersion);
      }
    } else {
      if (isAvailable) {
        this._addNewMinorVersionRuntime(newMajorVersion, minorVersion);
      } else if (
        minorVersion.stackSettings.linuxRuntimeSettings !== undefined &&
        minorVersion.stackSettings.linuxRuntimeSettings.isDeprecated &&
        minorVersion.stackSettings.windowsRuntimeSettings !== undefined &&
        minorVersion.stackSettings.windowsRuntimeSettings.isDeprecated
      ) {
        this._addNewMinorVersionRuntime(newMajorVersion, minorVersion);
      } else if (
        minorVersion.stackSettings.linuxRuntimeSettings !== undefined &&
        minorVersion.stackSettings.linuxRuntimeSettings.isDeprecated
      ) {
        this._addNewMinorVersionLinuxRuntime(newMajorVersion, minorVersion);
      } else if (
        minorVersion.stackSettings.windowsRuntimeSettings !== undefined &&
        minorVersion.stackSettings.windowsRuntimeSettings.isDeprecated
      ) {
        this._addNewMinorVersionWindowsRuntime(newMajorVersion, minorVersion);
      }
    }
  }

  private _addNewMinorVersionRuntime(
    newMajorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>,
    minorVersion: WebAppMinorVersion<WebAppRuntimes>
  ) {
    const newMinorVersion: WebAppMinorVersion<WebAppRuntimes> = {
      displayText: minorVersion.displayText,
      value: minorVersion.value,
      stackSettings: {
        linuxRuntimeSettings: minorVersion.stackSettings.linuxRuntimeSettings,
        windowsRuntimeSettings: minorVersion.stackSettings.windowsRuntimeSettings,
      },
    };
    newMajorVersion.minorVersions.push(newMinorVersion);
  }

  private _filterOnPremContainerStacks(
    azureStacks: WebAppStack<JavaContainers>[],
    availableStacks: any[],
    os?: 'linux' | 'windows'
  ): WebAppStack<WebAppRuntimes | JavaContainers>[] {
    const filteredStacks: WebAppStack<WebAppRuntimes | JavaContainers>[] = [];
    azureStacks.forEach(azureStack => {
      const newStack = this._buildNewStack(azureStack);
      azureStack.majorVersions.forEach(majorVersion => {
        const newMajorVersion = this._buildNewMajorVersion(majorVersion);
        majorVersion.minorVersions.forEach(minorVersion => {
          const correspondingAvailableStack = availableStacks.find(availableStack => {
            return availableStack.name && availableStack.name.contains(azureStack.value);
          });
          this._addCorrectMinorVersionsForOnPremContainers(newMajorVersion, minorVersion, correspondingAvailableStack, os);
        });
        this._addMajorVersion(newStack, newMajorVersion);
      });
      this._addStack(filteredStacks, newStack);
    });
    return filteredStacks;
  }

  private _addCorrectMinorVersionsForOnPremContainers(
    newMajorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>,
    minorVersion: WebAppMinorVersion<JavaContainers>,
    availableStack: any,
    os?: 'linux' | 'windows'
  ) {
    const isAvailable =
      availableStack &&
      availableStack.properties &&
      availableStack.properties.majorVersions &&
      availableStack.properties.majorVersions.find(majorVersion => majorVersion.displayVersion === minorVersion.value);

    if (os === 'linux' && minorVersion.stackSettings.linuxContainerSettings !== undefined) {
      if (isAvailable || minorVersion.stackSettings.linuxContainerSettings.isDeprecated) {
        this._addNewMinorVersionLinuxContainer(newMajorVersion, minorVersion);
      }
    } else if (os === 'windows' && minorVersion.stackSettings.windowsContainerSettings !== undefined) {
      if (isAvailable || minorVersion.stackSettings.windowsContainerSettings.isDeprecated) {
        this._addNewMinorVersionWindowsContainer(newMajorVersion, minorVersion);
      }
    } else {
      if (isAvailable) {
        this._addNewMinorVersionContainer(newMajorVersion, minorVersion);
      } else if (
        minorVersion.stackSettings.linuxContainerSettings !== undefined &&
        minorVersion.stackSettings.linuxContainerSettings.isDeprecated &&
        minorVersion.stackSettings.windowsContainerSettings !== undefined &&
        minorVersion.stackSettings.windowsContainerSettings.isDeprecated
      ) {
        this._addNewMinorVersionContainer(newMajorVersion, minorVersion);
      } else if (
        minorVersion.stackSettings.linuxContainerSettings !== undefined &&
        minorVersion.stackSettings.linuxContainerSettings.isDeprecated
      ) {
        this._addNewMinorVersionLinuxContainer(newMajorVersion, minorVersion);
      } else if (
        minorVersion.stackSettings.windowsContainerSettings !== undefined &&
        minorVersion.stackSettings.windowsContainerSettings.isDeprecated
      ) {
        this._addNewMinorVersionWindowsContainer(newMajorVersion, minorVersion);
      }
    }
  }

  private _addNewMinorVersionContainer(
    newMajorVersion: WebAppMajorVersion<WebAppRuntimes | JavaContainers>,
    minorVersion: WebAppMinorVersion<JavaContainers>
  ) {
    const newMinorVersion: WebAppMinorVersion<JavaContainers> = {
      displayText: minorVersion.displayText,
      value: minorVersion.value,
      stackSettings: {
        linuxContainerSettings: minorVersion.stackSettings.linuxContainerSettings,
        windowsContainerSettings: minorVersion.stackSettings.windowsContainerSettings,
      },
    };
    newMajorVersion.minorVersions.push(newMinorVersion);
  }

  private async _getAvailableStacksWindows(authToken: string) {
    try {
      const url = `${this.config.get('ARM_ENDPOINT')}/providers/Microsoft.Web/availableStacks/?api-version=${
        Constants.AntaresApiVersion20181101
      }&ostypeselected=windows`;
      const config = {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      };
      const r = await this.httpService.get(url, config);
      return r && r.data ? r.data.value : [];
    } catch (err) {
      this.logService.error(`Failed to retrieve available windows stacks.`);

      if (err.response) {
        throw new HttpException(err.response.data, err.response.status);
      }
      throw new HttpException('Internal Server Error', 500);
    }
  }

  private async _getAvailableStacksLinux(authToken: string) {
    try {
      const url = `${this.config.get('ARM_ENDPOINT')}/providers/Microsoft.Web/availableStacks/?api-version=${
        Constants.AntaresApiVersion20181101
      }&ostypeselected=linux`;
      const config = {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      };
      const r = await this.httpService.get(url, config);
      return r && r.data ? r.data.value : [];
    } catch (err) {
      this.logService.error(`Failed to retrieve available linux stacks.`);

      if (err.response) {
        throw new HttpException(err.response.data, err.response.status);
      }
      throw new HttpException('Internal Server Error', 500);
    }
  }
}
