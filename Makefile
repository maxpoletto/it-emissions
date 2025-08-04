.PHONY: all app docs clean

all: app docs

app:
	make -C app all

docs:
	make -C doc all

clean:
	make -C app clean
	make -C doc clean
