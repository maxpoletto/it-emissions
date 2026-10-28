.PHONY: all build clean

all: build index.html

build:
	npm --prefix .. run build

index.html:
	ln -sf emissions-calculator.html index.html

clean:
	rm -f index.html
