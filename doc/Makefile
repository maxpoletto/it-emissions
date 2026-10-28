TEXFILES=paper.tex it-emissions.tex
PDFS=$(TEXFILES:.tex=.pdf)
FIGURES=fig-baseline.png fig-cloud.png fig-llm-growth.png fig-sens1.png fig-sens2.png fig-agentic-ai.png
MODEL_SOURCES=$(wildcard ../src/*.js) $(wildcard ../scripts/*.js) ../package-lock.json
PAPER_DEPS=supplement-parameters.tex model-results.tex

all: $(PDFS)

paper.pdf: $(FIGURES) $(PAPER_DEPS)

$(FIGURES): fig-%.png: scenarios/%.json scenarios/baseline.json $(MODEL_SOURCES)
	@node ../scripts/paper-figures.js --figure $*

fig-agentic-ai.png: scenarios/cloud.json scenarios/lifecycle-before.json scenarios/lifecycle-after.json

model-results.tex: $(wildcard scenarios/*.json) $(MODEL_SOURCES)
	@node ../scripts/paper-results.js

%.pdf: %.tex ref.bib
	@latexmk -pdf -interaction=nonstopmode -halt-on-error $<

clean:
	rm -f *.aux *.bbl *.bcf *.blg *.dvi *.fdb_latexmk *.fls *.log *.out *.ps *.run.xml *.synctex.gz *.toc
