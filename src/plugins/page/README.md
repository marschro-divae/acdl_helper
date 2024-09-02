# Plugin - page

## Description

According to the Adobe core-components documentation, any component that somehow shows up, can push the event `cmp:show` to the adobeDataLayer (slider-items, etc).
This is also true for the page component itself.

So, in order to get the page data, you have to listen for all `cmp:show` adobeDataLayer-events, get its `pageInfo` reference, get the state of this referenced component, then check, if the `@type` is probably of a type, that reveals that it is the page-component, and if thats the case, you can access the page data. And all this effort just to get such a simple information like the `dc:title` field of the page.

This plugin helps you to do the 'heavy-lifting'. It listens for the `cmp:show` event, resolves the component type and simply provides you a convenient accessor for the page properties. It also pushes a customizable 'page-load' event to the adobeDataLayer if all is done.

The page-load event, that is pushed to the dataLayer by this plugin can also be made dependent on other dataLayer events in order to solve asynchronous challenges (see config documentation below).

- `name`: page
- `dependencies`: none
- `events`: ['cmp:show']

## Installation & Config

```javascript
// Example
plugins: [
  page: {
    component_types: [
      { '@type': '*/components/page' },
      { '@type': '*/components/page/content' },
      { '@type': '*/components/page/press' },
      { '@type': '*/components/page/event' },
      { '@type': '*/components/global/integrator-page' },
      { '@type': '*/components/global/page' }
    ],
    page_load_event: 'load',
    page_load_dependencies: [
      'user:loaded',
      { event: 'cart:loaded', cond: { '@type': '*/components/page/cart' } },
      { event: 'blog:comment:loaded', cond: { '@type': '*components/page/blog*' } },
      { event: 'some:fancy:event', cond: {'dc:title': 'Home'} },
    ],
    cid_mapping: {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
      utm_id: "",
    },
	}
]

// => result
// provides functionalities for accessing page properties - see Providers, below
```

**Config**

- `component_types`:

  - Array of tests, that define the component-type
  - One could also simply use wildcards such as `'*components/page*'` - then all other cases are matched and you do not have to list all types, that identify a page.

- `page_load_event`:

  - the configurable part of the event-name that is pushed to the adobeDataLayer

- `page_load_dependencies`:

  - Array of dataLayer events. i.e. `['user:authenticated', 'cart:loaded']`
  - As a result, the acdl_helper page-load event will not be pushed to the dataLayer before those events were pushed to the dataLayer.
  - This is useful for asynchronous loaded states on the website, like user-login state or asynchrounous loaded shopping-carts, where one wants to make sure, that the page-load is not triggered before those informations are already in the dataLayer, in order to be send along with the first page-load event.
  - It is also possible to formulate advanced conditions test-objects:
    ```javascript
    // the page-load is not pushed to the dataLayer, before the event
    // 'blog:comment:loaded' has arrived in the dataLayer
    // The conditions says, that this should only be considered, if the page @type is a blog
    { event: 'blog:comment:loaded', cond: { '@type': '*components/page/blog*' } },
    ```
  - ⚠️ ATTENTION: If the defined `page_load_dependencies` event(s) will never be pushed to the dataLayer the `acdl_helper` page-load event will never be pushed! Make sure, that the `page_load_dependencies` events are relaiable emitted (i.i if the user is not logged in, the event has to be also pushed to the dataLayer but with a different state - for example: _false_) - If that happens, the pageLoad is pushed before the page is left via an attacched `beforeunload` listener. But its absolutely not guaranteed, that analytics data will be send successfully.

- `cid_mapping`:

  - An object that allows to list all query parameters that should be merged into the campaign id (cid), a `:` seperated string of campaign informations
  - The order of the object properties define the order in the cid string. I.E:
  - ```javascript
    /*
      Given query parameters are:
      http://localhost:3000/?utm_source=linkedIn&utm_medium=banner&utm_campaign=apply_for_groundservices&utm_id=12345&utm_term=jobsearch&utm_content=variant+A
    */

    /*
      The configured Mapping
    */
    cid_mapping: {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
      utm_id: "",
    },

    // Result
    const result_cid = "linkedIn:banner:apply_for_groundservices:jobsearch:variant+A:12345"

    /*
      Further explanation:
      Putting the `utm_id` as first property in the object would the result in a cid-string with the utm_id set to the first place
      (Order is important for later re-structuring via classification rule sets!)
    */
    ```

  - This object is not bound to the classical `utm parameters`. You can extend the object as desired in order to parse query parameters to the `cid`

  - HINT!

    ⚠️ Make sure to create a classification ruleset in Adobe Analytics for de-structuring
    the campaign informations again into the classification fields of the campaign variable (v0)

    Like in the example below:

    ![Example classification rule set](/server/assets/images/classification_rule_example.png)

## Providers

```javascript
acdl_helper.page.get() // returns the page properties
```

## Release Notes

### v1.4.0

- Configurable campaign query parameter to cid parsing

### v1.3.0

- More sophisticated page-load dependency management with testable objects

### v1.2.0

- Feature: Dependencies for the acdl_helper page-load event - handle with care...
