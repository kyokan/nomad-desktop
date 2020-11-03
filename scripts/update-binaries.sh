#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
TOKEN="$GH_TOKEN"
function gh_curl() {
  curl -sL -H "Authorization: token $TOKEN" \
       -H "Accept: application/vnd.github.v3.raw" \
       $@
}

function download_binaries() {
  REPO="kyokan/fnd"
  PLATFORM=$1
  ARCH=$2
  FILE="fnd-$PLATFORM-$ARCH"      # the name of your release asset file, e.g. build.tar.gz
  VERSION=staging                       # tag name or the word "latest"
  GITHUB_API_ENDPOINT="api.github.com"

  alias errcho='>&2 echo'

  if [ "$VERSION" = "latest" ]; then
    # Github should return the latest release first.
    PARSER=".[0].assets | map(select(.name == \"$FILE\"))[0].id"
  else
    PARSER=". | map(select(.tag_name == \"$VERSION\"))[0].assets | map(select(.name == \"$FILE\"))[0].id"
  fi

  ASSET_ID=`gh_curl https://$GITHUB_API_ENDPOINT/repos/$REPO/releases | jq "$PARSER"`
  if [ "$ASSET_ID" = "null" ]; then
    echo "ERROR: version not found $VERSION"
    exit 1
  fi

  curl -sL --header 'Accept: application/octet-stream' https://$TOKEN:@$GITHUB_API_ENDPOINT/repos/$REPO/releases/assets/$ASSET_ID > $DIR/../electron/resources/$FILE
}

download_binaries "darwin" "x64"
download_binaries "linux" "x64"
