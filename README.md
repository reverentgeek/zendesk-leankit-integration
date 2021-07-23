# zendesk-leankit-integration

Integration to sync Zendesk to LeanKit board

## Setup

* Install dependencies with `npm install`
* Copy `.env.sample` to `.env`
* Configure account settings in `.env`

## Usage

```sh
Usage: zdsync [options]

Synchronize the latest Zendesk tickets to LeanKit

Options:
  -V, --version          output the version number
  -t, --ticket <ticket>  manually sync one ticket
  -q, --query-only       list the tickets
  -h, --help             display help for command
```

Sync all recent tickets:

```sh
node .
```

Sync specific ticket:

```sh
node . -t 6070813
```
