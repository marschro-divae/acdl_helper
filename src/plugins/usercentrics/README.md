# Plugin - usercentrics

## Description
If you want to sync the consent, collected by the Usercentrics UI, with the adobe optIn framework, this is the right plugin for you.

It requires, that [Adobe Experience Cloud ID Extension](https://exchange.adobe.com/apps/ec/100160/adobe-experience-cloud-id-launch-extension) is configured in Adobe Launch and thereby, the `window.adobe.optIn` framework is globally available.

On the Usercentrics side, Usercentrics has to be [configured](https://docs.usercentrics.com/#/v2-events) to push its `consent_status` events to the `adobeDataLayer` whenever consent changes.

A configurable Protocol, which matches *Usercentrics Service-Names* with `adobe.optIn.Categories`, is then used by the plugin to sync Usercentrics consent-states with adobe consent-states.

- `name`: usercentrics
- `dependencies`: ['consent_status', 'launch:loaded']
- `events`: ['consent_status']

## Installation & Config
```javascript
// Example
plugins: [
  usercentrics: {
    protocol: {
      'Adobe Analytics': 'ANALYTICS',
      'Adobe Target': 'TARGET'
    },
    push_after: 'acdl_helper:cleanup'
  },
]

// => result
// consent is synced automatically
```
**Config**
- `protocol`: 
	- Object with *key:value*, where 
        - `key` = Usercentrics Service Name (please make sure there is no invisible whitespace configured in service names)
        - `value` = Adobe optIn Category
    - ⚠️ ECID is configured implicit and must not be part of the protocol. If at least one adobe service has consent, ECID is implcitly activated. If all services are denied, ECID is also denied. Configure it as a sub-service for your adobe services in Usercentrics

- `push_after`: 
	- after adobe optIn is complete, you can optionally configure an event, that is pushed to the adobeDataLayer
    - Hint: often used together with the [cleanup plugin](/src/plugins/cleanup/README.md) in order to clean up the adobeDataLayer after every usercentrics push. Usercentrics pushes a lot of unwanted stuff to the adobeDataLayer. If you do not want to see those properties, configure with `acdl_helper:cleanup`


## Providers
```javascript
acdl_helper.usercentrics.get_active_language() // return active language set for Usercentrics UI
acdl_helper.usercentrics.get_base_info() // return base consent-service info
async acdl_helper.usercentrics.get_full_info() // async return full consent-service info
```
