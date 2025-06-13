DOC=it-emissions

.PHONY: all app clean

all: $(DOC).pdf app

app:
	make -C app all

clean:
	make -C app clean
	make -C doc clean

$(DOC).pdf: $(DOC).tex ref.bib
	@pdflatex $(DOC).tex
	@biber $(DOC)
	@pdflatex $(DOC).tex
	@pdflatex $(DOC).tex
