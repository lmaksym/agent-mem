# Collaboration & Sharing

## Track — git tracking control

Toggle whether `.context/` is tracked in the project's git repo:
```bash
actx track              # show current tracking status
actx track --enable     # add .context/ to project git
actx track --disable    # remove .context/ from project git
```

## Push / Pull — remote sync

Sync `.context/` to a separate remote (independent of project git):
```bash
actx push                      # push to configured remote
actx push --remote <url>       # push to specific remote
actx pull                      # pull from configured remote
actx pull --remote <url>       # clone/pull from specific remote
```

## Share / Import — portable snapshots

Generate a portable snapshot of your context for sharing with teammates or other agents:
```bash
actx share                     # generate snapshot file
actx share --output path.json  # custom output path
```

Import a shared snapshot:
```bash
actx import <file>             # import shared snapshot into .context/
```
