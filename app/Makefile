.PHONY: all build index.html clean

DEPLOYMENT_ENVIRONMENT ?= uzh

CALCULATOR_HTML = emissions-calculator.html
ifeq ($(DEPLOYMENT_ENVIRONMENT),maxp)
CALCULATOR_HTML = ../output/maxp/emissions-calculator.html
endif

all: index.html

build:
	npm --prefix .. run build -- --deployment-environment "$(DEPLOYMENT_ENVIRONMENT)"

index.html: build
	ln -sfn "$(CALCULATOR_HTML)" "$@"

clean:
	rm -f index.html
