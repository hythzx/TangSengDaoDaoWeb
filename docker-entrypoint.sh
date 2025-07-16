#!/usr/bin/env sh

set -eu

envsubst '${API_URL} ${IM_WS_URL}' < /nginx.conf.template > /etc/nginx/conf.d/default.conf


exec "$@"