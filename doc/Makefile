TEXFILES=paper.tex it-emissions.tex
PDFS=$(TEXFILES:.tex=.pdf)
FIGURE_GENERATOR=generate-paper-figures.py
FIGURES=fig-baseline.png fig-cloud.png fig-llm-growth.png fig-sens1.png fig-sens2.png fig-agentic-ai.png
PAPER_DEPS=supplement-parameters.tex

all: $(PDFS)

paper.pdf: $(FIGURES) $(PAPER_DEPS)

$(FIGURES) &: $(FIGURE_GENERATOR)
	@python3 $(FIGURE_GENERATOR)

%.pdf: %.tex ref.bib
	@pdflatex $<
	@biber $(basename $<)
	@pdflatex $<
	@pdflatex $<

clean:
	rm -f *.aux *.bbl *.bcf *.blg *.dvi *.fdb_latexmk *.fls *.log *.out *.ps *.run.xml *.synctex.gz *.toc
