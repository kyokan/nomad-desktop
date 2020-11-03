#!/usr/bin/env bash

if [ "$(uname)" != "Darwin" ]; then
  echo "This command only works on Darwin."
fi

rm -rf "$HOME/Library/Application Support/nomad-ui"