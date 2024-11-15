# Adobe Client Data Layer Helper Library (acdl_helper)

## 01 - PURPOSE

---

The [Adobe Client Data Layer (ADCL)](https://github.com/adobe/adobe-client-data-layer) is part of the wcm core components by Adobe.
The ACDL is basically an event-queue. Everything, happening on a website, like the page-load itself, user-behaviour like clicks or results from more complex components (like configurators etc.) should be pushed as events to the ACDL.

The main advantage of this approach is, that we have a state of events and a chronological order of events with which, we can handle the often frustrating randomnes and asynchronicity of dependencies.

As the ACDL itself does not handle dependencies and integrations for us, every project has to implement additional glue-code that binds things together. In order to make this a bit more convenient, this library tries to provide some of the most used features and functionalities.

## 02 - ARCHITECTURE

---

- This Library is independant and has to be brought to the project as simple clientlib, which is integrated via the base page template of the project (i.e. customfooterlibs.html).
- The library provides core functionalities and some basic plugins.
- Every additional or project specific implementation has to be implemented via plugins.
- The library is **not** persistent over several server-roundtrips and as such does not solve problems in single-page applications.

## 03 - CRX-Package Releases

---

Latest version to be found here: [crx-package releases](/crx-package/)

## 03 - DEVELOPMENT SETUP

---

### 1. Prerequisites

- node > v16
- npm
- git
- java 11 (optional, if crx-package should be build)
- maven (optional, if crx-package should be build)

### 2. Run development environment

1. Clone this repo

2. Update `.env_template` file with appropriate values and rename to `.env`

3. Then install all dependencies

   ```
   npm install
   ```

4. Last step: Start the dev server and the dev build by
   ```
   npm start
   ```
   DONE ! - go visit [localhost:3000](http://localhost:3000)

- Following command also starts the server, but with js files, build for prod

  ```
  npm run serve:prod
  ```

### 3. Build Artefacts

- Simply build production-ready js-files => `dist` folder

  ```
  npm run build:prod
  ```

- Build clientlibs, ready to add to an AEM projects clientlib folder => `jcr_root` folder

  ```
  npm run build:clientlibs
  ```

- Build CRX content package to be installed via crx-package manager => [`crx-package` releases folder](/crx-package/)
  ```
  npm run build:crxbundle
  ```

### 4. Adobe Experience Manager Clientlib integration

- **AEM htl**

  Whether you integrated the clientlib via the frontend-build process or installed the latest [crx-packag](/crx-package/), use the AEM clientlib integration with categories `[acdl_helper]` and type `module`

  ```html
  <sly data-sly-call="${clientlib.js @ categories=['acdl_helper'], type='module'}"></sly>
  ```

- **Any other regular html website**

  ```html
  <script type="application/javascript" src="/path/to/acdl_helper.js" async defer></script>
  ```

### 5. Test

Coming soon... ;-)

## 04 - Usage and Core API

---

### Alternative Integrations

1. The easiest way is to install the acdl_helper [latest release](/crx-package/) via crx-package manager
   - Projects without crx access, may want to unclude the package delivery via the build-process
2. Include via jsdelivr from github develop branch
   - Change the version partial of the past to load other versions (first available is `1.5.0`),

```html
<script
  src="https://cdn.jsdelivr.net/gh/marschro-divae/acdl_helper@develop/release/1.5.0/acdl_helper.js"
  async
></script>
```

### Initialization

The `acdl_helper` library is available at the global `window` object.
The library has to be instantiated and configured before its first usage.

The configuration (initialization) is done in an Adobe Data Collection rule.

You basically should create two rules:

1. `0 - Library Loaded | 50 => Custom Code => Push Launch Loaded`
   - EVENT: Core - Library Loaded (Page Top)
   - CONDITION: none
   - ACTION: Custom Code
     ```javascript
     window.adobeDataLayer = window.adobeDataLayer || []
     window.adobeDataLayer.push({ event: "launch:loaded" })
     ```
2. `DataLayer Event | 50 => acdl_helper:loaded => Config Helper Library`
   - EVENT: Adobe Client Data Layer => Data Pushed => Listen to: `acdl_helper:loaded`
   - CONDITION: none
   - ACTION: Custom Code
     ```javascript
     // Example config object iwth optional config for 'page-plugin'
     const config = {
       env: "development",
       event_prefix: "acdl_helper",
       dependencies: ["launch:loaded"],
       plugins: {
         page: {
           component_types: [{ "@type": "*/components/page*" }],
           page_load_event: "load",
         },
       },
     }
     acdl_helper(config)
     ```

See also: [Example Adobe Data Collection Property](https://experience.adobe.com/#/@provisionemeaptrsd/data-collection/tags/companies/COf862d022704d4b11a91f844bd6b34b65/properties/PRcf885ce23978419abc8a3730d71e5eed/overview)

**Config options**

- `env`

  - default: **"development"**
  - description: if set to development, you get a bunch of log messages

- `event_prefix`

  - default: **"acdl_helper"**
  - description: defines the prefix for events, pushed by the lib to the dataLayer

- `dependencies`

  - default: **['launch:loaded']**
  - description: Array of events that should all be received, before initialization
  - remark: Setting this, completely overrides the default (no merge)

- `plugins`:
  - default: **{}**
  - description: Object of plugins to be used
  - remark: Plugins are configured as objects with plugin-identifier as key and config oject as value

Right after initialization, `window.acdl_helper` provides its core functionality and plugins (if installed and configured)

### Core API

The core of the `acdl_helper` basically provides one simple function `catch()` which _catches_ the current adobeDataLayer push-event. This event is mostly processed in the Adobe Launch event-lifecycle by the [Adobe Client Data Layer Extension](https://exchange.adobe.com/apps/ec/104231).

After catching the event, the returned `get()` function provides the state of the component, that emitted the event - this could be any component (also the page, which is just a special component)

```javascript
acdl_helper.catch(event).get() // returns full state of the component
acdl_helper.catch(event).get("dc:title") // returns the field 'dc:title' from emitting component
acdl_helper.catch(event).get({ "@type": "*/components/page/content" }, "dc:title") // only gets the 'dc:title' if the test-object provided as first argument is fullfilled
```

Where and when to use? - i.e. the `adcl_helper` can be used in custom code blocks in Launch, when setting a _Data Element_, or in any other custom code block, where we need to extract data from the dataLayer or the dataLayer-event.

This leverages the complexity to figure out the _pathInfo_ from the event and get the state of the emitting component by its _pathInfo_ value (which creates a lot of redundant boilerplate custom code in Launch). We now can do this in just one simple function call. This is as convenient as getting the `event.detail` which we are used to when dealing with CustomEvents.

**⚠️ BEWARE** - All this only makes sense, if you catch _dataLayer-events_. Other events like native click events have nothing to do with _dataLayer-events_ and are not further processed by the `acdl_helper`. In development mode, you get a warning in the console, when you accidentally catch and try to process native or custom events.

## 05 - PLUGINS

Project specific behaviour should be provided as custom plugin.
Feel free, to contribute to this repo with you custom plugin :)

```javascript
// Example for 'page' plugin
acdl_helper.page // the namespace of the 'page' plugin
acdl_helper.page.get() // example for a provided function of the 'page' plugin
```

Plugins that provide functionalities are available in their namespace (plugin identifier).  
Usage and documentation on plugins is found in the plugin documentation.

Provided standard plugins are:

- [cleanup](/src/plugins/cleanup/README.md)
- [clickables](/src/plugins/clickables/README.md)
- [component](/src/plugins/component/README.md)
- [page](/src/plugins/page/README.md)
- [user](/src/plugins/user/README.md)
- [usercentrics](/src/plugins/usercentrics/README.md)
