all: doc.pdf

clean:
	rm -f *.aux *.bbl *.bcf *.blg *.dvi *.fdb_latexmk *.fls *.log *.out *.ps *.run.xml *.synctex.gz *.toc

doc.pdf: doc.tex ref.bib
	@pdflatex doc.tex
	@biber doc
	@pdflatex doc.tex
	@pdflatex doc.tex
