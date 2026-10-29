.PHONY: all build clean

DEPLOYMENT_ENVIRONMENT ?= all

all: build

build:
	npm --prefix .. run build -- --deployment-environment "$(DEPLOYMENT_ENVIRONMENT)"

clean:
	rm -rf ../app
