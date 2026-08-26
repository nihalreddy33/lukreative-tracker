#!/bin/zsh
# Launch the dev server with the project's Node toolchain, from the project
# directory, regardless of where this script is invoked from.
cd "$(dirname "$0")" || exit 1
export PATH="/Users/nihalreddygurrala/Workspace/.tools/node-v22.14.0-darwin-arm64/bin:$PATH"
exec npm run dev
