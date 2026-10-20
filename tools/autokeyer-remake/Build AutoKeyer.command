#!/bin/sh
cd "$(dirname "$0")" || exit 1
sh ./build.sh
result=$?
printf '\nPress Return to close this window.'
read -r _
exit "$result"
