DOC=it-emissions
all: $(DOC).pdf

clean:
	rm -f *.aux *.bbl *.bcf *.blg *.dvi *.fdb_latexmk *.fls *.log *.out *.ps *.run.xml *.synctex.gz *.toc

$(DOC).pdf: $(DOC).tex ref.bib
	@pdflatex $(DOC).tex
	@biber $(DOC)
	@pdflatex $(DOC).tex
	@pdflatex $(DOC).tex
