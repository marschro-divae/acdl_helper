# Adobe Client Data Layer Helper Library (acdl_helper)
 
## 01 - PURPOSE
___
The [Adobe Client Data Layer (ADCL)](https://github.com/adobe/adobe-client-data-layer) is part of the wcm core components by Adobe.
The ACDL is an event-driven call-stack storage. Everything that happens on a website, like the page-load itself, user-behaviour like clicks or results from more complex components (configrators etc.) should be pushed as events to the ACDL array.


The main advantage of this approach is, that there is a state of events and probably more relavant, we can handle the often frustrating asynchrony of dependencies and things that could happen on modern websistes.


As the ACDL itself does not handle dependencies an integrations for us, avery project has to implement additional glue-code that binds things together. In order to make this a bit more conventient this library tries to provide some of the most used convenience features and functionalities.


## 02 - ARCHITECTURE
___
- This Library is independant and has to brought to the project as simple clientlib, which is integrated via the base page template of the project (i.e. customfooterlibs.html).
- The library provides core functionalities and some basic plugins.
- Every additional or project specific implementation has to be implemented via plugins.
- The library is **not** persistent over several server-roundtrips and as such, does not solve problems in single-page applications.


## 03 - DEVELOPMENT SETUP
___
### 1. Prerequisites
- node 16

### 2. Build
1. Clone this repo

2. Then install all dependencies
    ```
    npm install
    ```

3. Last step: Start the dev server and the dev build by
    ```
    npm run dev
    ```
DONE ! - go visit [localhost:3000](http://localhost:3000)

- Following command also starts the server, but with clientlibs, build for prod
  ```
  npm run prod
  ```

- Just want to build prod clientlibs?
  ```
  npm run build:prod
  ```

### 4. Test 
TODO !

## 04 - Usage and core api
---
The `acdl_helper` library is available at the global ```window``` object. 
The library has to be instantiated and configures before its first usage
```javascript
const config = {
  env: 'development',
  event_prefix: 'acdl_helper',
  dependencies: ['launch:loaded'],
  plugins: []
}
acdl_helper(config)
```

Right after initialization, `window.acdl_helper` provides it core functionality and plugins (if installed and configured) 

The singleton exposes two different kind of functionality: Functionality, that needs the current ```event```, that it should act on. Those functionalities are served after passing the current event to the event *catcher* method. 

For example, setting the emitter of the currently handled event as the page reference, we first have to catch the event, before acting on it:
```acdl_helper.singleton().catch(event).set_page_reference()```

Also, the singleton exposes functionality that does not need an event but acts on general tracking data, such as the consent or the page informations

## 05 - PLUGINS

Provided standard libraries are: 

- [cleanup](/src/plugins/cleanup/README.md)
- [clickables](/src/plugins/clickables/README.md)
- [page](/src/plugins/page/README.md)
- [user](/src/plugins/user/README.md)
- [usercentrics](/src/plugins/usercentrics/README.md)

Project specific behaviour should be provided as custom plugin
Feel also free, to contribute to nthis repo with you custom plugin :)

