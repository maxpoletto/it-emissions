TEXFILES=paper.tex it-emissions.tex
PDFS=$(TEXFILES:.tex=.pdf)
FIGURE_GENERATOR=generate-paper-figures.py
FIGURES=fig-baseline.png fig-cloud.png fig-llm-growth.png fig-sens1.png fig-sens2.png fig-agentic-ai.png
JS_FIGURES=fig-baseline.png fig-cloud.png fig-llm-growth.png fig-sens1.png fig-sens2.png
MODEL_SOURCES=$(wildcard ../src/*.js) ../scripts/paper-figures.js ../scripts/render.js ../package-lock.json
PAPER_DEPS=supplement-parameters.tex

all: $(PDFS)

paper.pdf: $(FIGURES) $(PAPER_DEPS)

$(filter-out $(JS_FIGURES),$(FIGURES)) &: $(FIGURE_GENERATOR)
	@mkdir -p ../output/legacy-figures
	@python3 $(FIGURE_GENERATOR) --output-dir ../output/legacy-figures
	@cp $(addprefix ../output/legacy-figures/,$(filter-out $(JS_FIGURES),$(FIGURES))) .

$(JS_FIGURES): fig-%.png: scenarios/%.json scenarios/baseline.json $(MODEL_SOURCES)
	@node ../scripts/paper-figures.js --figure $*

%.pdf: %.tex ref.bib
	@latexmk -pdf -interaction=nonstopmode -halt-on-error $<

clean:
	rm -f *.aux *.bbl *.bcf *.blg *.dvi *.fdb_latexmk *.fls *.log *.out *.ps *.run.xml *.synctex.gz *.toc
