import re

with open(".github/workflows/build-binaries.yml", "r") as f:
    content = f.read()

# Replace publish steps with verification steps
# We want to add check logic before publishing to R2 and GitHub

content = content.replace(
'''      - name: Publish production channel to R2
        if: env.PUBLISH_PRODUCTION == 'true'
        run: |''',
'''      - name: Verify CI gate
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          if ! printf '%s\\n' "$BUILD_REF" | grep -Eq '^[0-9a-f]{40}$'; then
            echo "BUILD_REF must be a 40-character commit SHA, got: $BUILD_REF" >&2
            false
          fi

          result=$(gh api "repos/${GITHUB_REPOSITORY}/commits/${BUILD_REF}/check-runs?check_name=build-check-test" \\
            --jq 'if .check_runs | length == 0 then "pending" elif .check_runs[0].conclusion == null then "pending" else .check_runs[0].conclusion end')

          if [ "$result" != "success" ]; then
             echo "CI aggregate gate 'build-check-test' did not succeed for $BUILD_REF: $result" >&2
             false
          fi

      - name: Verify R2 and GitHub production artifacts drift
        if: env.PUBLISH_PRODUCTION == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          PRODUCTION_DIR=release-artifacts/production
          RELEASE_PREFIX="releases/v${PRODUCTION_VERSION}"

          # Check R2
          if existing_sums=$(aws s3 cp "s3://${R2_BUCKET}/${RELEASE_PREFIX}/SHA256SUMS" - --endpoint-url "$R2_ENDPOINT_URL" 2>/dev/null); then
             local_sums=$(cat "$PRODUCTION_DIR/SHA256SUMS")
             if [ "$existing_sums" != "$local_sums" ]; then
                echo "R2 checksum drift detected for v${PRODUCTION_VERSION}" >&2
                false
             fi
          fi

          # Check GitHub
          if existing_sums=$(gh release download "v${PRODUCTION_VERSION}" -p SHA256SUMS -O - 2>/dev/null); then
             local_sums=$(cat "$PRODUCTION_DIR/SHA256SUMS")
             if [ "$existing_sums" != "$local_sums" ]; then
                echo "GitHub release checksum drift detected for v${PRODUCTION_VERSION}" >&2
                false
             fi
          fi

      - name: Publish production channel to R2
        if: env.PUBLISH_PRODUCTION == 'true'
        run: |''')

content = content.replace(
'''      - name: Create production GitHub release
        if: env.PUBLISH_PRODUCTION == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          RELEASE_TAG="v${PRODUCTION_VERSION}"
          PRODUCTION_DIR=release-artifacts/production
          target_args=()
          if [ "$BUILD_REF" != "$RELEASE_TAG" ]; then
            target_args=(--target "$BUILD_REF")
          fi

          if gh release view "$RELEASE_TAG" >/dev/null 2>&1; then
            gh release upload "$RELEASE_TAG" "$PRODUCTION_DIR"/* --clobber
          else''',
'''      - name: Create production GitHub release
        if: env.PUBLISH_PRODUCTION == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          RELEASE_TAG="v${PRODUCTION_VERSION}"
          PRODUCTION_DIR=release-artifacts/production
          target_args=()
          if [ "$BUILD_REF" != "$RELEASE_TAG" ]; then
            target_args=(--target "$BUILD_REF")
          fi

          if gh release view "$RELEASE_TAG" >/dev/null 2>&1; then
            gh release upload "$RELEASE_TAG" "$PRODUCTION_DIR"/*
          else''')

content = content.replace(
'''      - name: Publish immutable beta artifacts to R2
        if: env.PUBLISH_BETA == 'true'
        run: |''',
'''      - name: Verify R2 beta artifacts drift
        if: env.PUBLISH_BETA == 'true'
        run: |
          BETA_DIR=release-artifacts/beta
          RELEASE_PREFIX="releases/v${BETA_VERSION}"

          if existing_sums=$(aws s3 cp "s3://${R2_BUCKET}/${RELEASE_PREFIX}/SHA256SUMS" - --endpoint-url "$R2_ENDPOINT_URL" 2>/dev/null); then
             local_sums=$(cat "$BETA_DIR/SHA256SUMS")
             if [ "$existing_sums" != "$local_sums" ]; then
                echo "R2 checksum drift detected for v${BETA_VERSION}" >&2
                false
             fi
          fi

      - name: Publish immutable beta artifacts to R2
        if: env.PUBLISH_BETA == 'true'
        run: |''')

content = content.replace(
'''          gh release upload beta "$BETA_DIR"/* --clobber''',
'''          gh release upload beta "$BETA_DIR"/*''')

# In release context resolution, fix tag ref to be SHA
content = content.replace(
'''          elif [ "$REF_TYPE" = tag ]; then
            production_version="${REF_NAME#v}"
            build_ref="$REF_NAME"''',
'''          elif [ "$REF_TYPE" = tag ]; then
            production_version="${REF_NAME#v}"
            build_ref="$GITHUB_SHA_VALUE"''')

with open(".github/workflows/build-binaries.yml", "w") as f:
    f.write(content)
