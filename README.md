# zendesk-leankit-integration

Integration to sync Zendesk to LeanKit board

## Setup

* Install dependencies with `npm install`
* Copy `.env.sample` to `.env`
* Configure account settings in `.env`

## Usage

Sync all recent tickets:

```sh
node .
```

Sync specific ticket:

```sh
node . -t 6070813
```
