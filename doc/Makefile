TEXFILES=$(wildcard *.tex)
PDFS=$(TEXFILES:.tex=.pdf)

all: $(PDFS)

%.pdf: %.tex ref.bib
	@pdflatex $<
	@biber $(basename $<)
	@pdflatex $<
	@pdflatex $<

clean:
	rm -f *.aux *.bbl *.bcf *.blg *.dvi *.fdb_latexmk *.fls *.log *.out *.ps *.run.xml *.synctex.gz *.toc
