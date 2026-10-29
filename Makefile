.PHONY: all app doc clean

all: app doc

app:
	$(MAKE) -C src all

doc:
	$(MAKE) -C doc all

clean:
	$(MAKE) -C src clean
	$(MAKE) -C doc clean
