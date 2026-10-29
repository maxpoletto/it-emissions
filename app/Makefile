.PHONY: all build clean

DEPLOYMENT_ENVIRONMENT ?= uzh

all: build
ifeq ($(DEPLOYMENT_ENVIRONMENT),uzh)
all: index.html
endif

build:
	npm --prefix .. run build -- --deployment-environment "$(DEPLOYMENT_ENVIRONMENT)"

index.html:
	ln -sf emissions-calculator.html index.html

clean:
	rm -f index.html
