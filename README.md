[![Docker Build Status](https://img.shields.io/docker/cloud/build/zxteamorg/devel.migration-runner-sqlite?label=Build%20Status)](https://hub.docker.com/r/zxteamorg/devel.migration-runner-sqlite/builds)
[![Docker Image Version](https://img.shields.io/docker/v/zxteamorg/devel.migration-runner-sqlite?sort=date&label=Version)](https://hub.docker.com/r/zxteamorg/devel.migration-runner-sqlite/tags)
[![Docker Image Size](https://img.shields.io/docker/image-size/zxteamorg/devel.migration-runner-sqlite?label=Image%20Size)](https://hub.docker.com/r/zxteamorg/devel.migration-runner-sqlite/tags)
[![Docker Pulls](https://img.shields.io/docker/pulls/zxteamorg/devel.migration-runner-sqlite?label=Pulls)](https://hub.docker.com/r/zxteamorg/devel.migration-runner-sqlite)
[![Docker Pulls](https://img.shields.io/docker/stars/zxteamorg/devel.migration-runner-sqlite?label=Docker%20Stars)](https://hub.docker.com/r/zxteamorg/devel.migration-runner-sqlite)
[![Docker Automation](https://img.shields.io/docker/cloud/automated/zxteamorg/devel.migration-runner-sqlite?label=Docker%20Automation)](https://hub.docker.com/r/zxteamorg/devel.migration-runner-sqlite/builds)

# Migration Runner SQLite

*Migration Runner SQLite* - Provides SQL migration pack executor against a SQLite database.

# Image reason

TDB

# Spec

## Environment variables

* `DATABASE_FILE` - Name of a SQLite database file (inside work directory). Default: **database.db**.
* `TARGET_VERSION` - Optional. Desired version.

## Volumes

* `/data/dist` - Root of your SQL migration pack
* `/data/work` - Work directory (where your SQLite database file located)

## Command line options

```
<install | rollback> [--no-sleep]
```

# Inside

* Alpine Linux
* NodeJS
* Migration Runner JS Script

# Launch

```bash
docker run --interactive --tty --rm --volume /path/to/database/migration:/data/dist --volume /path/to/database/.gen:/data/work zxteamorg/devel.migration-runner-sqlite
```

# Support

* Maintained by: [ZXTeam](https://zxteam.org)
* Where to get help: [Telegram Channel](https://t.me/zxteamorg)
