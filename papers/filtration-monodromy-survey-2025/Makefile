TEX = main.tex
PDF = main.pdf

.PHONY: all clean

all: $(PDF)

$(PDF): $(TEX)
	xelatex -interaction=nonstopmode $(TEX)
	xelatex -interaction=nonstopmode $(TEX)

clean:
	rm -f main.aux main.log main.out main.toc
