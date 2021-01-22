// JIMU (WAB) imports:

//@ts-ignore jimu/BaseWidgetSetting exists
import BaseWidgetSetting from 'jimu/BaseWidgetSetting';

// DeclareDecorator - to enable us to export this module with Dojo's "declare()" syntax so WAB can load it:
import declare from '../support/declareDecorator';

import type IConfig from '../interfaces/config';

interface ISetting {
  config?: IConfig;
}

/*eslint-disable @typescript-eslint/no-this-alias*/
/*eslint-disable prefer-rest-params*/
/*eslint-disable @typescript-eslint/unbound-method*/

@declare(BaseWidgetSetting)
class Setting implements ISetting {
  public baseClass: string = 'opti-sites-setting';
  public config: IConfig;

  private optiAPIKeyInput: HTMLInputElement;
  private zoomToFitOptiSitesInput: HTMLInputElement;
  private optiSitesLayerVisibleOnStartInput: HTMLInputElement;

  public postCreate(/*args: any*/): void {
    const self: any = this;
    self.inherited(Setting.prototype.postCreate, arguments);
    this.setConfig(this.config);
  }

  public setConfig(config: IConfig): void {
    this.optiAPIKeyInput.value = config.optiAPIKey;
    this.zoomToFitOptiSitesInput.checked = !!config.zoomToFitOptiSites;
    this.optiSitesLayerVisibleOnStartInput.checked = !!config.optiSitesLayerVisibleOnStart;
  }

  public getConfig(): IConfig {
    // WAB will get config object through this method
    return {
      optiAPIKey: this.optiAPIKeyInput.value,
      zoomToFitOptiSites: !!this.zoomToFitOptiSitesInput.checked,
      optiSitesLayerVisibleOnStart: !!this.optiSitesLayerVisibleOnStartInput.checked
    };
  }
}

export = Setting;
