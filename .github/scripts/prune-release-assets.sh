#!/usr/bin/env bash
# Remove superseded builds from a rolling release before new ones are uploaded.
#
# Build zips are named <family>-<short sha>.zip or <family>-<short sha>-debug.zip.
# The sha makes every name unique, so uploading never overwrites an older build,
# and the rolling "latest" release grows by a full set of builds on every push
# until GitHub's 1000-assets-per-release limit rejects the upload.
#
# For each file about to be uploaded, this deletes release assets of the same
# family and kind whose sha is a different one. Assets of other families
# (other platforms' workflows) are left alone.
#
# Usage: prune-release-assets.sh <tag> <full commit sha> <artifact dir>
# Needs GH_TOKEN with contents: write, and GITHUB_REPOSITORY.
set -euo pipefail

tag=$1
sha=$2
dir=$3
repo=${GITHUB_REPOSITORY:?}

if ! release_id=$(gh api "repos/$repo/releases/tags/$tag" --jq .id 2>/dev/null); then
  echo "No release '$tag' yet; nothing to prune."
  exit 0
fi

mapfile -t assets < <(gh api --paginate "repos/$repo/releases/$release_id/assets?per_page=100" \
  --jq '.[] | "\(.id) \(.name)"')
echo "Release '$tag' has ${#assets[@]} assets."

name_re='^(.+)-([0-9a-f]{7,40})(-debug)?(\.[A-Za-z0-9.]+)$'
deleted=0
for file in "$dir"/*; do
  name=$(basename "$file")
  if ! [[ $name =~ $name_re ]] || [[ $sha != "${BASH_REMATCH[2]}"* ]]; then
    echo "Skipping $name: no '-<sha of this commit>' in its name."
    continue
  fi
  family=${BASH_REMATCH[1]}
  kind="${BASH_REMATCH[3]}${BASH_REMATCH[4]}"
  for asset in "${assets[@]}"; do
    id=${asset%% *}
    asset_name=${asset#* }
    [[ $asset_name == "$name" ]] && continue
    [[ $asset_name =~ $name_re ]] || continue
    if [[ ${BASH_REMATCH[1]} == "$family" && "${BASH_REMATCH[3]}${BASH_REMATCH[4]}" == "$kind" ]]; then
      echo "Deleting superseded $asset_name"
      gh api -X DELETE "repos/$repo/releases/assets/$id" --silent
      deleted=$((deleted + 1))
    fi
  done
done
echo "Deleted $deleted superseded assets."
