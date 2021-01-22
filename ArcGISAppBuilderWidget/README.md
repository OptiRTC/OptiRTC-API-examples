# ArcGIS AppBuilder Widget Example

This is an example integration of Opti's Public API in [ArcGIS's
AppBuilder](https://developers.arcgis.com/web-appbuilder/guide/xt-welcome.htm).

The widget adds a point on the ArcGIS map for each Opti site, and places these points in a layer
for Opti Sites.  Each site's point on the map is clickable and opens an informational window that
renders charts with live time series data for each datastream at the site.

The example widget name is *OptiSites* and was created using `v2.16` of
ArcGIS's AppBuilder. *(See* `wabVersion` *in [./OptiSites/manifest.json](./OptiSites/manifest.json#L7))*

The widget's typescript source is in [./OptiSites](./OptiSites).

The content in [./dist](./dist) contains a built distribution of the widget that can be
[installed](#installation-of-widget) in your ArcGIS AppBuilder application.

## Setup for Development

```bash
npm install
```

## Build widget

```bash
npm run build
```

## Installation of widget

### Adding Opti Sites widget to the Header Controller (From Web AppBuilder for ArcGIS editor)

These are steps to make the Opti Site's widget visible inside ArcGIS's Web
AppBuilder's editor used to create applications.

1. Copy contents of [./dist](./dist) into your `client/stemapp/widgets` dir of your install
   of [Web AppBuilder For ArcGIS version `2.16`](https://developers.arcgis.com/web-appbuilder/guide/getstarted.htm)
2. Go to **Widget** tab in AppBuilder
3. Click **+** to add widget and select **Opti Sites Widget**
4. Configure the Opti Sites widget.
    * Set Opti Public API Key
    * Choose whether to Zoom to fit Opti Sites when loaded
    * Choose whether to make Opti Sites visible on start
5. Finally, select "Open this widget automatically when the app starts"

### Adding Opti Sites widget to `widgetOnScreen` widgets

> `widgetOnScreen` widgets are widgets that load automatically when the app starts.
> These typically include Home, Zoom Slider (+/-) buttons, Search, Attribute Table, ...

1. Verify [Web AppBuilder For ArcGIS version
   `2.16`](https://developers.arcgis.com/web-appbuilder/guide/getstarted.htm) is
   being used.
2. Copy contents of [./dist](./dist) into your `/widgets` dir of your app's directory.
3. Edit the `config.json` in the root of the app’s directory, and in the
   `widgetOnScreen.widgets` array, add this definition:

    ```json
    {
      "name": "OptiSites",
      "version": "2.16",
      "IsController": false,
      "uri": "widgets/OptiSites/Widget",
      "config": "configs/OptiSites/config_widgets_OptiSites_Widget_20.json",
      "id": "widgets_OptiSites_Widget_20",
      "position": {}
    }

    ```
4. Add `configs/OptiSites/config_widgets_OptiSites_Widget_20.json`

   ```json
   {
     "optiAPIKey": "Your public key here",
     "zoomToFitOptiSites": true
   }
   ```

### Adding Opti Sites widget to `widgetPool` widgets

> `widgetPool` widgets are widgets that appear in the top level controller of
> the application.  These typically include the Legend and Layer List widgets.

1. Verify [Web AppBuilder For ArcGIS version
   `2.16`](https://developers.arcgis.com/web-appbuilder/guide/getstarted.htm) is
   being used.
2. Copy contents of [./dist](./dist) into your `/widgets` dir of your app's directory.
3. Edit the `config.json` in the root of the app’s directory, and in the
   `widgetPool.widgets` array, add this definition:

    ```json
    {
      "name": "OptiSites",
      "version": "2.16",
      "IsController": false,
      "uri": "widgets/OptiSites/Widget",
      "config": "configs/OptiSites/config_widgets_OptiSites_Widget_20.json",
      "id": "widgets_OptiSites_Widget_20",
      "index": 7,
      "openAtStart": true
    }
    ```
4. Add `configs/OptiSites/config_widgets_OptiSites_Widget_20.json`

   ```json
   {
     "optiAPIKey": "Your public key here",
     "zoomToFitOptiSites": true
   }
   ```

## Notes about dependencies

### Dependencies:

In addition to [AMD modules](https://github.com/amdjs/amdjs-api) provided by
ArcGIS's AppBuilder, this example widget has 2 dependencies (non development dependencies):

* [cross-fetch](https://github.com/lquixada/cross-fetch): A WHATWG Fetch API
  for older environments that do not support
  [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
* [dygraphs](https://github.com/danvk/dygraphs): A library for rendering time
  series charts of data from Opti's public API.

These dependencies are included in [./OptiSites/js](./OptiSites/js) folder and
this is where the widget imports these dependencies from. It is the general practice
for ArcGIS AppBuilder widgets to import 3rd party vendor scripts this way.

These dependencies are also specified in the [package.json](./package.json) and installed by
`npm install`. The content installed by `npm` into `node_modules` is only used for development.
Some use cases for copies in `npm_modules` include typescript definitions, `npm outdated` & `npm audit`,
or to inspect their licenses.  If upgraded using `npm`, be sure to update the applicable scripts in
[./OptiSites/js](./OptiSites/js) because that's where AppBuilder's widget imports them.

### Development Dependencies:

Other `devDependencies` are specified in the [package.json](./package.json) and
installed with `npm install`.

Notes about `devDependencies`:
* includes typescript definitions
* ArcGIS AppBuilder uses version 3 of the `arcgis-js-api`, and not the more
  recent version 4.
  > Do not upgrade the type definitions `@types/arcgis-js-api` to v4.x because
  > there are breaking changes in v4.
* [momentjs](https://momentjs.com) is included in ArcGIS's AppBuilder.  It is
  available for `import` into the widget source.  The only reason for including
  it as a `devDependency` is for its type definitions.

## Additional Developer Notes:

* There are known issues with ArcGIS's Typescript type definitions in v3 of the
  `arcgis-js-api` and AppBuilder.
  * It is helpful to reference the API docs in addition to the typescript
    definitions
    * [ArcGIS API for Javascript v3.x](https://developers.arcgis.com/javascript/3/jsapi/)
    * [ArcGIS Web AppBuilder Guide](https://developers.arcgis.com/web-appbuilder/guide/getstarted.htm)
    * [ArcGIS Web AppBuilder API Reference](https://developers.arcgis.com/web-appbuilder/api-reference/css-framework.htm)
    * [ArcGIS Web AppBuilder Sample Code](https://developers.arcgis.com/web-appbuilder/sample-code/create-custom-in-panel-widget.htm)
  * In some examples, there is incorrect syntax for the [Dojo Toolkit](https://dojotoolkit.org/)'s `inherited()` method.
    * [Stack Overflow](https://stackoverflow.com/questions/33208956/dojo-error-when-using-this-inheritedarguments-in-strict-mode)
      describes fix.  The first argument must be a reference to the calling function.
      For example: in `Widget.ts:postCreate()`, it should be `self.inherited(Widget.prototype.postCreate, arguments);`
* The more recent ES6 property getters/setters inside classes are sometimes problematic.  AppBuilder is based on Dojo and
  there are edge cases where Dojo's mixin mechanism used for creating widgets breaks.
  > Instead use a method rather than a property getter and/or setter.
