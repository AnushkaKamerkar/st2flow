# Copyright (C) 2020 Extreme Networks, Inc - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential

COMPONENT := $(notdir $(CURDIR))
PKG_RELEASE ?= 1
PKG_VERSION ?= $(shell node -e "console.log(require('./package.json').st2_version)")
PREFIX ?= /opt/coditation/static/webui/flow
CHANGELOG_COMMENT ?= "automated build, version: $(PKG_VERSION)"
#DEB_EPOCH := $(shell echo $(PKG_VERSION) | grep -q dev || echo '1')
DEB_DISTRO := $(shell (echo $(PKG_VERSION) | grep -q dev) && echo unstable || echo stable)

.PHONY: all build clean install deb rpm
all: build

build:
	node_modules/.bin/gulp production

clean:
	rm -Rf build/
	mkdir -p build/

install:
	mkdir -p $(DESTDIR)$(PREFIX)
	cp -R $(CURDIR)/build/* $(DESTDIR)$(PREFIX)

deb:
	# Stable versions use epoch, for example 1:1.3.1-3, this made to distinguish
	# them form dev versions (which use no epoch).
	[ -z "$(DEB_EPOCH)" ] && _epoch="" || _epoch="$(DEB_EPOCH):"; \
		dch -m --force-distribution -v$${_epoch}$(PKG_VERSION)-$(PKG_RELEASE) -D$(DEB_DISTRO) $(CHANGELOG_COMMENT)
	dpkg-buildpackage -b -uc -us

rpm:
	rpmbuild -bb rpm/st2flow.spec
