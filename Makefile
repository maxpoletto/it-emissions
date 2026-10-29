.PHONY: all app docs clean

all: app docs

app:
	$(MAKE) -C src all

docs:
	$(MAKE) -C doc all

clean:
	$(MAKE) -C src clean
	$(MAKE) -C doc clean
