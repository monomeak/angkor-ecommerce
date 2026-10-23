# The base image has no Khmer glyphs: Khmer product titles render as empty boxes, which
# reads as a template bug. The base is Alpine and already runs as root.
FROM jsreport/jsreport:4.10.0
RUN apk add --no-cache font-noto font-noto-khmer
